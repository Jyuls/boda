/** ==========================================================================
 *  Invitación de boda — Abril y Johann
 *  Pegar este archivo completo en:  Extensiones > Apps Script > Code.gs
 *
 *  Este script sólo usa SpreadsheetApp y Utilities, así que Google te pedirá
 *  un permiso concreto ("ver y editar este spreadsheet"), que es inofensivo.
 *  No pide acceso a nada fuera de tu propia hoja.
 * ========================================================================== */

/* -------------------------------------------------------------------------- */
/* Pestañas y columnas                                                        */
/* -------------------------------------------------------------------------- */

var HOJA_INVITADOS  = 'Invitados';
var HOJA_RESPUESTAS = 'Respuestas';
var HOJA_RESUMEN    = 'Resumen';
var HOJA_CONFIG     = 'Config';
var HOJA_GENERADO   = 'Generado';

var COL_INV = ['codigo', 'grupo', 'miembros', 'esperados', 'max_acompanantes', 'notas', 'link', 'mensaje'];
var COL_RES = ['fecha', 'codigo', 'grupo', 'asistiran', 'no_asistiran', 'total', 'acompanantes', 'mensaje'];

var ZONA = 'America/Tijuana';

var LETRAS = 'ABCDEFGHJKLMNPQRSTUVWXYZ'; /* sin I ni O: se confunden con 1 y 0 */

/* -------------------------------------------------------------------------- */
/* Utilidades                                                                 */
/* -------------------------------------------------------------------------- */

function hoja(nombre) {
  return SpreadsheetApp.getActiveSpreadsheet().getSheetByName(nombre);
}

function asegurarHoja(nombre, encabezados) {
  var ss = SpreadsheetApp.getActiveSpreadsheet();
  var h = ss.getSheetByName(nombre);
  if (!h) h = ss.insertSheet(nombre);
  if (encabezados && encabezados.length) {
    h.getRange(1, 1, 1, encabezados.length).setValues([encabezados]);
  }
  return h;
}

/* Filas de datos, o un arreglo vacío si la hoja está en blanco.
   getRange con 0 filas es un error, de ahí el cuidado. */
function leerFilas(nombre, columnas) {
  var h = hoja(nombre);
  if (!h) return [];
  var total = h.getLastRow();
  if (total < 2) return [];
  return h.getRange(2, 1, total - 1, columnas).getValues();
}

function limpiarLista(texto) {
  if (!texto) return [];
  return String(texto)
    .split(',')
    .map(function (s) { return s.trim(); })
    .filter(function (s) { return s.length > 0; });
}

function texto(valor) {
  return String(valor === null || valor === undefined ? '' : valor).trim();
}

function json_(objeto) {
  return ContentService.createTextOutput(JSON.stringify(objeto))
    .setMimeType(ContentService.MimeType.JSON);
}

/* -------------------------------------------------------------------------- */
/* 1. MENÚ                                                                    */
/* -------------------------------------------------------------------------- */

function onOpen() {
  SpreadsheetApp.getUi()
    .createMenu('Boda')
    .addItem('Instalar invitaciones', 'instalar')
    .addItem('Generar lista para la web', 'generarInvitados')
    .addItem('Ver resumen', 'mostrarResumen')
    .addItem('Resumen en la hoja', 'verResumen')
    .addSeparator()
    .addItem('Ayuda', 'ayuda')
    .addToUi();
}

function ayuda() {
  SpreadsheetApp.getUi().alert(
    'Cómo se usa\n\n' +
    '1. En la pestaña Config, pon tu dirección de GitHub en url_base.\n\n' +
    '2. En la pestaña Invitados escribe, grupo por grupo:\n' +
    '   - grupo: el nombre de la invitación (Familia Carrillo)\n' +
    '   - miembros: los nombres separados por coma\n\n' +
    '3. Boda > Generar lista para la web. Rellena los códigos que falten,\n' +
    '   arma los links y deja el archivo listo en la pestaña Generado.\n\n' +
    '4. Copia la pestaña Generado dentro de data/invitados.js del proyecto\n' +
    '   y súbelo a GitHub.\n\n' +
    '5. Las confirmaciones llegan solas a la pestaña Respuestas.\n' +
    '   Para los totales: Boda > Ver resumen.'
  );
}

/* -------------------------------------------------------------------------- */
/* 2. INSTALACIÓN (una sola vez)                                              */
/* -------------------------------------------------------------------------- */

