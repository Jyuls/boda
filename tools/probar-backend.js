/* Arnés de pruebas: simula SpreadsheetApp en memoria para ejercitar Code.gs
   fuera de Google. Corre:  node tools/probar-backend.js
   No forma parte del sitio publicado, sólo sirve para verificar. */

const fs = require('fs');
const path = require('path');
const vm = require('vm');

/* ------------------------------------------------------------------ mock */

class Rango {
  constructor(hoja, fila, col, filas, cols) {
    if (filas < 1 || cols < 1) {
      throw new Error('getRange con dimensiones <= 0: ' + fila + ',' + col + ',' + filas + ',' + cols);
    }
    Object.assign(this, { h: hoja, f: fila, c: col, nf: filas, nc: cols });
  }
  getValues() {
    const out = [];
    for (let r = 0; r < this.nf; r++) {
      const fila = [];
      for (let c = 0; c < this.nc; c++) fila.push(this.h.dato(this.f + r, this.c + c));
      out.push(fila);
    }
    return out;
  }
  setValues(vals) {
    if (vals.length !== this.nf) {
      throw new Error('setValues: esperaba ' + this.nf + ' filas, llegó ' + vals.length);
    }
    /* Google Sheets también exige que cada fila tenga exactamente el mismo
       número de columnas que el rango, y avisa con "The number of columns in
       the data does not match the number of columns in the range". Este mock
       miraba sólo el número de filas, así que verResumen() escribía filas
       de 1, 2 y 4 columnas en un rango de 7, las 59 pruebas pasaban y la
       hoja de verdad se rompía. */
    for (let r = 0; r < this.nf; r++) {
      if (!Array.isArray(vals[r]) || vals[r].length !== this.nc) {
        throw new Error('setValues fila ' + (r + 1) + ': el rango tiene ' + this.nc +
          ' columnas y la fila trae ' + (Array.isArray(vals[r]) ? vals[r].length : 'algo que no es una fila'));
      }
    }
    for (let r = 0; r < this.nf; r++) {
      for (let c = 0; c < this.nc; c++) this.h.escribe(this.f + r, this.c + c, vals[r][c]);
    }
    return this;
  }
  getValue() { return this.h.dato(this.f, this.c); }
  setValue(v) { this.h.escribe(this.f, this.c, v); return this; }
  clearContents() { this.h.d.clear(); return this; }
  clearContent() {
    for (let r = 0; r < this.nf; r++) {
      for (let c = 0; c < this.nc; c++) this.h.d.delete(this.h.clave(this.f + r, this.c + c));
    }
    return this;
  }
  getRow() { return this.f; }
  getColumn() { return this.c; }
  getNumRows() { return this.nf; }
  getNumColumns() { return this.nc; }
  getSheet() { return this.h; }
  getDataValidation() { return this.h.validaciones.has(this.h.clave(this.f, this.c)) ? true : null; }
  insertCheckboxes() {
    for (let r = 0; r < this.nf; r++) {
      this.h.validaciones.add(this.h.clave(this.f + r, this.c));
    }
    return this;
  }
}
['setBorder', 'setFontSize', 'setFontWeight', 'setFontColor', 'setVerticalAlignment',
 'setFontFamily', 'setColumnWidth', 'setFrozenRows', 'setWrapStrategy'
].forEach(m => { Rango.prototype[m] = function () { return this; }; });

class Hoja {
  constructor(nombre) { this.n = nombre; this.d = new Map(); this.validaciones = new Set(); }
  getName() { return this.n; }
  clave(f, c) { return f + ':' + c; }
  dato(f, c) { const v = this.d.get(this.clave(f, c)); return v === undefined ? '' : v; }
  escribe(f, c, v) { this.d.set(this.clave(f, c), v); }
  getRange(f, c, nf, nc) { return new Rango(this, f, c, nf || 1, nc || 1); }
  getLastRow() {
    let max = 0;
    for (const k of this.d.keys()) {
      const f = parseInt(k.split(':')[0], 10);
      if (f > max) max = f;
    }
    return max;
  }
  getLastColumn() {
    let max = 0;
    for (const k of this.d.keys()) {
      const c = parseInt(k.split(':')[1], 10);
      if (c > max) max = c;
    }
    return max;
  }
  setColumnWidth() { return this; }
  setFrozenRows() { return this; }
  clearContents() { this.d.clear(); return this; }
}

const hojas = {};
const UI = { alertas: [] };

global.SpreadsheetApp = {
  WrapStrategy: { CLIP: 'CLIP' },
  getActiveSpreadsheet: () => ({
    getSheetByName: (n) => hojas[n] || null,
    insertSheet: (n) => (hojas[n] = new Hoja(n)),
    setActiveSheet: () => {}
  }),
  getUi: () => ({
    alert: (m) => UI.alertas.push(m),
    createMenu: () => { const m = { addItem: () => m, addSeparator: () => m, addToUi: () => m }; return m; }
  })
};
global.ContentService = {
  MimeType: { JSON: 'application/json' },
  createTextOutput: (t) => ({ setMimeType: () => ({ getContent: () => t }) })
};
global.Utilities = {
  formatDate: (d, tz, fmt) => {
    const p = (n) => String(n).padStart(2, '0');
    const fecha = p(d.getDate()) + '/' + p(d.getMonth() + 1) + '/' + d.getFullYear();
    const hora = p(d.getHours()) + ':' + p(d.getMinutes());
    if (fmt === 'dd/MM/yyyy') return fecha;
    if (fmt === 'dd/MM/yyyy HH:mm') return fecha + ' ' + hora;
    return fecha + ' ' + hora;
  }
};

