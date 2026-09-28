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
  const cubre = v &&
    Math.abs(v.x) <= 1 && Math.abs(v.y) <= 1 &&
    Math.abs(v.w - parseInt(r.tam.split('x')[0], 10)) <= 1 &&
    Math.abs(v.h - parseInt(r.tam.split('x')[1], 10)) <= 1;

  const estadoMarco = v && v.posicion === 'fixed' && cubre
    ? 'fija y cubre el viewport [' + v.x + ',' + v.y + ' ' + v.w + 'x' + v.h + ']'
    : '*** NO cubre el viewport o no es fixed (revisar .ventana): ' + JSON.stringify(v) + ' ***';
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
  console.log('*** Problemas (' + problemas + '): el marco no cubre la pantalla o hay scroll horizontal ***');
  process.exit(1);
}

console.log('La guirnalda está fija y abraza el viewport en todos los tamaños. Los textos bajo' +
  ' un pétalo son el diseño pedido (fondo.png estática siempre en pantalla).');
process.exit(0);