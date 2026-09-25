/* Prueba la lógica de la cuenta regresiva con el reloj simulado.
   No toca red ni Spreadsheet: corre:  node tools/probar-cuenta.js  */

const fs = require('fs');
const path = require('path');
const vm = require('vm');

/* -------------------------------------------- DOM mínimo para correr app.js */

function crearElemento(etiqueta) {
  return {
    tagName: etiqueta, className: '', style: {}, textContent: '',
    children: [], dataset: {}, attrs: {},
    classList: {
      _c: new Set(),
      add(...n) { n.forEach(x => this._c.add(x)); },
      remove(...n) { n.forEach(x => this._c.delete(x)); },
      contains(n) { return this._c.has(n); },
      toggle(n, f) { f ? this._c.add(n) : this._c.delete(n); }
    },
    appendChild(n) { this.children.push(n); return n; },
    setAttribute(k, v) { this.attrs[k] = v; },
    addEventListener() {},
    querySelector() { return null; },
    querySelectorAll() { return []; },
    get href() { return this.attrs.href || ''; },
    set href(v) { this.attrs.href = v; },
    get download() { return this.attrs.download || ''; },
    set download(v) { this.attrs.download = v; },
    click() {}
  };
}

const cuenta = crearElemento('div');
/* app.js busca con querySelector, no con querySelectorAll. */
const raiz = {
  readyState: 'complete',
  querySelector: (s) => (s === '[data-cuenta]' ? cuenta : null),
  querySelectorAll: () => [],
  createElement: crearElemento,
  body: crearElemento('body'),
  addEventListener() {}
};

/* ------------------------------------------------------------- caso de uso */

let turno = 0;
const CASOS = [
  { nombre: 'la boda es dentro de 27 días',
    ahora: '2026-09-25T10:00:00-07:00',
    inicio: '2026-10-22T11:00:00-07:00',
    espera: ['días', '27'] },

  { nombre: 'faltan 3 horas',
    ahora: '2026-10-22T08:00:00-07:00',
    inicio: '2026-10-22T11:00:00-07:00',
    espera: ['horas', '3'] },

  { nombre: 'hoy a las 11 y son las 15',
    ahora: '2026-10-22T15:00:00-07:00',
    inicio: '2026-10-22T11:00:00-07:00',
    espera: ['ceremonia ya empezó'] },

  { nombre: 'la boda ya pasó (febrero 2027)',
    ahora: '2027-02-01T09:00:00-07:00',
    inicio: '2026-10-22T11:00:00-07:00',
    espera: ['Gracias por acompañarnos'] },

  { nombre: 'la fecha está mal escrita',
    ahora: '2026-09-25T10:00:00-07:00',
    inicio: 'no es una fecha',
    espera: [] }
];

let fallos = 0, total = 0;
function igual(etiqueta, obtenido, esperado) {
  total++;
  if (obtenido !== esperado) {
    fallos++;
    console.log('  FALLA  ' + etiqueta + '\n         esperado: ' + esperado + '\n         obtenido: ' + obtenido);
  } else console.log('  ok     ' + etiqueta);
}

const APP = path.join(__dirname, '..', 'assets', 'js', 'app.js');
const fuente = fs.readFileSync(APP, 'utf8');

CASOS.forEach((caso) => {
  console.log('\n' + caso.nombre);
  cuenta.children.length = 0;
  cuenta.classList._c.clear();
  cuenta.textContent = '';
  cuenta.attrs.style = {};

  const Reloj = new Date(caso.ahora);
  const realDate = Date;
  turno++;

  /* Subclase de verdad: si no, "new Date()" devolvería un número y después
     getFullYear() explotaría. */
  class FechaFalsa extends realDate {
    constructor(...args) {
      if (args.length === 0) super(Reloj.getTime());
      else super(...args);
    }
    static now() { return Reloj.getTime(); }
  }

  vm.runInNewContext(fuente, {
    window: { CONFIG: { boda: { inicio: caso.inicio, fin: caso.inicio } } },
    document: raiz,
    Date: FechaFalsa,
    setTimeout() {}, setInterval() {}, clearInterval() {},
    console, navigator: { clipboard: null }
  }, { filename: APP });

  const texto = cuenta.textContent +
    ' ' + cuenta.children.map(c => c.textContent + ' ' +
      (c.children || []).map(g => g.textContent).join(' ')).join(' ');

  if (process.env.MOSTRAR) {
    console.log('  [debug] style.display=' + cuenta.style.display +
      ' classes=' + JSON.stringify([...cuenta.classList._c]));
    console.log('  [debug] "' + texto.trim() + '"');
  }

  caso.espera.forEach((esperado) => {
    igual('dice "' + esperado + '"', texto.indexOf(esperado) !== -1, true);
  });

  /* Un número que imprima "undefined" es un bug silencioso: la caja se ve bien
     en el screenshot y no dice nada útil. */
  igual('ningún número sale como undefined', /undefined|NaN/.test(texto), false);
});

/* Con la fecha inválida no hay nada que mostrar, y el bloque se oculta entero
   para no dejar un hueco vacío. */
{
  console.log('\ncon la fecha rota el bloque se oculta');
  cuenta.children.length = 0;
  cuenta.classList._c.clear();
  cuenta.textContent = '';
  cuenta.style = {};
  const Reloj = new Date('2026-09-25T10:00:00-07:00');
  class FechaRota extends Date {
    constructor(...a) { if (a.length === 0) super(Reloj.getTime()); else super(...a); }
    static now() { return Reloj.getTime(); }
  }
  vm.runInNewContext(fuente, {
    window: { CONFIG: { boda: { inicio: 'no es una fecha', fin: 'no es una fecha' } } },
    document: raiz, Date: FechaRota,
    setTimeout() {}, setInterval() {}, clearInterval() {},
    console, navigator: { clipboard: null }
  }, { filename: APP });
  igual('display:none', cuenta.style.display, 'none');
  igual('y no escribió nada', cuenta.children.length + cuenta.textContent.length, 0);
}

console.log('\n' + (fallos
  ? '*** ' + fallos + ' FALLIDAS de ' + total
  : 'Las ' + total + ' pruebas pasaron.'));
process.exit(fallos ? 1 : 0);