function instalar() {
  var ss = SpreadsheetApp.getActiveSpreadsheet();

  asegurarHoja(HOJA_INVITADOS, COL_INV);
  asegurarHoja(HOJA_RESPUESTAS, COL_RES);
  asegurarHoja(HOJA_RESUMEN);
  asegurarHoja(HOJA_GENERADO);

  var cfg = asegurarHoja(HOJA_CONFIG, ['clave', 'valor', 'qué es']);
  if (cfg.getLastRow() < 2) {
    cfg.getRange(2, 1, 5, 3).setValues([
      ['url_base',    'https://TU_USUARIO.github.io/boda',            'Tu dirección en GitHub, sin barra final.'],
      ['enlace_maps', 'https://maps.app.goo.gl/UJr6qCr8tBrk5gqE9',    'El mapa que se abre desde la invitación.'],
      ['fecha_texto', 'Jueves 22 de octubre de 2026',                 'Cómo se escribe la fecha.'],
      ['hora_texto',  '11:00',                                        'Hora de la misa.'],
      ['lugar_texto', 'Parroquia San Ignacio de Loyola, Tijuana',     'Cómo se escribe el lugar.']
    ]);
  }

  /* Semilla: 30 invitaciones de ejemplo, para que tengas el formato a la
     vista. Al reemplazarlas por los nombres reales, los códigos se conservan,
     así que cualquier link que ya hayas mandado sigue funcionando. */
  var ejemplos = [
    ['Familia Carrillo',      'Victoria Padilla, Alejandra Sanchez'],
    ['Familia Vega González', 'María Elena Vega, Diego Alejandro Vega'],
    ['Hermanos Carrillo',     'Luis Enrique Carrillo, Ana Lucía Carrillo'],
    ['Hermanos Vega',         'Ricardo Vega, Mariana Vega'],
    ['Padres de Abril',       'Ramón Carrillo, Marta Sánchez'],
    ['Padres de Johann',      'Elda González, Rogelio Vega'],
    ['Tíos Carrillo',         'José María Mendoza, Teresa Carrillo'],
    ['Tíos Vega',             'Fernando Ruiz, Silvia González'],
    ['Sobrinos Carrillo',     'Camila Carrillo, Diego Padilla'],
    ['Sobrinos Vega',         'Emiliano Vega, Fernanda Carrillo'],
    ['Primos de Abril',       'Daniela Carrillo, Paulina Carrillo'],
    ['Primos de Johann',      'Sebastián Vega, Isabel Vega'],
    ['Abuela Carrillo',       'Rosa María Sánchez'],
    ['Abuelo Vega',           'Manuel Vega'],
    ['Tía Naranjo',           'Guillermina Naranjo'],
    ['Tío Escobar',           'Rafael Escobar'],
    ['Ana Laura y Marco',     'Ana Laura Ruiz, Marco Antonio Ruiz'],
    ['Sofía e Iván',          'Sofía Mendoza, Iván Cervantes'],
    ['Regina y Óscar',        'Regina Delgado, Óscar Paredes'],
    ['Nancy y David',         'Nancy Escobar, David Escobar'],
    ['Carlos Mendoza',        'Carlos Mendoza'],
    ['Patricia Cervantes',    'Patricia Cervantes'],
    ['Fernando Ruiz',         'Fernando Ruiz'],
    ['Adriana Ríos',          'Adriana Ríos'],
    ['Bruno Salcedo',         'Bruno Salcedo'],
    ['Amigos de la facultad', 'Camila Ferriz, Héctor Villalobos, Natalia Ortega, Rodrigo Peña'],
    ['Amigos del trabajo',    'Esmeralda Lira, Joaquín Braun'],
    ['Familia Padilla',       'Rosalía Padilla, Emiliano Padilla'],
    ['Familia Sánchez',       'Graciela Sánchez, Rodrigo Sánchez'],
    ['Familia Paredes',       'Carmen Paredes, Ana Sofía Paredes']
  ];

  var inv = hoja(HOJA_INVITADOS);
  if (inv.getLastRow() < 2) {
    inv.getRange(2, 1, ejemplos.length, COL_INV.length)
       .setValues(ejemplos.map(function (e) { return ['', e[0], e[1], '', '', '', '', '']; }));
  }

  generarInvitados();
  verResumen();

  SpreadsheetApp.getUi().alert(
    'Listo.\n\n' +
    'Se crearon las pestañas Invitados, Respuestas, Resumen, Generado y Config.\n\n' +
    'Falta lo más importante: en Config cambia TU_USUARIO por tu usuario de\n' +
    'GitHub. Después llena los nombres reales en Invitados y vuelve a correr\n' +
    'Boda > Generar lista para la web.'
  );
}

/* -------------------------------------------------------------------------- */
/* 3. CONFIG                                                                  */
/* -------------------------------------------------------------------------- */

function config() {
  var valores = {};
  var filas = leerFilas(HOJA_CONFIG, 2);
  for (var i = 0; i < filas.length; i++) {
    var clave = texto(filas[i][0]);
    if (clave) valores[clave] = filas[i][1];
  }
  return valores;
}

