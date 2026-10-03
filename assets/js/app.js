/* ============================================================
   CLON FASE 1 — Minimalism Dark Blue (demo ChungDoi)
   Interacciones: sobre de apertura, galería, countdown,
   guestbook, regalo, visor de fotos.
   ============================================================ */
(function () {
  'use strict';

  /* ---------- Datos del demo ---------- */
  var FOTOS = [
    'assets/img/fotos/foto1.webp',
    'assets/img/fotos/foto3.webp',
    'assets/img/fotos/foto4.webp',
    'assets/img/fotos/foto5.webp',
    'assets/img/fotos/foto6.webp',
    'assets/img/fotos/foto7.webp',
    'assets/img/fotos/foto2.webp',
    'assets/img/fotos/foto8.webp',
    'assets/img/fotos/foto9.webp'
  ];

  var MENSAJES_SEMILLA = [
    ['Rashid Al Nuaimi', '1/7/2027, 1:00:00 AM', 'Here is to a lifetime of shared jokes nobody else will ever understand.'],
    ['Thandiwe Dube', '1/8/2027, 2:00:00 AM', 'Congratulations. We could not be happier to stand with you today.'],
    ['Oliver Bennett', '1/9/2027, 3:00:00 AM', 'May your love be steady, your friends be loud and your table be full.'],
    ['Camila Duarte', '1/10/2027, 4:00:00 AM', 'Wishing you both a marriage that keeps surprising you.'],
    ['Samuel Adjei', '1/11/2027, 5:00:00 AM', 'To a couple worth celebrating, today and for a very long time yet.'],
    ['Freya Lindqvist', '1/12/2027, 6:00:00 AM', 'May you always come home to each other, wherever home turns out to be.'],
    ['Nadia Farouk', '1/13/2027, 7:00:00 AM', 'Congratulations. Thank you for the joy of watching this happen.'],
    ['Ethan Clarke', '1/14/2027, 8:00:00 AM', 'Wishing you every good thing, in the order you most need it.'],
    ['Isabella Ramos', '1/15/2027, 9:00:00 AM', 'To two people who are better together. Congratulations on making it official.'],
    ['Kofi Boateng', '1/16/2027, 10:00:00 AM', 'May your years be many and your worries be few. Congratulations to you both.']
  ];

  var CLAVE_GUESTBOOK = 'boda_guestbook_minimalism_demo';
  var FECHA_BODA = new Date(2026, 9, 22, 13, 0, 0); // 22 de octubre de 2026 1:00 p.m.

  var $ = function (sel, ctx) { return (ctx || document).querySelector(sel); };
  var $$ = function (sel, ctx) { return Array.prototype.slice.call((ctx || document).querySelectorAll(sel)); };
  var guardarEn = function (key, val) { try { localStorage.setItem(key, JSON.stringify(val)); } catch (e) {} };
  var leerDe = function (key, def) { try { var v = localStorage.getItem(key); return v ? JSON.parse(v) : def; } catch (e) { return def; } };

  /* ============================================================
     1. SOBRE DE APERTURA
     ============================================================ */
  var sobre = $('#sobre');
  var sobreCard = $('#sobre-card');
  var btnOpen = $('#btn-open');

  function invitadoDeUrl() {
    var urlParams = new URLSearchParams(window.location.search);
    var codigo = urlParams.get('code') || (window.location.hash || '').slice(1);
    if (!codigo || !Array.isArray(window.INVITADOS)) return null;

    codigo = codigo.trim().toUpperCase();
    return window.INVITADOS.find(function (invitado) {
      return String(invitado.codigo).toUpperCase() === codigo;
    }) || null;
  }

  var grupoInvitado = invitadoDeUrl();
  if (grupoInvitado) {
    $('.sobre-chip').textContent = grupoInvitado.grupo || '';
  }

  function marcarSobreAbierto() {
    var url = new URL(window.location.href);
    url.searchParams.set('open', '1');
    history.replaceState(null, '', url.pathname + url.search + url.hash);
  }

  function bloquearScroll(bloquear) {
    document.body.style.overflow = bloquear ? 'hidden' : '';
  }

  function abrirInvitacion() {
    if (!sobre) return;

    if (!grupoInvitado) {
      sobreCard.classList.add('salir');
      setTimeout(function () {
        sobre.classList.add('abierto');
        bloquearScroll(false);
      }, 650);
      setTimeout(function () {
        sobre.style.display = 'none';
      }, 1300);
      marcarSobreAbierto();
      return;
    }

    // Partículas al abrir
    var colores = ['#f97316', '#b58b2f', '#ece4d8', '#e3cbb4', '#facc21'];
    for (var i = 0; i < 14; i++) {
      var p = document.createElement('span');
      p.className = 'particula';
      var ang = (Math.PI * 2 * i) / 14 + Math.random() * 0.5;
      var dist = 60 + Math.random() * 110;
      p.style.setProperty('--dx', Math.cos(ang) * dist + 'px');
      p.style.setProperty('--dy', (Math.sin(ang) * dist - 40) + 'px');
      p.style.background = colores[i % colores.length];
      sobre.appendChild(p);
    }

    setTimeout(function () {
      sobre.classList.add('abierto');
      bloquearScroll(false);
    }, 650);
    setTimeout(function () {
      sobre.style.display = 'none';
    }, 1300);

    marcarSobreAbierto();
  }

  function iniciarSobre() {
    var yaAbierto = /(?:^|[?&])open=1(?=&|$)/.test(window.location.search);
    if (yaAbierto) {
      sobre.style.display = 'none';
      return;
    }
    bloquearScroll(true);
    btnOpen.addEventListener('click', function (e) {
      e.preventDefault();
      abrirInvitacion();
    });
  }

  /* ============================================================
     2. GALERÍA (carrusel 3D "cards" + visor)
     ============================================================ */
  var escena = $('#escena');
  var contador = $('#galeria-contador');
  var indiceActual = 0;
  var slides = [];

  function construirGaleria() {
    if (!escena) return;
    FOTOS.forEach(function (src, i) {
      var d = document.createElement('div');
      d.className = 'gslide';
      d.setAttribute('data-i', i);
      var img = document.createElement('img');
      img.src = src;
      img.alt = 'Wedding photo ' + (i + 1);
      img.draggable = false;
      d.appendChild(img);
      escena.appendChild(d);
      slides.push(d);
    });
    pintarGaleria();
    escena.addEventListener('click', function (e) {
      var g = e.target.closest ? e.target.closest('.gslide') : null;
      if (!g) return;
      var i = parseInt(g.getAttribute('data-i'), 10);
      if (i === indiceActual) { abrirVisor(i); }
      else { irA(i); }
    });
  }

  function posicionDe(slide) {
    var i = parseInt(slide.getAttribute('data-i'), 10);
    var d = (i - indiceActual + FOTOS.length) % FOTOS.length;
    if (d > 4) d -= FOTOS.length;
    return d;
  }

  function pintarGaleria() {
    slides.forEach(function (g) {
      var d = posicionDe(g);
      var ad = Math.abs(d);
      var t, o, z, pe;
      if (ad >= 4) {
        t = '';
        o = 0;
        z = 0;
        g.style.pointerEvents = 'none';
        g.style.visibility = 'hidden';
      } else {
        var rot = d * 24;
        var esc = 1 - ad * 0.08;
        var desfX = d * 36;
        var desfZ = -ad * 80;
        t = 'translateX(' + desfX + '%) translateZ(' + desfZ + 'px) rotateY(' + rot + 'deg) scale(' + esc + ')';
        o = Math.max(0, 0.92 - ad * 0.1);
        z = 100 - ad;
        g.style.pointerEvents = 'auto';
        g.style.visibility = 'visible';
      }
      g.style.transform = t;
      g.style.opacity = o;
      g.style.zIndex = z;
    });
    if (contador) contador.textContent = (indiceActual + 1) + ' / ' + FOTOS.length;
  }

  function irA(i) {
    indiceActual = (i + FOTOS.length) % FOTOS.length;
    pintarGaleria();
  }

  var flechaPrev = $('.flecha.prev');
  var flechaNext = $('.flecha.next');
  if (flechaPrev) flechaPrev.addEventListener('click', function () { irA(indiceActual - 1); });
  if (flechaNext) flechaNext.addEventListener('click', function () { irA(indiceActual + 1); });

  /* ----- Visor ----- */
  var visor = $('#visor');
  var visorImg = $('#visor-img');
  var visorContador = $('#visor-contador');
  var visorThumbs = $('#visor-thumbs');

  function abrirDialog(dlg) {
    if (!dlg) return;
    try { dlg.showModal(); } catch (e) { dlg.setAttribute('open', ''); }
  }
  function cerrarDialog(dlg) {
    if (!dlg) return;
    try { dlg.close(); } catch (e) { dlg.removeAttribute('open'); }
  }

  function pintarVisor() {
    visorImg.src = FOTOS[indiceActual];
    visorContador.textContent = (indiceActual + 1) + ' / ' + FOTOS.length;
    $$('button', visorThumbs).forEach(function (b) {
      b.classList.toggle('activo', parseInt(b.dataset.i, 10) === indiceActual);
    });
  }
  function abrirVisor(i) {
    indiceActual = i;
    pintarVisor();
    abrirDialog(visor);
  }
  function construirThumbs() {
    if (!visorThumbs) return;
    FOTOS.forEach(function (src, i) {
      var b = document.createElement('button');
      b.dataset.i = i;
      b.setAttribute('aria-label', 'Ver foto ' + (i + 1));
      var img = document.createElement('img');
      img.src = src;
      img.alt = 'Thumbnail ' + (i + 1);
      img.draggable = false;
      b.appendChild(img);
      b.addEventListener('click', function () { irA(i); pintarVisor(); });
      visorThumbs.appendChild(b);
    });
  }
  if (visor) {
    construirThumbs();
    $('#visor-cerrar').addEventListener('click', function () { cerrarDialog(visor); });
    $('#visor-prev').addEventListener('click', function () { irA(indiceActual - 1); pintarVisor(); });
    $('#visor-next').addEventListener('click', function () { irA(indiceActual + 1); pintarVisor(); });
    visor.addEventListener('click', function (e) { if (e.target === visor) cerrarDialog(visor); });
  }

  /* ============================================================
     3. COUNTDOWN
     ============================================================ */
  function pintarCountdown() {
    var el = $('#countdown');
    if (!el) return;
    var ahora = new Date();
    var diff = FECHA_BODA - ahora;
    if (diff <= 0) { el.textContent = '¡Llegó el gran día!'; return; }
    var d = Math.floor(diff / 86400000);
    var h = Math.floor((diff % 86400000) / 3600000);
    var m = Math.floor((diff % 3600000) / 60000);
    var s = Math.floor((diff % 60000) / 1000);
    el.textContent = d + ' días ' + h + ' horas ' + m + ' min ' + s + ' seg';
  }

  /* ============================================================
     4. GUESTBOOK
     ============================================================ */
  var mensajesEl = $('#mensajes');
  var forma = $('#forma-wishes');
  var inputNombre = $('#gb-nombre');
  var inputMensaje = $('#gb-mensaje');

  function mensajesGuardados() {
    var extras = leerDe(CLAVE_GUESTBOOK, []);
    return MENSAJES_SEMILLA.map(function (m) {
      return { nombre: m[0], fecha: m[1], texto: m[2], semilla: true };
    }).concat(extras);
  }

  function renderMensajes() {
    if (!mensajesEl) return;
    mensajesEl.innerHTML = '';
    mensajesGuardados().forEach(function (m) {
      var d = document.createElement('div');
      d.className = 'mensaje';
      var cabeza = document.createElement('div');
      cabeza.className = 'cabeza';
      var nom = document.createElement('span');
      nom.className = 'nombre';
      nom.textContent = m.nombre;
      var fecha = document.createElement('span');
      fecha.className = 'fecha';
      fecha.textContent = m.fecha;
      cabeza.appendChild(nom);
      cabeza.appendChild(fecha);
      var p = document.createElement('p');
      p.textContent = m.texto;
      d.appendChild(cabeza);
      d.appendChild(p);
      mensajesEl.appendChild(d);
    });
  }

  function fechaAhora() {
    return new Date().toLocaleString('en-US', {
      year: 'numeric', month: 'numeric', day: 'numeric',
      hour: 'numeric', minute: '2-digit', second: '2-digit', hour12: true
    });
  }

  if (forma) {
    forma.addEventListener('submit', function (e) {
      e.preventDefault();
      var nombre = (inputNombre.value || '').trim();
      var texto = (inputMensaje.value || '').trim();
      if (!nombre || !texto) { inputNombre.focus(); return; }
      var extras = leerDe(CLAVE_GUESTBOOK, []);
      extras.unshift({ nombre: nombre, fecha: fechaAhora(), texto: texto });
      guardarEn(CLAVE_GUESTBOOK, extras);
      inputMensaje.value = '';
      renderMensajes();
    });
  }

  /* ============================================================
     ARRANQUE
     ============================================================ */
  function iniciar() {
    iniciarSobre();
    construirGaleria();
    pintarCountdown();
    setInterval(pintarCountdown, 1000);
    renderMensajes();
  }

  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', iniciar);
  } else {
    iniciar(); iniciarAutoplay();
  }

  var autoplayId = null;
  function detenerAutoplay() {
    if (autoplayId) { clearInterval(autoplayId); autoplayId = null; }
  }
  function iniciarAutoplay() {
    detenerAutoplay();
    autoplayId = setInterval(function(){ irA(indiceActual + 1); pintarGaleria(); pintarVisor(); }, 8000);
  }
  ['escena','flecha-prev','flecha-next','visor'].forEach(function(id){
    var el = document.getElementById(id) || (id==='flecha-prev'?$('.flecha.prev'): (id==='flecha-next'?$('.flecha.next'):null));
  });
  if (escena) { escena.addEventListener('mouseenter', detenerAutoplay); escena.addEventListener('mouseleave', iniciarAutoplay); escena.addEventListener('touchstart', detenerAutoplay); escena.addEventListener('touchend', function(){ setTimeout(iniciarAutoplay, 1200); }); }
  document.addEventListener('visibilitychange', function(){ if (document.hidden) detenerAutoplay(); else iniciarAutoplay(); });
  iniciarAutoplay();

})();