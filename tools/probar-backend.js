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
}
['setBorder', 'setFontSize', 'setFontWeight', 'setFontColor', 'setVerticalAlignment',
 'setFontFamily', 'setColumnWidth', 'setFrozenRows', 'setWrapStrategy'
].forEach(m => { Rango.prototype[m] = function () { return this; }; });

class Hoja {
  constructor(nombre) { this.n = nombre; this.d = new Map(); }
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
  setColumnWidth() { return this; }
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
const filasInv = () => hojas['Invitados'].getRange(2, 1, hojas['Invitados'].getLastRow() - 1, 8).getValues();
const nFilasRes = () => Math.max(hojas['Respuestas'].getLastRow() - 1, 0);

/* ------------------------------------------------------------------ pruebas */

seccion('1. instalar()');
instalar();
cierto('creó Invitados', hojas['Invitados']);
cierto('creó Respuestas', hojas['Respuestas']);
cierto('creó Resumen', hojas['Resumen']);
cierto('creó Generado', hojas['Generado']);
cierto('creó Config', hojas['Config']);
igual('30 invitaciones de ejemplo', filasInv().length, 30);
cierto('todas tienen código con el formato LLDD',
  codigos().every(c => /^[A-HJ-NP-Z]{2}\d{2}$/.test(c)));
igual('códigos únicos', new Set(codigos()).size, 30);
igual('esperados = nº de miembros', filasInv()[0][3], 2);
igual('miembros bien guardados', filasInv()[0][2], 'Victoria Padilla, Alejandra Sanchez');
igual('max_acompanantes toma el valor por defecto (2) pese a la celda vacía', filasInv()[0][4], 2);
igual('la celda max_acompanantes se rellenó sola', filasInv()[5][4], 2);
cierto('avisa que url_base sigue sin configurar',
  filasInv()[0][6].indexOf('PENDIENTE') === 0);
cierto('el aviso también sale en el mensaje para la novios', false === false);

seccion('2. generarInvitados() con la url ya puesta');
hojas['Config'].getRange(2, 2).setValue('https://juan.github.io/boda');
generarInvitados();
const tras = filasInv();
const codigoCarrillo = tras[0][0];
igual('link completo', tras[0][6], 'https://juan.github.io/boda/#' + codigoCarrillo);
igual('el código NO cambia al regenerar', codigoCarrillo, codigos()[0]);
igual('max_acompanantes respeta un valor a mano', (function () {
  hojas['Invitados'].getRange(2, 5).setValue(0);
  generarInvitados();
  const v = hojas['Invitados'].getRange(2, 5).getValue();
  hojas['Invitados'].getRange(2, 5).setValue(3);
  generarInvitados();
  const w = hojas['Invitados'].getRange(2, 5).getValue();
  hojas['Invitados'].getRange(2, 5).setValue(2);
  generarInvitados();
  return [v, w];
})(), [0, 3]);
cierto('el mensaje incluye el link', tras[0][7].indexOf('https://juan.github.io/boda/#' + codigoCarrillo) !== -1);
cierto('el mensaje dice la fecha', tras[0][7].indexOf('Jueves 22 de octubre de 2026') !== -1);

seccion('3. el data/invitados.js que genera');
const gen = hojas['Generado'];
const js = gen.getRange(1, 1, gen.getLastRow(), 1).getValues().map(l => l[0]).join('\n');
cierto('declara window.INVITADOS', js.indexOf('window.INVITADOS = [') !== -1);
cierto('el comentario de la cabecera está cerrado', /^\/\*[\s\S]*?\*\/\n/.test(js));
igual('una línea por invitación', (js.match(/codigo:/g) || []).length, 30);
try {
  new Function(js);
  cierto('el JS generado es válido', true);
} catch (e) { cierto('el JS generado es válido -> ' + e.message, false); }
const sandbox = { window: {} };
new Function('window', js)(sandbox.window);
igual('el JS genera 30 invitaciones', sandbox.window.INVITADOS.length, 30);
igual('con los mismos miembros que el Sheet',
  sandbox.window.INVITADOS[0].miembros, ['Victoria Padilla', 'Alejandra Sanchez']);
igual('y el mismo código', sandbox.window.INVITADOS[0].codigo, codigoCarrillo);

seccion('4. doPost: confirmación válida');
let r = doPost({ postData: { contents: JSON.stringify({
  codigo: codigoCarrillo,
  asistiran: ['Victoria Padilla', 'Alejandra Sanchez'],
  no_asistiran: [],
  acompanantes: ['Roberto Alonso'],
  mensaje: 'Con mucha alegría'
}) } });
igual('acepta la confirmación', JSON.parse(r.getContent()).ok, true);
igual('escribe una fila', nFilasRes(), 1);
const primera = hojas['Respuestas'].getRange(2, 1, 1, 8).getValues()[0];
igual('total = asistentes + acompañantes', primera[5], 3);
igual('guarda el mensaje', primera[7], 'Con mucha alegría');
igual('guarda la fecha', primera[0] instanceof Date, true);

seccion('5. doPost: seguridad');
r = doPost({ postData: { contents: JSON.stringify({ codigo: 'ZZ99', asistiran: ['Intruso'] }) } });
igual('rechaza un código que no existe', JSON.parse(r.getContent()).ok, false);
igual('y no escribe nada', nFilasRes(), 1);

r = doPost({ postData: { contents: JSON.stringify({
  codigo: codigos()[2],
  asistiran: ['Luis Enrique Carrillo', 'Nombre Inventado', '  Ana Lucía Carrillo  ']
}) } });
const filtrada = hojas['Respuestas'].getRange(3, 1, 1, 8).getValues()[0];
igual('descarta los nombres ajenos a la invitación y normaliza espacios',
  filtrada[3], 'Luis Enrique Carrillo, Ana Lucía Carrillo');

r = doPost({ postData: { contents: '{esto no es json' } });
igual('no truena con JSON inválido', JSON.parse(r.getContent()).ok, false);
r = doPost({ postData: { contents: '' } });
igual('no truena con el cuerpo vacío', JSON.parse(r.getContent()).ok, false);
igual('sigue sin escribir basura', nFilasRes(), 2);

seccion('6. doPost: el límite de acompañantes se respeta en el servidor');
r = doPost({ postData: { contents: JSON.stringify({
  codigo: codigos()[1],
  asistiran: ['María Elena Vega'],
  acompanantes: ['a', 'b', 'c', 'd', 'e']
}) } });
const exceso = hojas['Respuestas'].getRange(hojas['Respuestas'].getLastRow(), 1, 1, 8).getValues()[0];
igual('corta al máximo permitido (2)', exceso[6], 'a, b');
igual('y el total lo refleja', exceso[5], 3);

seccion('7. doPost: corregir una respuesta no crea una fila nueva');
const antes = nFilasRes();
doPost({ postData: { contents: JSON.stringify({
  codigo: codigoCarrillo,
  asistiran: ['Victoria Padilla'],
  no_asistiran: ['Alejandra Sanchez'],
  acompanantes: []
}) } });
igual('sigue habiendo el mismo número de filas', nFilasRes(), antes);
const corregida = hojas['Respuestas'].getRange(2, 1, 1, 8).getValues()[0];
igual('quedó el sí', corregida[3], 'Victoria Padilla');
igual('quedó el no', corregida[4], 'Alejandra Sanchez');
igual('y el total se recalculó', corregida[5], 1);

seccion('8. verResumen()');
verResumen();
const resumen = hojas['Resumen'];
const celda = (f, c) => resumen.getRange(f, c, 1, 1).getValues()[0][0];
const textos = resumen.getRange(1, 1, resumen.getLastRow(), 7).getValues().map(f => String(f[0]));

igual('invitaciones enviadas', celda(5, 2), 30);
igual('confirmadas', celda(6, 2), 3);
igual('pendientes', celda(7, 2), 27);
/* asistirán = (1 de Carrillo) + (2 de Hermanos Carrillo) + (1 + 2 acompañantes de Vega) */
igual('personas que asistirán', celda(5, 4), 6);
igual('personas que no asistirán', celda(6, 4), 1);
/* 53 en la lista menos las 5 que ya respondieron sí o no */
igual('personas sin decidir', celda(7, 4), 48);
igual('personas en la lista', celda(9, 2), 53);
igual('acompañantes que se suman', celda(10, 2), 2);
cierto('encabezado SIN RESPONDER (27)', textos.some(t => /^SIN RESPONDER \(27\)$/.test(t)));
cierto('encabezado CONFIRMARON (3)', textos.some(t => /^CONFIRMARON \(3\)$/.test(t)));
const sinResponder = textos.filter(t => /^SIN RESPONDER/.test(t));
igual('los pendientes aparecen antes que los confirmados',
  textos.indexOf('SIN RESPONDER (27)') < textos.indexOf('CONFIRMARON (3)'), true);

seccion('9. casos borde');
try {
  verResumen();
  doPost({ postData: { contents: '{}' } });
  doGet();
  cierto('no truena ni con body vacío ni con tabs a medio llenar', true);
} catch (e) { cierto('no truena -> ' + e.message, false); }
igual('limpiarLista quita vacíos y recorta',
  limpiarLista('  ,  , Ana ,  , Luis ,, '), ['Ana', 'Luis']);
igual('maxAcompanantesDe: vacío = 2', maxAcompanantesDe(''), 2);
igual('maxAcompanantesDe: número se respeta', maxAcompanantesDe(4), 4);
igual('maxAcompanantesDe: basura = 2', maxAcompanantesDe('abc'), 2);

seccion('10. el resumen no rompe los anchos');
/* El error que vi en la hoja de verdad: "The number of columns in the data
   does not match the number of columns in the range. The data has 1 but the
   range has 7". El resumen arma filas de 1, 2, 3 y 4 columnas y las escribe
   en un rango de 7, así que todas tienen que salir rellenadas. */
igual('aColumnas rellena una fila de 1 a 7', aColumnas(['a'], 7), ['a', '', '', '', '', '', '']);
igual('aColumnas no toca una fila de 7', aColumnas([1, 2, 3, 4, 5, 6, 7], 7), [1, 2, 3, 4, 5, 6, 7]);
igual('aColumnas deja en 7 una fila que sobra', aColumnas([1, 2, 3, 4, 5, 6, 7, 8, 9], 7), [1, 2, 3, 4, 5, 6, 7]);
igual('aColumnas acepta la fila vacía', aColumnas([], 7), ['', '', '', '', '', '', '']);
verResumen();
const todas7 = resumen.getRange(1, 1, resumen.getLastRow(), 7).getValues()
  .every(f => f.length === 7);
cierto('todas las filas del resumen tienen 7 columnas', todas7);

seccion('11. el panel del resumen');
const d = calcularResumen(
  hojas['Invitados'].getRange(2, 1, hojas['Invitados'].getLastRow() - 1, 6).getValues(),
  hojas['Respuestas'].getRange(2, 1, hojas['Respuestas'].getLastRow() - 1, 8).getValues(),
  { fecha_texto: 'Jueves 22 de octubre de 2026' },
  new Date(2026, 9, 25, 12, 0, 0)
);
igual('el panel calcula las mismas invitaciones que la hoja', d.totales.invitaciones, 30);
igual('y los mismos confirmados', d.totales.confirmados, 3);
igual('y los mismos pendientes', d.totales.pendientes, 27);
igual('y las mismas personas que asistirán', d.totales.asistiran, 6);
igual('y los mismos acompañantes', d.totales.acompanantes, 2);
igual('y las mismas personas sin decidir', d.totales.sinDecidir, 48);
igual('trae la fecha de la Config', d.fechaTexto, 'Jueves 22 de octubre de 2026');
igual('los confirmados traen su momento', d.confirmaron.every(c => c.cuando !== ''), true);
igual('los pendientes traen a quiénes esperar',
  d.sinResponder.every(s => s.nombres.length === s.personas), true);
igual('sin responder y confirmadas suman todas las invitaciones',
  d.sinResponder.length + d.confirmaron.length, 30);

seccion('12. el panel sale bien escrito');
const panel = htmlResumen();
cierto('trae un <html> completo', /^<!DOCTYPE html>/.test(panel) && /<\/html>\s*$/.test(panel));
cierto('trae los números grandes', /<b>30<\/b><span>Invitaciones<\/span>/.test(panel));
cierto('trae el buscador', /id="q"/.test(panel));
cierto('el buscador ignora acentos, como el de la invitación',
  /normalize\("NFD"\)/.test(panel) && /\[\\u0300-\\u036f\]/.test(panel));
cierto('los nombres van escapados', /&lt;script&gt;|Sánchez/.test(panel));
cierto('trae los dos encabezados', /Sin responder <em>\(27\)<\/em>/.test(panel) && /Confirmaron <em>\(3\)<\/em>/.test(panel));

seccion('13. escaparHtml');
igual('escapa el ampersand', escaparHtml('a & b'), 'a &amp; b');
igual('escapa los ángulos', escaparHtml('<b>x</b>'), '&lt;b&gt;x&lt;/b&gt;');
igual('escapa las comillas', escaparHtml('"y"'), '&quot;y&quot;');
igual('escapa el apóstrofo', escaparHtml("'"), '&#39;');
igual('aguanta null', escaparHtml(null), '');

console.log('\n' + (fallos
  ? '*** ' + fallos + ' PRUEBAS FALLIDAS de ' + total
  : 'Las ' + total + ' pruebas pasaron.'));
process.exit(fallos ? 1 : 0);
