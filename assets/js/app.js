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
  /* Dirección y teléfono                                                    */
  /* --------------------------------------------------------------------- */

  /* La dirección se escribe en config.js y se pinta acá, para que corregirla
     no obligue a andar tocando el HTML. */
  function montarDireccion() {
    var linea = {
      lugar: texto('lugar'),
      direccion: texto('direccion'),
      colonia: texto('colonia'),
      cp: texto('cp'),
      ciudad: texto('ciudadCorta')
    };
    Object.keys(linea).forEach(function (clave) {
      var destino = buscar('[data-' + clave + ']');
      if (destino) destino.textContent = linea[clave];
    });
  }

  function montarTelefono() {
    var enlace = buscar('[data-telefono]');
    if (!enlace) return;
    var numero = texto('telefono').replace(/[^\d+]/g, '');
    if (!numero) { enlace.hidden = true; return; }
    enlace.href = 'tel:' + numero;
  }

  /* --------------------------------------------------------------------- */
  /* Fotos opcionales                                                        */
  /* --------------------------------------------------------------------- */

  /* Cada <figure data-foto> trae su <img>. El HTML lo marca con
     "marco--vacio", que esconde la imagen y muestra la leyenda. Si el archivo
     existe, la imagen se destapa y la leyenda se va; si no existe, se queda
     como está y el invitado no ve ningún cuadrito roto.

     El atributo `error` es el que hace toda la diferencia: es lo único que
     avisa que la foto no está. Sin él, el marco quedaría medio vacío con un
     ícono de imagen rota. */
  function montarFotos() {
    var marcos = document.querySelectorAll('[data-foto]');
    for (var i = 0; i < marcos.length; i++) {
      (function (marco) {
        var img = marco.querySelector('img');
        if (!img) return;

        img.addEventListener('load', function () {
          marco.classList.remove('marco--vacio');
        });

        /* Y al revés: si la foto falla DESPUÉS de haber cargado, hay que volver
           a taparla. Pasa de verdad — se cae el dato en el celular a media
           carga, o el navegador vuelve a pedir la imagen — y sin esto el marco
           se queda con el ícono de imagen rota a la vista. */
        img.addEventListener('error', function () {
          marco.classList.add('marco--vacio');
        });

        /* Si la imagen ya había llegado desde el caché, "load" no vuelve a
           dispararse: hay que mirar cómo quedó. Y lo mismo con una que ya
           había fallado: `complete` es true en los dos casos y lo que los
           distingue es si tiene píxeles. */
        if (img.complete) {
          if (img.naturalWidth > 0) {
            marco.classList.remove('marco--vacio');
          } else {
            marco.classList.add('marco--vacio');
          }
        }
      })(marcos[i]);
    }
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
    montarDireccion();
    montarTelefono();
    montarFotos();
    arrancarCuenta();
  }

  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', iniciar);
  } else {
    iniciar();
  }
})();
