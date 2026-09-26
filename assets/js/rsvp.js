/* ==========================================================================
   rsvp.js — la tarjeta de respuesta.

   Dos entornos distintos y hay que entenderlos:

   1. Si el invitado abre la invitación con su código (#A7K2), la tarjeta
      aparece con los nombres ya puestos y sólo tiene que marcar quién sí va.

   2. Si abre la página sin código, aparece un buscador para que encuentre
      su nombre. Nadie se queda afuera de la invitación.

   Sobre el envío: la escritura al spreadsheet se hace en modo "no-cors",
   porque Apps Script no devuelve cabeceras CORS. Consecuencia honesta: el
   navegador entrega la petición pero no puede leer la respuesta, así que no
   podemos confirmar con el servidor que la recepción se guardó. Por eso la
   respuesta se copia primero al dispositivo. Si algo falla, el invitado
   tiene el texto para mandarlo por WhatsApp y no se pierde nada.
   ========================================================================== */

(function () {
  'use strict';

  var CFG = window.CONFIG || {};
  var INVITADOS = window.INVITADOS || [];
  var RAIZ = document.querySelector('[data-rsvp]');

  var CLAVE_ALMACEN = 'boda.respuestas';

  /* --------------------------------------------------------------------- */
  /* Utilidades                                                             */
  /* --------------------------------------------------------------------- */

  function el(tag, clase, contenido) {
    var nodo = document.createElement(tag);
    if (clase) nodo.className = clase;
    if (contenido !== undefined && contenido !== null) nodo.textContent = contenido;
    return nodo;
  }

  function vaciar(nodo) { while (nodo.firstChild) nodo.removeChild(nodo.firstChild); }

  /* Buscar "sanchez" tiene que encontrar a "Sánchez". Con la lista real llena
     de acentos y diéresis esto no es un detalle: si alguien lo escribe sin la
     tilde y no aparece, conclude que no está invitado. */
  function normalizar(valor) {
    return String(valor)
      .normalize('NFD')
      .replace(/[\u0300-\u036f]/g, '')
      .toLowerCase()
      .trim();
  }

  function codigoDeUrl() {
    return (window.location.hash || '').replace(/^#/, '').trim().toUpperCase();
  }

  function grupoPorCodigo(codigo) {
    for (var i = 0; i < INVITADOS.length; i++) {
      if (String(INVITADOS[i].codigo).toUpperCase() === codigo) return INVITADOS[i];
    }
    return null;
  }

  function respuestasGuardadas() {
    try { return JSON.parse(localStorage.getItem(CLAVE_ALMACEN) || '{}'); }
    catch (e) { return {}; }
  }

  function guardarRespuesta(codigo, datos) {
    try {
      var todas = respuestasGuardadas();
      todas[codigo] = datos;
      localStorage.setItem(CLAVE_ALMACEN, JSON.stringify(todas));
    } catch (e) { /* modo privado o cuota llena: no es grave */ }
  }

  function copiar(texto) {
    if (navigator.clipboard && navigator.clipboard.writeText) {
      return navigator.clipboard.writeText(texto);
    }
    var area = document.createElement('textarea');
    area.value = texto;
    area.style.position = 'fixed';
    area.style.left = '-9999px';
    document.body.appendChild(area);
    area.select();
    try { document.execCommand('copy'); } catch (e) { /* nada */ }
    document.body.removeChild(area);
    return Promise.resolve();
  }

  /* --------------------------------------------------------------------- */
  /* Pantalla: el buscador (invitado sin código)                            */
  /* --------------------------------------------------------------------- */

  function pintarBuscador() {
    vaciar(RAIZ);

    var dedicatoria = el('p', 'tarjeta__dedicatoria', 'Tu invitación es personal, pero si llegaste aquí sin el enlace puedes buscar tu nombre.');
    RAIZ.appendChild(dedicatoria);

    var lista = el('ul', 'buscador');
    lista.style.listStyle = 'none';
    lista.style.margin = '1.4rem 0 0';
    lista.style.padding = '0';
    RAIZ.appendChild(lista);

    function coincidentes() {
      vaciar(lista);
      var termino = normalizar(campo.value);
      if (termino.length < 2) return;

      var encontrados = INVITADOS.filter(function (inv) {
        if (normalizar(inv.grupo).indexOf(termino) !== -1) return true;
        return (inv.miembros || []).some(function (m) {
          return normalizar(m).indexOf(termino) !== -1;
        });
      }).slice(0, 8);

      if (!encontrados.length) {
        lista.appendChild(el('li', 'ayuda', 'No encontramos ese nombre. Revisa cómo está escrito.'));
        return;
      }

      encontrados.forEach(function (inv) {
        var item = el('li');
        item.style.borderBottom = 'var(--filete-suave)';

        var boton = el('button', 'opcion', inv.grupo);
        boton.type = 'button';
        boton.style.cssText = 'width:100%;text-align:left;border:0;opacity:1;padding:.8rem .2rem;font-size:1.05rem;font-family:var(--serif)';
        boton.addEventListener('click', function () {
          window.location.hash = inv.codigo;
          pintarTarjeta(inv);
        });

        item.appendChild(boton);
        lista.appendChild(item);
      });
    }

    var campo = el('input', 'campo');
    campo.type = 'search';
    campo.placeholder = 'Escribe tu nombre';
    campo.setAttribute('aria-label', 'Buscar tu nombre en la lista de invitados');
    campo.addEventListener('input', coincidentes);

    var envoltorio = el('div');
    envoltorio.appendChild(el('p', 'campo__titulo', 'Tu nombre'));
    envoltorio.appendChild(campo);
    RAIZ.appendChild(envoltorio);

    if (!INVITADOS.length) {
      RAIZ.appendChild(el('p', 'ayuda', 'La lista de invitados todavía no está cargada.'));
    }
  }

  /* --------------------------------------------------------------------- */
  /* Pantalla: la tarjeta de respuesta                                       */
  /* --------------------------------------------------------------------- */

  function pintarTarjeta(grupo) {
    vaciar(RAIZ);

    var guardada = respuestasGuardadas()[grupo.codigo];
    /* La variable de las respuestas vive en español, como todo lo demás del
       archivo. Antes se declaraba "decisions" pero los handlers usaban
       "decisiones", y eso reventaba con ReferenceError en el primer clic:
       el Sí/No no se marcaba y el botón de enviar no hacía nada. Todo el
       formulario quedaba muerto sin que se viera ningún error en pantalla. */
    var decisiones = {};
    if (guardada) {
      (guardada.asistiran || []).forEach(function (n) { decisiones[n] = 'si'; });
      (guardada.no_asistiran || []).forEach(function (n) { decisiones[n] = 'no'; });
    }

    RAIZ.appendChild(el('p', 'tarjeta__dedicatoria', 'Invitación para'));
    RAIZ.appendChild(el('h3', 'tarjeta__grupo', grupo.grupo));

    /* --- una fila por persona: Sí / No, sin casillas de cuadradito --- */
    (grupo.miembros || []).forEach(function (nombre) {
      var fila = el('div', 'fila');
      fila.appendChild(el('span', 'fila__nombre', nombre));

      var opciones = el('div', 'fila__opciones');

      ['si', 'no'].forEach(function (valor) {
        var boton = el('button', 'opcion opcion--' + valor, valor === 'si' ? 'Sí' : 'No');
        boton.type = 'button';
        boton.setAttribute('aria-pressed', decisiones[nombre] === valor ? 'true' : 'false');

        boton.addEventListener('click', function () {
          decisiones[nombre] = valor;
          opciones.querySelectorAll('.opcion').forEach(function (b) {
            b.setAttribute('aria-pressed', 'false');
          });
          boton.setAttribute('aria-pressed', 'true');
        });

        opciones.appendChild(boton);
      });

      fila.appendChild(opciones);
      RAIZ.appendChild(fila);
    });

    /* Ya no se pregunta por acompañantes. La columna sigue existiendo en la
       hoja de respuestas y el backend la sigue leyendo: lo que se quitó es
       sólo el formulario, para no obligar a la gente a tabular un nombre
       suelto que después nadie controlaba. */

    /* --- mensaje --- */
    var mensaje = el('div', 'mensaje');
    var area = el('textarea', 'mensaje__campo');
    area.rows = 2;
    area.placeholder = 'Un mensaje para los novios (opcional)';
    area.setAttribute('data-mensaje', '');
    if (guardada && guardada.mensaje) area.value = guardada.mensaje;
    mensaje.appendChild(area);
    RAIZ.appendChild(mensaje);

    /* --- trampa para bots --- */
    var trampa = el('input', 'trampa');
    trampa.type = 'text';
    trampa.name = 'sitio_web';
    trampa.tabIndex = -1;
    trampa.setAttribute('autocomplete', 'off');
    trampa.setAttribute('data-trampa', '');
    RAIZ.appendChild(trampa);

    /* --- pie --- */
    var pie = el('div', 'tarjeta__pie');
    var enviar = el('button', 'boton', guardada ? 'Guardar el cambio' : 'Confirmar asistencia');
    enviar.type = 'button';
    enviar.setAttribute('data-enviar', '');
    pie.appendChild(enviar);
    RAIZ.appendChild(pie);

    /* Nace vacío y sólo se llena si hay algo que avisar (por ahora, que
       falte alguien por decidir). Con :empty en el CSS, vacío no ocupa sitio. */
    var ayuda = el('p', 'ayuda');
    RAIZ.appendChild(ayuda);

    enviar.addEventListener('click', function () {
      var sinDecidir = (grupo.miembros || []).filter(function (n) { return !decisiones[n]; });

      if (sinDecidir.length) {
        ayuda.textContent = 'Falta decidir por ' + sinDecidir.length +
          (sinDecidir.length === 1 ? ' persona' : ' personas') + ': ' + sinDecidir.join(', ') + '.';
        ayuda.style.opacity = '1';
        return;
      }

      var datos = {
        codigo: grupo.codigo,
        grupo: grupo.grupo,
        asistiran: (grupo.miembros || []).filter(function (n) { return decisiones[n] === 'si'; }),
        no_asistiran: (grupo.miembros || []).filter(function (n) { return decisiones[n] === 'no'; }),
        /* Siempre vacío: ya no hay campo que lo llene, pero la hoja sigue
           teniendo la columna y el backend la sigue esperando. */
        acompanantes: [],
        mensaje: area.value.trim().slice(0, 500)
      };

      if (trampa.value) { pintarConfirmacion(grupo, datos, 'silencio'); return; }

      enviar.disabled = true;
      enviar.textContent = 'Enviando…';
      guardarRespuesta(grupo.codigo, datos);
      mandar(datos).then(function (estado) {
        pintarConfirmacion(grupo, datos, estado);
      });
    });
  }

  /* --------------------------------------------------------------------- */
  /* Envío                                                                   */
  /* --------------------------------------------------------------------- */

  /* Devuelve 'enviado', 'fallo' o 'sin-configurar'. Antes devolvía true
     cuando no había urlScript, y la pantalla decía "quedó registrada"
     sin haber mandado nada. Con 'no-cors' tampoco podemos saber si la fila
     se escribió: asumimos que sí, pero nunca affirmamos más de lo que sabemos. */
  function mandar(datos) {
    if (!CFG.urlScript) return Promise.resolve('sin-configurar');

    var carga = JSON.stringify(datos);

    return fetch(CFG.urlScript, {
      method: 'POST',
      mode: 'no-cors',
      headers: { 'Content-Type': 'text/plain;charset=UTF-8' },
      body: carga,
      keepalive: true
    }).then(function () { return 'enviado'; })
      .catch(function () { return 'fallo'; });
  }

  /* --------------------------------------------------------------------- */
  /* Pantalla: confirmación                                                  */
  /* --------------------------------------------------------------------- */

  function textoRespaldo(datos) {
    return 'Confirmación de asistencia — boda Abril y Johann\n\n' +
      'Invitación: ' + datos.grupo + '\n' +
      'Sí asisten: ' + (datos.asistiran.join(', ') || '—') + '\n' +
      'No asisten: ' + (datos.no_asistiran.join(', ') || '—') + '\n' +
      (datos.mensaje ? 'Mensaje: ' + datos.mensaje + '\n' : '');
  }

  function pintarConfirmacion(grupo, datos, estado) {
    vaciar(RAIZ);

    var caja = el('div', 'tarjeta__hecho');

    /* Los dos estados en los que no sabemos si la fila llegó al Sheet
       comparten el mismo tratamiento: no confirmar en falso y ofrecer el
       texto para mandarlo por WhatsApp. */
    if (estado === 'fallo' || estado === 'sin-configurar') {
      var sinScript = estado === 'sin-configurar';

      caja.appendChild(el('h3', 'tarjeta__hecho-titulo',
        sinScript ? 'Guardada, pero no llegó' : 'Guardada aquí'));

      caja.appendChild(el('p', 'tarjeta__hecho-texto', sinScript
        ? 'Esta página todavía no está conectada a la hoja de confirmaciones, así que tu respuesta no salió del dispositivo. Copiala y envíanosla por WhatsApp para anotarla.'
        : 'No pudimos mandarla desde esta página, pero no se perdió: quedó guardada en este dispositivo. Cópiala y envíanosla por WhatsApp para anotarla.'));

      var botonCopiar = el('button', 'boton boton--discreto', 'Copiar mi confirmación');
      botonCopiar.type = 'button';
      botonCopiar.style.marginTop = '1.3rem';
      botonCopiar.addEventListener('click', function () {
        copiar(textoRespaldo(datos)).then(function () {
          botonCopiar.textContent = 'Copiado. Ya puedes pegarlo en WhatsApp.';
        });
      });
      caja.appendChild(botonCopiar);

    } else {
      var asistio = datos.asistiran.length > 0;
      caja.appendChild(el('h3', 'tarjeta__hecho-titulo',
        asistio ? 'Nos vemos el 22' : 'Gracias por avisar'));

      caja.appendChild(el('p', 'tarjeta__hecho-texto', asistio
        ? 'Guardamos tu respuesta. Te esperamos a las once en la Parroquia San Ignacio de Loyola.'
        : 'Lamentamos que no puedas acompañarnos. Gracias por avisarnos con tiempo.'));

      var resumen = el('dl', 'tarjeta__hecho-cuadro');
      function par(clave, valor) {
        if (!valor) return;
        resumen.appendChild(el('dt', null, clave));
        resumen.appendChild(el('dd', null, valor));
      }
      par('Van', datos.asistiran.join(', '));
      par('No van', datos.no_asistiran.join(', '));
      if (resumen.childNodes.length) caja.appendChild(resumen);
    }

    var volver = el('button', 'reintentar', 'Cambiar mi respuesta');
    volver.type = 'button';
    volver.addEventListener('click', function () { pintarTarjeta(grupo); });
    caja.appendChild(volver);

    RAIZ.appendChild(caja);
  }

  /* --------------------------------------------------------------------- */

  function iniciar() {
    if (!RAIZ) return;

    if (!INVITADOS.length) {
      vaciar(RAIZ);
      RAIZ.appendChild(el('p', 'tarjeta__cargando', 'La lista de invitados todavía no está cargada.'));
      return;
    }

    function resolver() {
      var codigo = codigoDeUrl();
      var grupo = codigo ? grupoPorCodigo(codigo) : null;
      var guardada = codigo ? respuestasGuardadas()[codigo] : null;

      if (grupo && guardada) pintarConfirmacion(grupo, guardada, 'ok');
      else if (grupo) pintarTarjeta(grupo);
      else pintarBuscador();
    }

    resolver();
    window.addEventListener('hashchange', resolver);
  }

  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', iniciar);
  } else {
    iniciar();
  }
})();