/* -------------------------------------------------------------------------- */
/* 4. CÓDIGOS DE INVITACIÓN                                                    */
/*    Se generan una vez y no vuelven a cambiar. Por eso los links que ya    */
/*    mandaste siguen sirviendo aunque después edites los nombres.            */
/* -------------------------------------------------------------------------- */

function codigosUsados() {
  var usados = {};
  var filas = leerFilas(HOJA_INVITADOS, 1);
  for (var i = 0; i < filas.length; i++) {
    var c = texto(filas[i][0]).toUpperCase();
    if (c) usados[c] = true;
  }
  return usados;
}

function codigoLibre(usados) {
  for (var intento = 0; intento < 1000; intento++) {
    var codigo =
      LETRAS.charAt(Math.floor(Math.random() * LETRAS.length)) +
      LETRAS.charAt(Math.floor(Math.random() * LETRAS.length)) +
      Math.floor(Math.random() * 10) +
      Math.floor(Math.random() * 10);
    if (!usados[codigo]) {
      usados[codigo] = true;
      return codigo;
    }
  }
  throw new Error('No se encontró un código libre. Revisa la columna codigo.');
}

/* -------------------------------------------------------------------------- */
/* 5. GENERADOR: códigos, links, mensajes y el data/invitados.js               */
/* -------------------------------------------------------------------------- */

function generarInvitados() {
  var inv = hoja(HOJA_INVITADOS);
  if (!inv) throw new Error('Falta la pestaña ' + HOJA_INVITADOS + '. Corre Boda > Instalar invitaciones.');

  var cfg = config();
  var base = texto(cfg.url_base).replace(/\/+$/, '');

  /* Un link con TU_USUARIO adentro parece válido y no lo es. Si se mandan
     esos links a los invitados, la invitación no abre y no hay forma de
     enterarse hasta el día de la boda. */
  var urlSinConfigurar = false;
  if (!base) {
    urlSinConfigurar = true;
  } else if (base.indexOf('TU_USUARIO') !== -1) {
    urlSinConfigurar = true;
  }

  var fecha = texto(cfg.fecha_texto) || '22 de octubre de 2026';
  var hora = texto(cfg.hora_texto) || '11:00';
  var lugar = texto(cfg.lugar_texto) || 'Parroquia San Ignacio de Loyola';

  var usados = codigosUsados();
  var invitaciones = [];

  var filas = leerFilas(HOJA_INVITADOS, COL_INV.length);
  for (var i = 0; i < filas.length; i++) {
    var numeroFila = i + 2;
    var grupo = texto(filas[i][1]);
    if (!grupo) continue;

    var codigo = texto(filas[i][0]).toUpperCase();
    if (!codigo) {
      codigo = codigoLibre(usados);
      inv.getRange(numeroFila, 1).setValue(codigo);
    }

    var miembros = limpiarLista(filas[i][2]);
    inv.getRange(numeroFila, 4).setValue(miembros.length);

    /* Ojo: Number('') vale 0, no NaN. Si la celda está vacía el valor por
       defecto tiene que asignarse explícitamente, o los invitados se quedan
       sin posibilidad de llevar acompañante. */
    var bruto = filas[i][4];
    var maxAcompanantes = 2;
    if (bruto !== '' && bruto !== null && bruto !== undefined && bruto !== false) {
      var convertido = Number(bruto);
      if (!isNaN(convertido) && convertido >= 0) maxAcompanantes = convertido;
    }
    if (filas[i][4] !== maxAcompanantes) inv.getRange(numeroFila, 5).setValue(maxAcompanantes);

    var link = urlSinConfigurar
      ? 'PENDIENTE: falta tu usuario de GitHub en la pestaña Config'
      : base + '/#' + codigo;
    inv.getRange(numeroFila, 7).setValue(link);
    inv.getRange(numeroFila, 8).setValue(armarMensaje(fecha, hora, lugar, link));

    invitaciones.push({
      codigo: codigo,
      grupo: grupo,
      miembros: miembros,
      maxAcompanantes: maxAcompanantes,
      notas: texto(filas[i][5])
    });
  }

  escribirGenerado(armarArchivoJS(invitaciones));

  inv.setColumnWidth(1, 80);
  inv.setColumnWidth(2, 230);
  inv.setColumnWidth(3, 330);
  inv.setColumnWidth(6, 190);
  inv.setColumnWidth(7, 350);
  inv.setColumnWidth(8, 430);

  SpreadsheetApp.getUi().alert(
    'Se actualizaron ' + invitaciones.length + ' invitaciones.\n\n' +
    (urlSinConfigurar
      ? 'OJO: la columna link dice PENDIENTE porque en la pestaña Config\n' +
        'tu url_base todavía dice TU_USUARIO (o está vacía). Corrige eso y\n' +
        'vuelve a correr este botón, o los invitados van a recibir links rotos.\n\n'
      : 'Los links ya están listos en las columnas link y mensaje.\n\n') +
    'Ahora copia la pestaña Generado dentro de data/invitados.js y súbelo a\n' +
    'GitHub para que los invitados puedan confirmar.'
  );
}

