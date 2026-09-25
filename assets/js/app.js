/* ==========================================================================
   app.js — la página en sí: el link del mapa y la cuenta regresiva.
   Nada de esto habla con un servidor.
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

  function iniciar() {
    montarMapa();
    arrancarCuenta();
  }

  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', iniciar);
  } else {
    iniciar();
  }
})();
