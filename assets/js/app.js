/* ==========================================================================
   app.js — la página en sí: el link del mapa, la galería y la cuenta.
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
  /* Galería                                                                */
  /* --------------------------------------------------------------------- */

  /* De qué proporción es cada foto, para que el recorte no se coma las caras.
     Se decide por el nombre del archivo: el resto entra como panorámica. */
  function claseDeFoto(src) {
    if (/iglesia/i.test(src)) return 'marco--iglesia';
    if (/pareja|nuestros/i.test(src)) return 'marco--pareja';
    return 'marco--galeria';
  }

  /* La galería es un carrusel de fotos que se arma solo: lee la lista de
     config.js (galeria). Vacía, cae a las dos fotos de la pareja, la de la
     iglesia y la de nosotros. Cada foto entra como un marco igual al de la
     ceremonia, con su propio data-foto (así montarFotos la destapa o la tapa
     sola), y el carrusel queda con su slide visible (clase .activa), su
     contador y sus botones. Soporta rutas como string o como {src, pie}. */
  function montarGaleria() {
    var cinta = buscar('[data-cinta]');
    if (!cinta) return;

    var galeria = CFG.galeria;
    var lista = Array.isArray(galeria) && galeria.length
      ? galeria
      : [texto('fotoIglesia'), texto('fotoPareja')].filter(Boolean);

    if (!lista.length) {
      var colgante = buscar('[data-galeria]');
      if (colgante) colgante.hidden = true;
      return;
    }

    lista.forEach(function (item, indice) {
      var src = typeof item === 'string' ? item : item.src;
      var pie = typeof item === 'string' ? '' : (item.pie || '');

      var figura = document.createElement('figure');
      figura.className = 'marco marco--vacio ' + claseDeFoto(src);
      figura.setAttribute('data-foto', '');

      var img = document.createElement('img');
      img.src = src;
      img.alt = pie || 'Fotografía de la boda';
      figura.appendChild(img);

      if (pie) {
        var leyenda = document.createElement('figcaption');
        leyenda.className = 'marco__pie';
        leyenda.textContent = pie;
        figura.appendChild(leyenda);
      }

      if (indice === 0) figura.classList.add('activa');
      cinta.appendChild(figura);
    });

    var total = lista.length;
    var contador = buscar('[data-contador]');
    var actual = 0;

    function mostrar(nuevo) {
      actual = (nuevo + total) % total;
      var slides = cinta.querySelectorAll('.marco');
      for (var i = 0; i < slides.length; i++) {
        slides[i].classList.toggle('activa', i === actual);
      }
      if (contador) contador.textContent = (actual + 1) + ' / ' + total;
    }

    if (contador) contador.textContent = '1 / ' + total;

    var anterior = buscar('[data-anterior]');
    var siguiente = buscar('[data-siguiente]');
    if (anterior) anterior.addEventListener('click', function () { mostrar(actual - 1); });
    if (siguiente) siguiente.addEventListener('click', function () { mostrar(actual + 1); });
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

  /* Sólo se usa para diagnosticar, y sólo si se pide con ?debug al final de la
     dirección. Muestra los números que explican por qué una página se ve a
     distinta medida en un navegador que en otro: cuánto mide la ventana real,
     qué escala le puso el navegador, y de qué tamaño quedó la letra base.

     En un móvil normal sale: escala 1, letra 16px. Si en el tuyo sale una
     escala de 0.8 o una letra de 13, eso no lo decide la página, lo decidió el
     navegador. */
  function mostrarDepuracion() {
    /* El banco de pruebas de la cuenta regresiva corre este archivo en una caja
       de arena donde no existe window.location. Sin esta guarda, el solo
       diagnóstico rompía esa prueba. */
    if (!window.location || !document.body) return;
    if (!/[?&]debug\b/.test(window.location.search)) return;

    var raiz = document.documentElement;
    var caja = document.createElement('pre');
    caja.style.cssText =
      'position:fixed;left:0;right:0;bottom:0;z-index:9999;margin:0;' +
      'padding:10px 12px;background:#111;color:#0f0;font:12px/1.5 monospace;' +
      'white-space:pre-wrap;word-break:break-word;max-height:40vh;overflow:auto';

    function pintar() {
      var vv = window.visualViewport;
      caja.textContent = [
        'ancho de la ventana: ' + raiz.clientWidth + 'px',
        'alto de la ventana:  ' + raiz.clientHeight + 'px',
        'escala del navegador: ' + (vv ? vv.scale : 'no informado') +
          (vv && Math.abs(vv.scale - 1) > 0.001 ? '  <-- el navegador esta reduciendo' : ''),
        'letra base (html): ' + window.getComputedStyle(raiz).fontSize,
        'letra del cuerpo:   ' + window.getComputedStyle(document.body).fontSize,
        'pixeles reales:     ' + window.devicePixelRatio + 'x',
        'desborde horizontal: ' + (raiz.scrollWidth > raiz.clientWidth + 1
          ? 'SI, ' + (raiz.scrollWidth - raiz.clientWidth) + 'px de mas'
          : 'no')
      ].join('\n');
    }

    document.body.appendChild(caja);
    pintar();
    /* El zoom se puede cambiar con dos dedos sin recargar, así que el cartel
       tiene que enterarse mientras se mira. */
    window.addEventListener('resize', pintar);
    if (window.visualViewport) window.visualViewport.addEventListener('resize', pintar);
  }

  function iniciar() {
    montarMapa();
    montarDireccion();
    montarTelefono();
    /* La galería se monta primero para que sus marcos tengan data-foto y
       montarFotos les ponga los oídos de load/error como a los demás. */
    montarGaleria();
    montarFotos();
    arrancarCuenta();
    mostrarDepuracion();
  }

  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', iniciar);
  } else {
    iniciar();
  }
})();