/* El .gs declara todo con "function", así que hay que evaluarlo en el contexto
   global: require() lo escondería dentro de un módulo. */
const GS = path.join(__dirname, '..', 'gas', 'Code.gs');
vm.runInThisContext(fs.readFileSync(GS, 'utf8'), { filename: GS });

/* ------------------------------------------------------------- aserciones */

let fallos = 0, total = 0;
function igual(etiqueta, obtenido, esperado) {
  total++;
  const a = JSON.stringify(obtenido), b = JSON.stringify(esperado);
  if (a !== b) {
    fallos++;
    console.log('  FALLA  ' + etiqueta);
    console.log('         esperado: ' + b);
    console.log('         obtenido: ' + a);
  } else console.log('  ok     ' + etiqueta);
}
function cierto(etiqueta, cond) { igual(etiqueta, !!cond, true); }
function seccion(t) { console.log('\n' + t); }

const codigos = () => hojas['Invitados'].getRange(2, 1, hojas['Invitados'].getLastRow() - 1, 1)
  .getValues().map(f => f[0]);
const filasInv = () => hojas['Invitados'].getRange(2, 1, hojas['Invitados'].getLastRow() - 1, 13).getValues();
const nFilasRes = () => Math.max(hojas['Respuestas'].getLastRow() - 1, 0);

hojas['Invitados'] = new Hoja('Invitados');
hojas['Invitados'].getRange(1, 1, 3, 9).setValues([
  ['codigo', 'grupo', 'miembros', 'esperados', 'max_acompanantes', 'notas', 'link', 'mensaje', 'contacto'],
  ['YZ32', 'Familia Sánchez', 'Ana Sánchez, Roberto Vega', 2, 2, 'Mesa cercana', 'https://viejo/#YZ32', 'Mensaje anterior', 'Ana'],
  ['AB01', 'Familia Vega', 'María Vega', 1, 2, '', '', '', '']
]);
hojas['Respuestas'] = new Hoja('Respuestas');
hojas['Respuestas'].getRange(1, 1, 2, 8).setValues([
  ['fecha', 'codigo', 'grupo', 'asistiran', 'no_asistiran', 'total', 'acompanantes', 'mensaje'],
  [new Date(2026, 9, 2, 10, 0), 'YZ32', 'Familia Sánchez', 'Ana Sánchez', 'Roberto Vega', 2, 'Invitado extra', 'Respuesta anterior']
]);

seccion('1. instalar migra sin perder los datos útiles');
instalar();
igual('esquema Invitados limpio', hojas['Invitados'].getRange(1, 1, 1, COL_INV.length).getValues()[0], COL_INV);
igual('esquema Respuestas limpio', hojas['Respuestas'].getRange(1, 1, 1, COL_RES.length).getValues()[0], COL_RES);
igual('conserva grupo y miembros', filasInv()[0].slice(0, 3), ['YZ32', 'Familia Sánchez', 'Ana Sánchez, Roberto Vega']);
igual('conserva las notas', filasInv()[0][3], 'Mesa cercana');
igual('conserva las columnas personalizadas', filasInv()[0][12], 'Ana');
cierto('retira las columnas de cupos y acompañantes',
  !COL_INV.join('|').match(/esperados|max_acompanantes|acompanantes/) &&
  !COL_RES.join('|').match(/acompanantes/));
igual('respuesta histórica conserva el sí', hojas['Respuestas'].getRange(2, 4).getValue(), 'Ana Sánchez');
igual('respuesta histórica conserva el no', hojas['Respuestas'].getRange(2, 5).getValue(), 'Roberto Vega');
igual('total histórico se recalcula sin acompañantes', hojas['Respuestas'].getRange(2, 6).getValue(), 1);
igual('conserva el mensaje histórico', hojas['Respuestas'].getRange(2, 7).getValue(), 'Respuesta anterior');
igual('no inserta ejemplos', filasInv().length, 2);
igual('conserva los códigos ya asignados', codigos(), ['YZ32', 'AB01']);

seccion('2. generar links y lista de la web');
hojas['Config'].getRange(2, 2).setValue('https://boda.github.io');
generarInvitados();
const tras = filasInv();
const codigoSanchez = tras[0][0];
igual('link personal conserva el código y deja el sobre cerrado',
  tras[0][4], 'https://boda.github.io/#' + codigoSanchez);
igual('el mensaje incluye el link', tras[0][5].indexOf(tras[0][4]) !== -1, true);
igual('el estado de respuesta histórica se sincroniza', tras[0][8], 'Respondida');
igual('integrantes que asisten se sincronizan', tras[0][9], 'Ana Sánchez');
igual('integrantes que no asisten se sincronizan', tras[0][10], 'Roberto Vega');

