/* Corre el banco de links de invitación y convierte lo que devuelve el
   navegador en un informe legible.

   Qué comprueba, y por qué hace falta:
     - que el link de CADA invitación abra la tarjeta de ESE grupo, con los
       nombres de sus miembros;
     - que un código que nadie tiene caiga en el buscador, y también una
       entrada sin código;
     - que los nombres salgan con sus tildes, comparándolos contra
       data/invitados.js en vez de contra una copia escrita a mano.

   El banco de móvil usaba siempre el primer código de la lista, así que un
   link roto en alguna de las otras invitaciones pasaba desapercibido. Eso es
   justamente lo que pasó: un invitado abriría su link y le aparecería el
   buscador.

   Uso:  node tools/probar-links.js
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

const perfil = path.join(os.tmpdir(), 'boda-pruebas-links');
fs.rmSync(perfil, { recursive: true, force: true });

let dom;
try {
  dom = execFileSync(EDGE, [
    '--headless=new', '--disable-gpu', '--no-sandbox',
    '--user-data-dir=' + perfil,
    '--virtual-time-budget=60000',
    '--window-size=1200,2000',
    '--dump-dom',
    'http://localhost:' + PUERTO + '/tools/banco-links.html?t=' + Date.now()
  ], { encoding: 'utf8', maxBuffer: 128 * 1024 * 1024, stdio: ['ignore', 'pipe', 'ignore'] });
} catch (e) {
  console.log('No se pudo abrir el navegador: ' + e.message);
  process.exit(2);
}

const m = /RESULTADO_JSON([\s\S]*?)FIN_JSON/.exec(dom);
if (!m) {
  console.log('El navegador no devolvió mediciones.');
  console.log('¿Está el servidor local arriba?  python -m http.server 8000');
  process.exit(2);
}

let casos;
try {
  casos = JSON.parse(m[1]);
} catch (e) {
  console.log('Las mediciones llegaron pero no se pudieron leer: ' + e.message);
  process.exit(2);
}

let fallos = 0;

/* Los dos casos sin invitación válida (sin código, y uno inventado) NO pueden
   treatment normal: ahí lo correcto es que caigan en el buscador. Se cuentan
   aparte, y se sacan del recorrido normal para no reportar dos veces lo mismo
   como falla y como acierto. */
const esFalso = c => c.codigo === '(sin código)' || c.codigo === 'ZZ99';
const reales = casos.filter(c => !esFalso(c));
const falsos = casos.filter(esFalso);

console.log('Cada link de invitación, uno por uno\n');
reales.forEach(c => {
  const problemas = [];
  if (!c.tarjeta) problemas.push('no pintó la tarjeta');
  if (c.buscador) problemas.push('pintó el buscador');
  if (c.grupo === false) problemas.push('no salió el nombre del grupo');
  if (c.faltan && c.faltan.length) {
    problemas.push('faltan ' + c.faltan.map(n => '"' + n + '"').join(', '));
  }

  if (problemas.length) {
    fallos++;
    console.log('  FALLA  ' + c.codigo + ': ' + problemas.join('; '));
    /* Lo que se veía y de dónde se leyó, para poder leer el fallo sin tener que
       volver a abrir el navegador a mano. */
    if (c.visto) console.log('           se veía: "' + c.visto + '"');
    if (c.deDonde) console.log('           leído de: ' + c.deDonde);
  } else {
    console.log('  ok     ' + c.codigo);
  }
});

/* Y al revés: un link que no existe tiene que dar el buscador. Si un link
   bueno cayera ahí, el invitado tendría que buscarse a sí mismo a mano. */
console.log('');
falsos.forEach(c => {
  if (c.buscador) {
    console.log('  ok     ' + c.codigo + ': cae en el buscador, como debe');
  } else {
    fallos++;
    console.log('  FALLA  ' + c.codigo + ': debería haber caído en el buscador');
  }
});

console.log('');
console.log(fallos
  ? '*** ' + fallos + ' problema(s) en los links de invitación'
  : 'Los ' + reales.length + ' links de invitación abren bien, y los ' +
    falsos.length + ' que no existen caen en el buscador.');
process.exit(fallos ? 1 : 0);
