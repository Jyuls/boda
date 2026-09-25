/* Corre el banco de pruebas de móvil y convierte lo que devuelve el navegador
   en un informe legible. El navegador es el único que sabe medir de verdad
   un viewport de 320px, porque Edge headless no baja de 481px.

   Se prueba cada estado por separado (la tarjeta con los Sí/No, el buscador y
   la confirmación), aunque el banco los pueda medir juntos: si no, con quince
   iframes a la vez el navegador se queda sin tiempo y midiendo pantallas en
   blanco, que es la forma más silenciosa de no estar probando nada.

   Uso:  node tools/probar-movil.js [estado]
   (necesita el servidor local: python -m http.server 8000)  */

const { execFileSync } = require('child_process');
const fs = require('fs');
const os = require('os');
const path = require('path');

const EDGE = 'C:\\Program Files (x86)\\Microsoft\\Edge\\Application\\msedge.exe';
const PUERTO = process.env.PUERTO || '8000';

if (!fs.existsSync(EDGE)) {
  console.log('No encontré Edge en:\n  ' + EDGE);
  process.exit(2);
}

const ESTADOS = ['rsvp', 'buscador', 'confirmacion'];
const soloEstado = process.argv[2];
const aProbar = soloEstado ? ESTADOS.filter(e => e === soloEstado) : ESTADOS;

if (!aProbar.length) {
  console.log('Estado desconocido. Usa uno de: ' + ESTADOS.join(', '));
  process.exit(2);
}

const perfil = path.join(os.tmpdir(), 'boda-pruebas-movil');

/* El perfil se borra antes de empezar. El "&t=" de más abajo sólo invalida el
   HTML de la página de pruebas, no los <script> y los <link> que pide la
   invitación que va dentro del iframe: con el perfil guardado, el navegador
   servía un rsvp.js viejo y las mediciones mobile no correspondían al código
   de esta corrida. */
fs.rmSync(perfil, { recursive: true, force: true });

function correr(estado) {
  const args = [
    '--headless=new', '--disable-gpu', '--no-sandbox',
    '--user-data-dir=' + perfil,
    '--virtual-time-budget=15000',
    '--window-size=1400,2400',
    '--dump-dom',
    'http://localhost:' + PUERTO + '/tools/banco-movil.html?estado=' + estado +
    /* El perfil del navegador se reutiliza entre corridas y su caché guarda
       el banco. Sin esto, editar banco-movil.html y volver a correr la prueba
       puede medir la versión vieja del archivo y fallar por un motivo que ya
       se arregló. */
    '&t=' + Date.now()
  ];

  const dom = execFileSync(EDGE, args, {
    /* utf8 y no latin1: el DOM trae acentos ("Sí", "confirmación") y con
       latin1 llegan movidos al informe. */
    encoding: 'utf8',
    maxBuffer: 64 * 1024 * 1024,
    stdio: ['ignore', 'pipe', 'ignore']
  });

  const m = dom.match(/RESULTADO_JSON([\s\S]*?)FIN_JSON/);
  if (!m) return null;
  return JSON.parse(m[1].replace(/&quot;/g, '"').replace(/&amp;/g, '&'));
}

let casos = [];
for (const estado of aProbar) {
  let r;
  try {
    r = correr(estado);
  } catch (e) {
    console.log('No pude correr el navegador. ¿Está el servidor en el puerto ' + PUERTO + '?');
    console.log(String(e.message).slice(0, 300));
    process.exit(2);
  }
  if (!r) {
    console.log('El navegador no devolvió mediciones del estado "' + estado + '".');
    console.log('Revisá que el servidor esté en el puerto ' + PUERTO + ' y que banco-movil.html exista.');
    process.exit(2);
  }
  casos = casos.concat(r);
}

let fallos = 0;
let estadoAnterior = null;

for (const c of casos) {
  if (c.error) {
    console.log('\n' + c.nombre + ' -> ERROR ' + c.error);
    fallos++;
    continue;
  }

  if (c.estado !== estadoAnterior) {
    estadoAnterior = c.estado;
    console.log('\n=== ' + estadoAnterior + ' ===');
  }

  console.log('\n' + c.nombre);

  /* Lo primero: confirmar que se midió la pantalla que se iba a medir. Si el
     clic a "enviar" no hubiera tomado efecto, el banco estaría reportando
     "ok" sobre la tarjeta de siempre y la confirmación nunca se habría
     probado. */
  if (c.vistaReal && c.vistaReal !== c.estado) {
    fallos++;
    console.log('  FALLA  se midió la pantalla "' + c.vistaReal + '" en vez de "' + c.estado + '"');
    console.log('         (el banco no está probando lo que dice; esto es una falla del test)');
    console.log('         .opcion en el marco: ' + c.opciones +
      ' | boda.respuestas: ' + (c.almacen || '(vacío)'));
  } else {
    console.log('  ok     es la pantalla de ' + c.estado);
  }

  console.log('  cuerpo de texto: ' + c.cuerpoPx);

  if (c.scrollHorizontal) {
    fallos++;
    console.log('  FALLA  hay scroll horizontal (' + c.scrollWidth + ' > ' + c.clientWidth + ')');
  } else {
    console.log('  ok     sin scroll horizontal');
  }

  if (c.desborde.length) {
    fallos++;
    console.log('  FALLA  ' + c.desborde.length + ' elemento(s) fuera de la pantalla:');
    c.desborde.slice(0, 6).forEach(d => {
      console.log('           ' + d.etiqueta + '  de ' + d.izquierda + ' a ' + d.derecha);
    });
  } else {
    console.log('  ok     nada se sale de la pantalla');
  }

  if (c.tactilesChicos.length) {
    fallos++;
    console.log('  FALLA  ' + c.tactilesChicos.length + ' área(s) tocable(s) menor(s) de 44px:');
    c.tactilesChicos.slice(0, 8).forEach(t => {
      console.log('           ' + t.ancho + 'x' + t.alto + '  ' + t.etiqueta);
    });
  } else {
    console.log('  ok     todas las áreas tocables llegan a 44px');
  }
}

console.log('\n' + (fallos
  ? '*** ' + fallos + ' problema(s) de móvil'
  : 'Ningún problema de móvil en los ' + aProbar.length + ' estado(s) y los anchos probados.'));

process.exit(fallos ? 1 : 0);
