/* Corre el banco de pruebas de las flores y convierte lo que devuelve el
   navegador en un informe legible. El navegador es el único que sabe medir de
   verdad un viewport de 320px, porque Edge headless no baja de 481px.

   La regla del diseño nuevo es que las flores son decoración que se mueve con
   la página (nada de position:fixed), y que ninguna letra tiene su CENTRO
   dentro del recto de una flor: la banda del borde de las tarjetas navy o las
   gemas del adorno de la portada. Ese número tiene que ser cero. También
   falla si hay scroll horizontal.

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
   index.html viejo y las mediciones miden el diseño anterior. */
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

  const bandas = r.flores > 0 && r.fijas.indexOf('flor-banda') < 0;
  const gemas = r.flores > 0 && r.fijas.indexOf('ornamento__gema') < 0;

  const problemasFlor = [];
  if (r.flores === 0) problemasFlor.push('no hay .flor-banda ni .ornamento__gema');
  if (r.fijas.length) problemasFlor.push('flores fijas a la pantalla: ' + r.fijas.join(', '));
  if (r.flores === 0 || r.fijas.length) problemas++;

  const bajo = r.bajoFlor;

  console.log(etiqueta + '  [' + r.floresVisibles + ' de ' + r.flores + ' flores en pantalla]' +
    (bandas && gemas ? ' flores presentes y m\u00f3viles' : '  *** ' + problemasFlor.join('; ') + ' ***') +
    '  |  ' + bajo.length + ' de ' + r.visibles + ' textos visibles con el centro sobre una flor' +
    (r.scrollHorizontal ? '  *** SCROLL HORIZONTAL ***' : ''));

  if (bajo.length) {
    problemas++;
    for (const b of bajo) {
      console.log('      - ' + b.nodo + ' (bajo ' + b.flor + ')  caja ' + JSON.stringify(b.caja));
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
  console.log('*** Problemas (' + problemas + '): faltan flores, alguna está fija,' +
    ' un texto queda con su centro sobre una flor, o hay scroll horizontal ***');
  process.exit(1);
}

console.log('Las flores existen, se mueven con la página y ninguna letra tiene su centro' +
  ' sobre una flor, en ningún tamaño ni extremo de scroll.');
process.exit(0);