function armarMensaje(fecha, hora, lugar, link) {
  return 'Con mucho gusto te invitamos a nuestra boda.\n\n' +
    fecha + ' a las ' + hora + '\n' +
    lugar + '\n\n' +
    'Confirma aquí: ' + link + '\n\n' +
    'Con cariño, Abril y Johann';
}

function escaparJS(valor) {
  return texto(valor)
    .replace(/\\/g, '\\\\')
    .replace(/'/g, "\\'")
    .replace(/\r?\n/g, ' ');
}

function armarArchivoJS(invitaciones) {
  var sello = Utilities.formatDate(new Date(), ZONA, 'dd/MM/yyyy HH:mm');

  var lineas = [
    '/* Generado el ' + sello + ' por el menú Boda de tu Google Sheet.',
    '   No lo edites a mano: la próxima vez que corras el generador se sobrescribe. */',
    '',
    'window.INVITADOS = ['
  ];

  for (var i = 0; i < invitaciones.length; i++) {
    var inv = invitaciones[i];
    var miembros = inv.miembros.map(function (m) {
      return "'" + escaparJS(m) + "'";
    }).join(', ');

    lineas.push(
      '  { codigo: \'' + inv.codigo + '\',' +
      ' grupo: \'' + escaparJS(inv.grupo) + '\',' +
      ' miembros: [' + miembros + '],' +
      ' maxAcompanantes: ' + inv.maxAcompanantes + ',' +
      ' notas: \'' + escaparJS(inv.notas) + '\' },'
    );
  }

  lineas.push('];');
  return lineas.join('\n');
}

function escribirGenerado(contenido) {
  var h = asegurarHoja(HOJA_GENERADO);
  h.clearContents();
  var lineas = contenido.split('\n');
  h.getRange(1, 1, lineas.length, 1).setValues(lineas.map(function (l) { return [l]; }));
  h.setColumnWidth(1, 900);
}

/* -------------------------------------------------------------------------- */
/* 6. RESUMEN                                                                  */
/* -------------------------------------------------------------------------- */
/* 6. EL RESUMEN                                                              */
/*     Dos cosas con el mismo cálculo: una pestaña de la hoja, que sirve para  */
/*     imprimir o compartir un pantallazo, y un panel con la misma información */
/*     pero hecha para mirarla.                                               */
/* -------------------------------------------------------------------------- */

var COLUMNAS_RESUMEN = 7;

/* Google Sheets es estricto: si el rango tiene 7 columnas, cada fila que se
   le pasa a setValues tiene que traer 7 valores. El resumen arma filas de 1, 2
   y 4 columnas (un separador vacío, un rótulo suelto, una tabla de 4), y sin
   esto la hoja tiraba "The number of columns in the data does not match the
   number of columns in the range". */
function aColumnas(fila, columnas) {
  var r = [];
  for (var i = 0; i < columnas; i++) r.push(fila[i] === undefined ? '' : fila[i]);
  return r;
}

function escaparHtml(valor) {
  return String(valor === null || valor === undefined ? '' : valor)
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#39;');
}

/* El cálculo, solo, sin escribir nada. Así lo usan las dos vistas y se puede
   probar sin una hoja de verdad. */
function calcularResumen(invitaciones, respuestas, cfg, ahora) {
  var recibidas = {};
  for (var i = 0; i < respuestas.length; i++) {
    var codigo = texto(respuestas[i][1]).toUpperCase();
    if (!codigo) continue;
    recibidas[codigo] = {
      fecha: respuestas[i][0],
      asistiran: limpiarLista(respuestas[i][3]),
      noAsistiran: limpiarLista(respuestas[i][4]),
      acompanantes: limpiarLista(respuestas[i][6])
    };
  }

  var sinResponder = [];
  var confirmaron = [];
  var t = {
    invitaciones: 0, confirmados: 0, pendientes: 0,
    personas: 0, asistiran: 0, noAsistiran: 0, acompanantes: 0, sinDecidir: 0
  };

  for (var f = 0; f < invitaciones.length; f++) {
    var grupo = texto(invitaciones[f][1]);
    if (!grupo) continue;

    var cod = texto(invitaciones[f][0]).toUpperCase();
    var miembros = limpiarLista(invitaciones[f][2]);
    var cantidad = miembros.length;
    var r = recibidas[cod];

    t.invitaciones++;
    t.personas += cantidad;

    if (r) {
      t.confirmados++;
      /* "Asistirán" son los que dijeron sí más los acompañantes que suman:
         es el número que sirve para la mesa y el catering. */
      t.asistiran += r.asistiran.length + r.acompanantes.length;
      t.acompanantes += r.acompanantes.length;
      t.noAsistiran += r.noAsistiran.length;
      t.sinDecidir += Math.max(cantidad - r.asistiran.length - r.noAsistiran.length, 0);
      confirmaron.push({
        codigo: cod,
        grupo: grupo,
        nombres: miembros,
        si: r.asistiran.length,
        no: r.noAsistiran.length,
        acomp: r.acompanantes.length,
        extra: r.acompanantes,
        total: r.asistiran.length + r.acompanantes.length,
        cuando: r.fecha ? Utilities.formatDate(new Date(r.fecha), ZONA, 'dd/MM HH:mm') : ''
      });
    } else {
      t.pendientes++;
      t.sinDecidir += cantidad;
      sinResponder.push({ codigo: cod, grupo: grupo, personas: cantidad, nombres: miembros });
    }
  }

  return {
    titulo: 'Boda de Abril y Johann',
    fechaTexto: texto(cfg.fecha_texto),
    actualizado: Utilities.formatDate(ahora, ZONA, "dd/MM/yyyy 'a las' HH:mm"),
    totales: t,
    sinResponder: sinResponder,
    confirmaron: confirmaron
  };
}

/* Lee las hojas y calcula. Lo usan tanto la pestaña como el panel. */
function resumenActual() {
  return calcularResumen(
    leerFilas(HOJA_INVITADOS, 6),
    leerFilas(HOJA_RESPUESTAS, COL_RES.length),
    config(),
    new Date()
  );
}

/* --- la pestaña ------------------------------------------------------------ */

function verResumen() {
  var ss = SpreadsheetApp.getActiveSpreadsheet();
  var d = resumenActual();
  var t = d.totales;
  var C = COLUMNAS_RESUMEN;

  var out = [];
  out.push([d.titulo + (d.fechaTexto ? ' · ' + d.fechaTexto : '')]);
  out.push(['Actualizado ' + d.actualizado]);
  out.push([]);

  out.push(['Invitaciones', '', 'Personas', '']);
  out.push(['Enviadas', t.invitaciones, 'Asistirán', t.asistiran]);
  out.push(['Confirmadas', t.confirmados, 'No asistirán', t.noAsistiran]);
  out.push(['Pendientes', t.pendientes, 'Sin decidir', t.sinDecidir]);
  out.push([]);
  out.push(['Personas en la lista', t.personas]);
  out.push(['Acompañantes que se suman', t.acompanantes]);
  out.push([]);

  out.push(['SIN RESPONDER (' + d.sinResponder.length + ')']);
  out.push(['código', 'invitación', 'personas']);
  for (var s = 0; s < d.sinResponder.length; s++) {
    out.push([d.sinResponder[s].codigo, d.sinResponder[s].grupo, d.sinResponder[s].personas]);
  }
  out.push([]);

  out.push(['CONFIRMARON (' + d.confirmaron.length + ')']);
  out.push(['código', 'invitación', 'sí', 'no', 'acomp.', 'total', 'respondió']);
  for (var c = 0; c < d.confirmaron.length; c++) {
    var f = d.confirmaron[c];
    out.push([f.codigo, f.grupo, f.si, f.no, f.acomp, f.total, f.cuando]);
  }

  /* Acá estaba el error: filas de 1, 2, 3 y 4 columnas en un rango de 7. */
  var filas = [];
  for (var k = 0; k < out.length; k++) filas.push(aColumnas(out[k], C));

  var h = asegurarHoja(HOJA_RESUMEN);
  h.clearContents();
  if (!filas.length) return;
  h.getRange(1, 1, filas.length, C).setValues(filas);

  /* Formato: nada de colores chillones, sólo jerarquía. */
  h.getRange(1, 1).setFontSize(15);
  h.getRange(2, 1).setFontSize(9).setFontColor('#888888');
  h.getRange(4, 1, 1, 4).setFontWeight('bold');
  h.getRange(5, 1, 3, 1).setFontSize(11);
  h.getRange(5, 3, 3, 1).setFontSize(11);
  h.getRange(5, 2, 3, 1).setFontSize(14).setFontWeight('bold');
  h.getRange(5, 4, 3, 1).setFontSize(14).setFontWeight('bold');
  h.getRange(7, 1, 2, 1).setFontSize(11);

  for (var j = 0; j < filas.length; j++) {
    var linea = texto(filas[j][0]);
    if (linea.indexOf('SIN RESPONDER (') === 0 || linea.indexOf('CONFIRMARON (') === 0) {
      h.getRange(j + 1, 1, 1, C).setFontWeight('bold').setFontSize(12);
      h.getRange(j + 1, 1, 1, C).setBorder(true, false, false, false);
      h.getRange(j + 2, 1, 1, C).setFontSize(9).setFontColor('#888888');
    }
  }

  h.setColumnWidth(1, 90);
  h.setColumnWidth(2, 300);
  h.setColumnWidth(3, 80);
  h.setColumnWidth(4, 80);
  h.setColumnWidth(5, 80);
  h.setColumnWidth(6, 80);
  h.setColumnWidth(7, 110);
  h.getRange(1, 1, filas.length, C).setVerticalAlignment('top');

  ss.setActiveSheet(h);
}

/* --- el panel ------------------------------------------------------------- */

function mostrarResumen() {
  var html = HtmlService.createHtmlOutput(htmlResumen());
  html.setTitle('Resumen de la boda');
  html.setWidth(900);
  html.setHeight(620);
  SpreadsheetApp.getUi().showModalDialog(html, 'Resumen · Abril y Johann');
}

function htmlResumen() {
  var d = resumenActual();
  var t = d.totales;
  var L = [];
  var n = 0;

  L.push('<!DOCTYPE html><html><head><meta charset="utf-8">');
  L.push('<style>');
  L.push(':root{--velo:#FBF7FC;--lila-claro:#F1E9FB;--lila:#D6C4EE;--tinta:#382646;');
  L.push('--sagrario:#6B3E86;--si:#C6D9C2;--si-texto:#3D6B41;--no:#B23A52;--linea:#E6DCF2}');
  L.push('*{box-sizing:border-box}');
  L.push('body{margin:0;background:var(--velo);color:var(--tinta);');
  L.push('font:15px/1.5 "Segoe UI",system-ui,sans-serif;-webkit-font-smoothing:antialiased}');
  L.push('.caja{padding:22px 26px 28px}');
  L.push('header{display:flex;justify-content:space-between;align-items:flex-start;gap:16px;');
  L.push('padding-bottom:14px;border-bottom:2px solid var(--lila)}');
  L.push('h1{margin:0;font-size:22px;font-weight:600;letter-spacing:-.01em}');
  L.push('.fecha{color:var(--sagrario);font-size:14px;margin-top:3px}');
  L.push('.mini{color:#8a7a92;font-size:12px;text-align:right;white-space:nowrap}');
  L.push('.buscador{margin:16px 0 4px;display:flex;gap:8px;align-items:center}');
  L.push('.buscador input{flex:1;padding:9px 12px;border:1px solid var(--lila);border-radius:8px;');
  L.push('font:inherit;font-size:15px;color:var(--tinta);background:#fff;outline:none}');
  L.push('.buscador input:focus{border-color:var(--sagrario);box-shadow:0 0 0 3px rgba(107,62,134,.12)}');
  L.push('.buscador button{padding:9px 14px;border:1px solid var(--lila);background:#fff;');
  L.push('border-radius:8px;font:inherit;font-size:14px;cursor:pointer;color:var(--sagrario)}');
  L.push('.numeros{display:flex;flex-wrap:wrap;gap:10px;margin:16px 0 6px}');
  L.push('.num{flex:1 1 96px;background:#fff;border:1px solid var(--linea);border-radius:12px;padding:11px 13px}');
  L.push('.num b{display:block;font-size:25px;font-weight:600;letter-spacing:-.02em}');
  L.push('.num span{display:block;font-size:11px;text-transform:uppercase;letter-spacing:.07em;');
  L.push('color:#8a7a92;margin-top:2px}');
  L.push('.num.ok b{color:var(--si-texto)}.num.no b{color:var(--no)}.num.pend b{color:#B07A18}');
  L.push('h2{font-size:13px;text-transform:uppercase;letter-spacing:.09em;color:var(--sagrario);');
  L.push('margin:26px 0 8px;padding-bottom:5px;border-bottom:1px solid var(--lila)}');
  L.push('h2 em{font-style:normal;color:#8a7a92;font-weight:400;letter-spacing:0}');
  L.push('table{width:100%;border-collapse:collapse;font-size:14px;background:#fff}');
  L.push('th{text-align:left;font-weight:600;font-size:11px;text-transform:uppercase;');
  L.push('letter-spacing:.06em;color:#8a7a92;padding:8px 10px;border-bottom:1px solid var(--linea)}');
  L.push('td{padding:8px 10px;border-bottom:1px solid #F4EFF9;vertical-align:top}');
  L.push('tr:last-child td{border-bottom:none}');
  L.push('td.cod{font-family:Consolas,monospace;font-size:13px;color:#8a7a92;white-space:nowrap}');
  L.push('td.n{text-align:right;font-variant-numeric:tabular-nums;white-space:nowrap}');
  L.push('td.si{color:var(--si-texto);font-weight:600}');
  L.push('td.no{color:var(--no);font-weight:600}');
  L.push('td.cuando{color:#8a7a92;font-size:13px;white-space:nowrap}');
  L.push('.nombres{color:#8a7a92;font-size:12.5px;margin-top:2px}');
  L.push('.vacio{padding:16px;background:#fff;border:1px dashed var(--lila);border-radius:10px;');
  L.push('color:#8a7a92;font-size:14px}');
  L.push('.nada{display:none;padding:10px;background:#fff;border:1px dashed var(--lila);');
  L.push('border-radius:10px;color:#8a7a92;font-size:14px}');
  L.push('@media print{.buscador{display:none}}');
  L.push('</style></head><body><div class="caja">');

  n++;
  L.push('<header><div><h1>' + escaparHtml(d.titulo) + '</h1>');
  L.push('<div class="fecha">' + escaparHtml(d.fechaTexto) + '</div></div>');
  L.push('<div class="mini">Actualizado<br><b>' + escaparHtml(d.actualizado) + '</b></div></header>');

  L.push('<div class="buscador"><input id="q" placeholder="Filtrar por nombre, grupo o código…" autocomplete="off">');
  L.push('<button id="p" onclick="window.print()">Imprimir</button></div>');

  L.push('<div class="numeros">');
  L.push('<div class="num"><b>' + t.invitaciones + '</b><span>Invitaciones</span></div>');
  L.push('<div class="num ok"><b>' + t.confirmados + '</b><span>Confirmadas</span></div>');
  L.push('<div class="num pend"><b>' + t.pendientes + '</b><span>Pendientes</span></div>');
  L.push('<div class="num"><b>' + t.personas + '</b><span>Personas</span></div>');
  L.push('<div class="num ok"><b>' + t.asistiran + '</b><span>Asistirán</span></div>');
  L.push('<div class="num no"><b>' + t.noAsistiran + '</b><span>No asistirán</span></div>');
  L.push('<div class="num"><b>' + t.acompanantes + '</b><span>Acompañantes</span></div>');
  L.push('<div class="num pend"><b>' + t.sinDecidir + '</b><span>Sin decidir</span></div>');
  L.push('</div>');

  /* --- sin responder --- */
  L.push('<section class="bloque" data-nombre="sin responder"><h2>Sin responder <em>(' + d.sinResponder.length + ')</em></h2>');
  if (!d.sinResponder.length) {
    L.push('<div class="vacio">Respondió todo el mundo. Qué bien.</div>');
  } else {
    L.push('<table><thead><tr><th>Código</th><th>Invitación</th><th style="text-align:right">Personas</th></tr></thead><tbody>');
    for (var i = 0; i < d.sinResponder.length; i++) {
      var s = d.sinResponder[i];
      L.push('<tr><td class="cod">' + escaparHtml(s.codigo) + '</td><td>' + escaparHtml(s.grupo) +
        '<div class="nombres">' + escaparHtml(s.nombres.join(', ')) + '</div></td>' +
        '<td class="n">' + s.personas + '</td></tr>');
    }
    L.push('</tbody></table>');
  }
  L.push('</section>');

  /* --- confirmaron --- */
  L.push('<section class="bloque" data-nombre="confirmaron"><h2>Confirmaron <em>(' + d.confirmaron.length + ')</em></h2>');
  if (!d.confirmaron.length) {
    L.push('<div class="vacio">Todavía nadie confirmó.</div>');
  } else {
    L.push('<table><thead><tr><th>Código</th><th>Invitación</th>' +
      '<th style="text-align:right">Sí</th><th style="text-align:right">No</th>' +
      '<th style="text-align:right">Acomp.</th><th style="text-align:right">Total</th>' +
      '<th>Respondió</th></tr></thead><tbody>');
    for (var c = 0; c < d.confirmaron.length; c++) {
      var f = d.confirmaron[c];
      L.push('<tr><td class="cod">' + escaparHtml(f.codigo) + '</td><td>' + escaparHtml(f.grupo) +
        '<div class="nombres">' + escaparHtml(f.nombres.join(', ')) +
        (f.extra.length ? ' · +' + escaparHtml(f.extra.join(', ')) : '') + '</div></td>' +
        '<td class="n si">' + f.si + '</td><td class="n no">' + f.no + '</td>' +
        '<td class="n">' + f.acomp + '</td><td class="n"><b>' + f.total + '</b></td>' +
        '<td class="cuando">' + escaparHtml(f.cuando) + '</td></tr>');
    }
    L.push('</tbody></table>');
  }
  L.push('</section>');

  L.push('</div>');

  /* Aparece sólo al filtrar y no encontrar a nadie. */
  L.push('<div id="nada" class="nada">Ningún invitado coincide con esa búsqueda.</div>');

  /* Filtrar: escribe en mayúsculas y sin acentos, así "sanchez" encuentra a
     "Sánchez", igual que el buscador de la invitación. Cada bloque se oculta
     entero, título incluido, cuando ya no le queda ninguna fila. */
  L.push('<script>');
  L.push('function plano(s){return String(s||"").normalize("NFD").replace(/[\\u0300-\\u036f]/g,"").toUpperCase().trim();}');
  L.push('var q=document.getElementById("q"), secs=[].slice.call(document.querySelectorAll("section.bloque"));');
  L.push('function filtrar(){');
  L.push('  var t=plano(q.value), conFilas=0;');
  L.push('  secs.forEach(function(sec){');
  L.push('    var tb=sec.querySelector("tbody"), quedan=0;');
  L.push('    if(tb){');
  L.push('      [].forEach.call(tb.rows,function(fila){');
  L.push('        var coincide=!t||plano(fila.textContent).indexOf(t)!==-1;');
  L.push('        fila.style.display=coincide?"":"none";');
  L.push('        if(coincide)quedan++;');
  L.push('      });');
  L.push('    }');
  L.push('    sec.style.display=(quedan||!tb)?"":"none";');
  L.push('    if(quedan)conFilas++;');
  L.push('  });');
  L.push('  var nada=document.getElementById("nada");');
  L.push('  if(nada)nada.style.display=conFilas?"none":"block";');
  L.push('}');
  L.push('q.addEventListener("input",filtrar);');
  L.push('</script>');
  L.push('</body></html>');

  return L.join('\n');
}

/* -------------------------------------------------------------------------- */
/* 7. RECEPCIÓN DE CONFIRMACIONES                                              */
/* -------------------------------------------------------------------------- */

/* doGet sirve para comprobar que el script está publicado y respondiendo. */
function doGet() {
  return json_({ ok: true, servicio: 'boda', hora: new Date().toISOString() });
}

function doPost(e) {
  try {
    var datos = JSON.parse(e.postData.contents);
    var codigo = texto(datos.codigo).toUpperCase();

    if (!codigo) return json_({ ok: false, error: 'falta el código' });

    var invitado = buscarInvitado(codigo);
    if (!invitado) {
      /* Un código que no está en la lista no se guarda. Esto es lo que impide
         que un bot llene la hoja: como mucho escribe una fila por invitación
         real, y una sola fila por código. */
      return json_({ ok: false, error: 'código no encontrado' });
    }

    /* Sólo aceptamos nombres que de verdad pertenecen a esa invitación. */
    var conocidos = {};
    for (var m = 0; m < invitado.miembros.length; m++) {
      conocidos[invitado.miembros[m]] = true;
    }

    var asistiran = soloConocidos(datos.asistiran, conocidos);
    var noAsistiran = soloConocidos(datos.no_asistiran, conocidos);
    var acompanantes = limpiarLista(datos.acompanantes).slice(0, invitado.maxAcompanantes);

    escribirRespuesta([
      new Date(),
      invitado.codigo,
      invitado.grupo,
      asistiran.join(', '),
      noAsistiran.join(', '),
      asistiran.length + acompanantes.length,
      acompanantes.join(', '),
      texto(datos.mensaje).slice(0, 500)
    ], invitado.codigo);

    return json_({ ok: true });

  } catch (error) {
    return json_({ ok: false, error: String(error) });
  }
}

function soloConocidos(lista, conocidos) {
  if (!Array.isArray(lista)) return [];
  var fuera = [];
  for (var i = 0; i < lista.length; i++) {
    var nombre = texto(lista[i]);
    if (nombre && conocidos[nombre]) fuera.push(nombre);
  }
  return fuera;
}

function escribirRespuesta(fila, codigo) {
  var h = hoja(HOJA_RESPUESTAS);
  if (!h) throw new Error('Falta la pestaña ' + HOJA_RESPUESTAS + '.');

  var existentes = leerFilas(HOJA_RESPUESTAS, 2);
  for (var i = 0; i < existentes.length; i++) {
    if (texto(existentes[i][1]).toUpperCase() === codigo) {
      /* Ya había respondido: se actualiza en vez de duplicar. */
      h.getRange(i + 2, 1, 1, COL_RES.length).setValues([fila]);
      return;
    }
  }

  h.getRange(h.getLastRow() + 1, 1, 1, COL_RES.length).setValues([fila]);
}

function buscarInvitado(codigo) {
  var filas = leerFilas(HOJA_INVITADOS, 5);
  for (var i = 0; i < filas.length; i++) {
    if (texto(filas[i][0]).toUpperCase() === codigo) {
      return {
        codigo: codigo,
        grupo: texto(filas[i][1]),
        miembros: limpiarLista(filas[i][2]),
        maxAcompanantes: maxAcompanantesDe(filas[i][4])
      };
    }
  }
  return null;
}

/* La celda puede venir vacía, como texto o como número. */
function maxAcompanantesDe(bruto) {
  if (bruto === '' || bruto === null || bruto === undefined || bruto === false) return 2;
  var n = Number(bruto);
  return (isNaN(n) || n < 0) ? 2 : n;
}
