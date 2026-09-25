/* ==========================================================================
   app.js — la página en sí: el link del mapa, la cuenta regresiva y el
   archivo de calendario. Nada de esto habla con un servidor.
   ========================================================================== */

(function () {
  'use strict';

  var CFG = window.CONFIG || {};
  var boda = CFG.boda || {};

  /* --------------------------------------------------------------------- */
  /* Utilidades                                                             */
  /* --------------------------------------------------------------------- */

  function buscar(selector) {
    return document.querySelector(selector);
  }

  /* Si falta un dato de config, la página tiene que seguir viéndose. */
  function texto(clave) {
    return typeof boda[clave] === 'string' ? boda[clave] : '';
  }

  /* --------------------------------------------------------------------- */
  /* Link del mapa                                                          */
  /* --------------------------------------------------------------------- */

  function montarMapa() {
    var enlace = buscar('[data-maps]');
    if (!enlace || !CFG.enlaceMaps) return;
    enlace.href = CFG.enlaceMaps;
  }

  /* --------------------------------------------------------------------- */
  /* Cuenta regresiva                                                        */
  /* --------------------------------------------------------------------- */

  var UNIDADES = [
    { clave: 'dias',    etiqueta: 'días' },
    { clave: 'horas',   etiqueta: 'horas' },
    { clave: 'minutos', etiqueta: 'minutos' }
  ];

  function pintarCuenta(destino, dias, horas, minutos) {
    destino.textContent = '';

    UNIDADES.forEach(function (unidad) {
      var caja = document.createElement('div');
      caja.className = 'cuenta__unidad';

      var numero = document.createElement('span');
      numero.className = 'cuenta__numero cifras';
      numero.textContent = String(unidad.clave === 'dias' ? dias
        : unidad.clave === 'horas' ? horas
        : minutos);

      var etiqueta = document.createElement('span');
      etiqueta.className = 'cuenta__etiqueta';
      etiqueta.textContent = unidad.etiqueta;

      caja.appendChild(numero);
      caja.appendChild(etiqueta);
      destino.appendChild(caja);
    });
  }

  function cuentaTerminada(destino) {
    destino.classList.add('cuenta--terminada');
    destino.textContent = '';

    var linea = document.createElement('p');
    linea.className = 'cuenta__frase';
    linea.textContent = 'Gracias por acompañarnos. Que Dios les bendiga siempre.';

    destino.appendChild(linea);
  }

  /* Hoy pero ya pasó la hora de la misa. */
  function cuentaYaEmpezo(destino) {
    destino.classList.add('cuenta--terminada');
    destino.textContent = '';

    var linea = document.createElement('p');
    linea.className = 'cuenta__frase';
    linea.textContent = 'La ceremonia ya empezó. Gracias por acompañarnos.';

    destino.appendChild(linea);
  }

  function arrancarCuenta() {
    var destino = buscar('[data-cuenta]');
    if (!destino) return;

    var momento = new Date(texto('inicio'));
    if (isNaN(momento.getTime())) {
      destino.style.display = 'none';
      return;
    }

    var hoy = new Date();
    var inicioDelDia = new Date(hoy.getFullYear(), hoy.getMonth(), hoy.getDate()).getTime();
    var objetivo = momento.getTime();

    /* Dos salidas anticipadas, y el resto lo decide actualizar():
         - un día anterior o anterior  -> ya pasó
         - hoy pero la hora ya pasó    -> ya empezó
         - mañana o después            -> cuenta regresiva
       La condición que separaba estos casos estaba al revés, así que
       cualquier boda futura se anunciaba como "hoy". */
    if (objetivo < inicioDelDia) { cuentaTerminada(destino); return; }

    function actualizar() {
      var falta = objetivo - Date.now();

      /* Llegamos hasta acá sólo si la fecha es hoy o posterior, así que
         "falta <= 0" significa que la hora de la misa ya pasó. */
      if (falta <= 0) { cuentaYaEmpezo(destino); return; }

      var totalMinutos = Math.floor(falta / 60000);
      pintarCuenta(
        destino,
        Math.floor(totalMinutos / 1440),
        Math.floor(totalMinutos / 60) % 24,
        totalMinutos % 60
      );
    }

    actualizar();
    setInterval(actualizar, 30000);
  }

  /* --------------------------------------------------------------------- */
  /* Agregar al calendario: generamos un archivo .ics, sin librerías        */
  /* --------------------------------------------------------------------- */

  /* En iCalendar, la coma, el punto y coma y la barra se escapan. */
  function escaparICS(valor) {
    return String(valor)
      .replace(/\\/g, '\\\\')
      .replace(/;/g, '\\;')
      .replace(/,/g, '\\,')
      .replace(/\r?\n/g, '\\n');
  }

  /* El formato no admite líneas de más de 75 octetos: se parten con un
     espacio al principio de la continuación. */
  function plegar(linea) {
    if (linea.length <= 73) return linea;
    var trozos = [linea.slice(0, 73)];
    var resto = linea.slice(73);
    while (resto.length > 72) {
      trozos.push(' ' + resto.slice(0, 72));
      resto = resto.slice(72);
    }
    if (resto.length) trozos.push(' ' + resto);
    return trozos.join('\r\n');
  }

  function aSelloUTC(fecha) {
    return fecha.toISOString().replace(/[-:]/g, '').replace(/\.\d{3}/, '');
  }

  function construirICS() {
    var inicio = new Date(texto('inicio'));
    var fin = new Date(texto('fin'));
    if (isNaN(inicio.getTime())) return null;

    var lugar = texto('lugar') + (texto('ciudad') ? ', ' + texto('ciudad') : '');
    var descripcion = 'Misa a las 11:00. Celebra el Pbro. Aurelio. ' +
                      'No habrá recepción: al terminar pasamos a tomar asiento.';

    var sitio = CFG.usuario && CFG.usuario !== 'TU_USUARIO'
      ? 'https://' + CFG.usuario + '.github.io/boda/'
      : '';

    var lineas = [
      'BEGIN:VCALENDAR',
      'VERSION:2.0',
      'PRODID:-//Invitacion boda Johann y Abril//ES',
      'CALSCALE:GREGORIAN',
      'METHOD:PUBLISH',
      'BEGIN:VEVENT',
      // Fijo a propósito: si se vuelve a agregar, el calendario actualiza
      // el evento en lugar de crear uno repetido.
      'UID:boda-johann-abril-20261022@boda',
      'DTSTAMP:' + aSelloUTC(new Date()),
      'DTSTART:' + aSelloUTC(inicio)
    ];

    if (!isNaN(fin.getTime()) && fin > inicio) {
      lineas.push('DTEND:' + aSelloUTC(fin));
    }

    lineas.push('SUMMARY:' + escaparICS(texto('titulo')));
    lineas.push('LOCATION:' + escaparICS(lugar));
    lineas.push('DESCRIPTION:' + escaparICS(descripcion));
    if (sitio) lineas.push('URL:' + sitio);

    lineas.push('END:VEVENT', 'END:VCALENDAR');

    return lineas.map(plegar).join('\r\n') + '\r\n';
  }

  function montarCalendario() {
    var boton = buscar('[data-agendar]');
    if (!boton) return;

    boton.addEventListener('click', function () {
      var ics = construirICS();
      if (!ics) {
        boton.textContent = 'La fecha no está disponible todavía';
        boton.disabled = true;
        return;
      }

      var blob = new Blob([ics], { type: 'text/calendar;charset=utf-8' });
      var url = URL.createObjectURL(blob);
      var enlace = document.createElement('a');
      enlace.href = url;
      enlace.download = 'boda-johann-y-abril.ics';
      document.body.appendChild(enlace);
      enlace.click();
      document.body.removeChild(enlace);
      setTimeout(function () { URL.revokeObjectURL(url); }, 1000);

      var aviso = buscar('[data-agenda-aviso]');
      if (!aviso) {
        aviso = document.createElement('p');
        aviso.className = 'ayuda';
        aviso.setAttribute('data-agenda-aviso', '');
        boton.parentNode.appendChild(aviso);
      }
      aviso.textContent = 'Listo. Abre el archivo que se descargó para agregarlo a tu calendario.';
    });
  }

  /* --------------------------------------------------------------------- */

  function iniciar() {
    montarMapa();
    arrancarCuenta();
    montarCalendario();
  }

  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', iniciar);
  } else {
    iniciar();
  }
})();