const gen = hojas['Generado'];
const js = gen.getRange(1, 1, gen.getLastRow(), 1).getValues().map(l => l[0]).join('\n');
cierto('declara window.INVITADOS y el JS es válido', js.indexOf('window.INVITADOS = [') !== -1);
new Function(js);
cierto('no genera maxAcompanantes', js.indexOf('maxAcompanantes') === -1);
const sandbox = { window: {} };
new Function('window', js)(sandbox.window);
igual('lista web conserva grupo y miembros',
  [sandbox.window.INVITADOS[0].grupo, sandbox.window.INVITADOS[0].miembros],
  ['Familia Sánchez', ['Ana Sánchez', 'Roberto Vega']]);

seccion('3. marca de envío y fecha');
hojas['Invitados'].getRange(2, 7).setValue(true);
onEdit({ range: hojas['Invitados'].getRange(2, 7) });
igual('al marcar guarda fecha de envío', hojas['Invitados'].getRange(2, 8).getValue() instanceof Date, true);
hojas['Invitados'].getRange(2, 7).setValue(false);
onEdit({ range: hojas['Invitados'].getRange(2, 7) });
igual('al desmarcar limpia la fecha', hojas['Invitados'].getRange(2, 8).getValue(), '');
onEdit({ range: hojas['Invitados'].getRange(2, 1) });
cierto('al editar un grupo crea su checkbox de enviada',
  !!hojas['Invitados'].getRange(2, 7).getDataValidation());

seccion('4. doPost guarda y sincroniza la confirmación');
let r = doPost({ postData: { contents: JSON.stringify({
  codigo: codigoSanchez,
  asistiran: ['Ana Sánchez'],
  no_asistiran: ['Roberto Vega'],
  mensaje: 'Con mucha alegría'
}) } });
igual('acepta respuesta válida', JSON.parse(r.getContent()).ok, true);
igual('actualiza la fila existente, no duplica', nFilasRes(), 1);
const primera = hojas['Respuestas'].getRange(2, 1, 1, COL_RES.length).getValues()[0];
igual('total es sólo la cantidad que dijo sí', primera[5], 1);
igual('guarda el mensaje', primera[6], 'Con mucha alegría');
igual('actualiza el estado por grupo', hojas['Invitados'].getRange(2, 9).getValue(), 'Respondida');
igual('actualiza total de asistentes en Invitados', hojas['Invitados'].getRange(2, 12).getValue(), 1);
hojas['Invitados'].getRange(2, 7).setValue(true);
onEdit({ range: hojas['Invitados'].getRange(2, 7) });

r = doPost({ postData: { contents: JSON.stringify({
  codigo: 'AB01', asistiran: ['María Vega', 'Intruso'], no_asistiran: []
}) } });
igual('descarta nombres ajenos', hojas['Respuestas'].getRange(3, 4).getValue(), 'María Vega');
igual('rechaza un código desconocido', JSON.parse(doPost({
  postData: { contents: JSON.stringify({ codigo: 'ZZ99', asistiran: ['Intruso'] }) }
}).getContent()).ok, false);
igual('rechaza JSON inválido', JSON.parse(doPost({ postData: { contents: '{mal' } }).getContent()).ok, false);

seccion('5. dashboard muestra envíos y listas por persona');
verResumen();
const resumen = hojas['Resumen'];
const celda = (f, c) => resumen.getRange(f, c).getValue();
igual('2 grupos en dashboard', celda(5, 2), 2);
igual('1 link enviado', celda(6, 2), 1);
igual('1 link pendiente', celda(7, 2), 1);
igual('2 respuestas', celda(8, 2), 2);
igual('2 personas asistirán', celda(5, 5), 2);
igual('1 persona no asistirá', celda(6, 5), 1);
const panel = htmlResumen();
cierto('dashboard incluye link por enviar', /Links por enviar/.test(panel));
cierto('dashboard incluye asistentes y no asistentes', /Asistirán/.test(panel) && /No asistirán/.test(panel));
cierto('dashboard no muestra acompañantes', !/Acompañantes/.test(panel));
igual('el dashboard conserva 8 tarjetas métricas', (panel.match(/class="num[ "]/g) || []).length, 8);

seccion('6. casos borde');
igual('limpiarLista quita vacíos y recorta', limpiarLista('  ,  , Ana ,  , Luis ,, '), ['Ana', 'Luis']);
igual('un link se escapa en el HTML', escaparHtml('https://a.test/?x=1&y=2'), 'https://a.test/?x=1&amp;y=2');
try {
  actualizarDashboard();
  doGet();
  cierto('el dashboard se actualiza sin cambiar la pestaña activa', true);
} catch (e) { cierto('dashboard sin error -> ' + e.message, false); }

console.log('\n' + (fallos
  ? '*** ' + fallos + ' PRUEBAS FALLIDAS de ' + total
  : 'Las ' + total + ' pruebas pasaron.'));
process.exit(fallos ? 1 : 0);
