/* Corre el banco de pruebas del marco y convierte lo que devuelve el navegador
   en un informe legible. El navegador es el único que sabe medir de verdad un
   viewport de 320px, porque Edge headless no baja de 481px.

   La guirnalda de fondo.png es fija a la pantalla y el usuario pidió que se
   vea siempre aunque la página ruede. Eso significa que la guirnalda cruza
   texto; no es un fallo, es el diseño pedido. Así que este runner ya no sale
   con error por texto bajo un pétalo: ADVIERTE cuánto texto queda cubierto
   (para verlo, no para ignorarlo) y sólo falla si el marco no está fijo o no
   cubre el viewport entero, o si hay scroll horizontal.

   Uso:  node tools/probar-marco.js
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

const perfil = path.join(os.tmpdir(), 'boda-pruebas-marco');

/* El perfil se borra antes de empezar: si no, el navegador sirve un
   index.html viejo y las mediciones miden el marco anterior. */
fs.rmSync(perfil, { recursive: true, force: true });

const args = [
  '--headless=new', '--disable-gpu', '--no-sandbox',
  '--user-data-dir=' + perfil,
  '--virtual-time-budget=40000',
  '--window-size=1500,4200',
  '--dump-dom',
  'http://localhost:' + PUERTO + '/tools/banco-marco.html?t=' + Date.now()
];

let dom;
try {
  dom = execFileSync(EDGE, args, {
    encoding: 'utf8',
    maxBuffer: 64 * 1024 * 1024,
    stdio: ['ignore', 'pipe', 'ignore']
  });
} catch (e) {
  console.log('No pude correr el navegador. ¿Está el servidor en el puerto ' + PUERTO + '?');
  console.log(String(e.message).slice(0, 300));
  process.exit(2);
}

const m = dom.match(/RESULTADO_JSON([\s\S]*?)FIN_JSON/);
if (!m) {
  console.log('El navegador no devolvió resultado. ¿Está el servidor en el puerto ' + PUERTO + '?');
  process.exit(2);
}

const resultados = JSON.parse(m[1].replace(/&quot;/g, '"').replace(/&amp;/g, '&'));

let problemas = 0;
let scrollHorizontal = 0;

console.log('tamaños probados: ' + [...new Set(resultados.map(r => r.tam + ' (' + r.nombre + ')'))].join(', '));
console.log('');

for (const r of resultados) {
  const pos = r.scrollY === 0 ? 'arriba' : 'abajo';
  const etiqueta = r.tam + ' ' + pos + ' (scrollY ' + r.scrollY + ', doc ' + r.docAltura + ')';

  const v = r.ventana;

  /* La guirnalda de .ventana no cubre el viewport en pantallas anchas: desde
     30rem la invitación vive en una columna de ancho de teléfono (26rem, 416px)
     centrada en el navegador, y la guirnalda está clavada a esa columna. Lo
     importante es que el CENTRO de la guirnalda coincida con el centro de la
     columna (el body), y que el ancho sea el de la columna; el cuerpo y la
     ventana se centran sobre el ancho útil, que en un viewport con scrollbar
     clásico es unos 7px menos que el ancho del viewport. En un celular (menos
     de 480px de ancho) la columna es toda la pantalla. */
  const w = parseInt(r.tam.split('x')[0], 10);
  const h = parseInt(r.tam.split('x')[1], 10);

  const cubre = v && v.posicion === 'fixed' && (
    w < 480
      ? v.y === 0 && Math.abs(v.x) <= 1 &&
        Math.abs(v.w - w) <= 1 && Math.abs(v.h - h) <= 1
      : r.columnaCx !== null &&
        Math.abs((v.x + v.w / 2) - r.columnaCx) <= 2 &&
        Math.abs(v.w - 416) <= 1 && v.y === 0 && Math.abs(v.h - h) <= 1
  );

  const estadoMarco = cubre
    ? (w < 480
        ? 'fija, cubre el viewport [' + v.x + ',' + v.y + ' ' + v.w + 'x' + v.h + ']'
        : 'fija, clavada a la columna (centro ' + Math.round(v.x + v.w / 2) + ' ≈ ' + r.columnaCx + ') [' + v.x + ',' + v.y + ' ' + v.w + 'x' + v.h + ']')
    : '*** NO cuadra (revisar .ventana): ' + JSON.stringify(v) + ' columnaCx=' + r.columnaCx + ' ***';
  if (!(v && v.posicion === 'fixed' && cubre)) problemas++;

  const bajo = r.bajoLaGuirnalda;

  console.log(etiqueta + '  ' + estadoMarco + '  |  ' +
    bajo + ' de ' + r.visibles + ' textos visibles con el centro sobre un pétalo' +
    (r.scrollHorizontal ? '  *** SCROLL HORIZONTAL ***' : ''));

  if (bajo) {
    for (const b of r.bajo) {
      console.log('      - ' + b.nodo + '  caja ' + JSON.stringify(b.caja));
    }
  }

  if (r.scrollHorizontal) scrollHorizontal++;
}

console.log('');
if (scrollHorizontal) {
  console.log('*** ' + scrollHorizontal + ' de los recorridos tienen scroll horizontal ***');
  problemas++;
}

if (problemas) {
  console.log('*** Problemas (' + problemas + '): el marco no cuadra con la columna o hay scroll horizontal ***');
  process.exit(1);
}

console.log('La guirnalda queda clavada a la columna de la invitación (el viewport entero en' +
  ' celular, la columna de teléfono en pantallas anchas) y no se recorta nunca. Los textos' +
  ' bajo un pétalo son el diseño pedido (fondo.png estática siempre en pantalla).');
process.exit(0);