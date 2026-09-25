/** ==========================================================================
 *  Invitación de boda — Johann y Abril
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
    .addItem('Ver resumen', 'verResumen')
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
      ['fecha_texto', 'jueves 22 de octubre de 2026',                 'Cómo se escribe la fecha.'],
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
    'Con cariño, Johann y Abril';
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

function verResumen() {
  var ss = SpreadsheetApp.getActiveSpreadsheet();

  /* Respuestas recibidas, indexadas por código. */
  var recibidas = {};
  var respuestas = leerFilas(HOJA_RESPUESTAS, COL_RES.length);
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

  var confirmados = 0;
  var pendientes = 0;
  var esperados = 0;
  var asistiran = 0;
  var acompanantesTotal = 0;
  var noAsistiran = 0;
  var sinDecidir = 0;
  var detalle = [];

  var invitaciones = leerFilas(HOJA_INVITADOS, 6);
  for (var f = 0; f < invitaciones.length; f++) {
    var grupo = texto(invitaciones[f][1]);
    if (!grupo) continue;

    var cod = texto(invitaciones[f][0]).toUpperCase();
    var miembros = limpiarLista(invitaciones[f][2]);
    var cantidad = miembros.length;
    var r = recibidas[cod];

    var deEste = { asiste: 0, no: 0, extra: 0 };

    if (r) {
      confirmados++;
      deEste.asiste = r.asistiran.length;
      deEste.no = r.noAsistiran.length;
      deEste.extra = r.acompanantes.length;
      sinDecidir += Math.max(cantidad - deEste.asiste - deEste.no, 0);
    } else {
      pendientes++;
      sinDecidir += cantidad;
    }

    esperados += cantidad;
    asistiran += deEste.asiste + deEste.extra;
    acompanantesTotal += deEste.extra;
    noAsistiran += deEste.no;

    detalle.push({
      codigo: cod,
      grupo: grupo,
      confirmo: !!r,
      esperados: cantidad,
      asiste: deEste.asiste,
      no: deEste.no,
      extra: deEste.extra,
      fecha: r && r.fecha
        ? Utilities.formatDate(new Date(r.fecha), ZONA, 'dd/MM HH:mm')
        : ''
    });
  }

  var total = confirmados + pendientes;
  var cfg = config();

  var out = [];
  out.push(['Boda de Johann y Abril · ' + texto(cfg.fecha_texto)]);
  out.push(['Actualizado ' + Utilities.formatDate(new Date(), ZONA, 'dd/MM/yyyy HH:mm')]);
  out.push([]);

  out.push(['Invitaciones', '', 'Personas', '']);
  out.push(['Enviadas', total, 'Asistirán', asistiran]);
  out.push(['Confirmadas', confirmados, 'No asistirán', noAsistiran]);
  out.push(['Pendientes', pendientes, 'Sin decidir', sinDecidir]);
  out.push([]);
  out.push(['Personas en la lista', esperados]);
  out.push(['Acompañantes que se suman', acompanantesTotal]);
  out.push([]);

  var sinResponder = detalle.filter(function (d) { return !d.confirmo; });
  out.push(['SIN RESPONDER (' + sinResponder.length + ')']);
  out.push(['código', 'invitación', 'personas', 'notas']);
  for (var s = 0; s < sinResponder.length; s++) {
    out.push([sinResponder[s].codigo, sinResponder[s].grupo, sinResponder[s].esperados, '']);
  }
  out.push([]);

  var si = detalle.filter(function (d) { return d.confirmo; });
  out.push(['CONFIRMARON (' + si.length + ')']);
  out.push(['código', 'invitación', 'sí', 'no', 'acomp.', 'total', 'respondió']);
  for (var c = 0; c < si.length; c++) {
    var d = si[c];
    out.push([d.codigo, d.grupo, d.asiste, d.no, d.extra, d.asiste + d.extra, d.fecha]);
  }

  var h = asegurarHoja(HOJA_RESUMEN);
  h.clearContents();
  h.getRange(1, 1, out.length, 7).setValues(out);

  /* Formato: nada de colores chillones, sólo jerarquía. */
  h.getRange(1, 1).setFontSize(15);
  h.getRange(2, 1).setFontSize(9).setFontColor('#888888');
  h.getRange(4, 1, 1, 4).setFontWeight('bold');
  h.getRange(5, 1, 3, 1).setFontSize(11);
  h.getRange(5, 3, 3, 1).setFontSize(11);
  h.getRange(5, 2, 3, 1).setFontSize(14).setFontWeight('bold');
  h.getRange(5, 4, 3, 1).setFontSize(14).setFontWeight('bold');
  h.getRange(7, 1, 2, 1).setFontSize(11);

  for (var k = 0; k < out.length; k++) {
    var linea = texto(out[k][0]);
    if (linea.indexOf('SIN RESPONDER (') === 0 || linea.indexOf('CONFIRMARON (') === 0) {
      var f2 = k + 1;
      h.getRange(f2, 1, 1, 7).setFontWeight('bold').setFontSize(12);
      h.getRange(f2, 1, 1, 7).setBorder(true, false, false, false);
      h.getRange(f2 + 1, 1, 1, 7).setFontSize(9).setFontColor('#888888');
    }
  }

  h.setColumnWidth(1, 90);
  h.setColumnWidth(2, 300);
  h.setColumnWidth(3, 80);
  h.setColumnWidth(4, 80);
  h.setColumnWidth(5, 80);
  h.setColumnWidth(6, 80);
  h.setColumnWidth(7, 110);
  h.getRange(1, 1, out.length, 7).setVerticalAlignment('top');

  ss.setActiveSheet(h);
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
