const fs = require('fs');
let s = fs.readFileSync('C:/Users/elegi/Desktop/projects/boda/assets/js/app.js', 'utf8');

// Carrusel: mostrar varias fotos (más compacto, estable)
s = s.replace(/var rot = d \* 45;/g, 'var rot = d * 24;');
s = s.replace(/var desfX = d \* 60;/g, 'var desfX = d * 36;');
s = s.replace(/var desfZ = -ad \* 150;/g, 'var desfZ = -ad * 80;');
s = s.replace(/esc = 1 - ad \* 0.15;/g, 'esc = 1 - ad * 0.08;');
s = s.replace(/o = Math.max\(0, 1 - ad \* 0.25\);/g, 'o = Math.max(0, 0.92 - ad * 0.1);');

// Autoplay suave
const autoplay = `
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
`;
if (!s.includes('iniciarAutoplay')) {
  s = s.replace('iniciar();', 'iniciar(); iniciarAutoplay();');
  s = s.slice(0, s.lastIndexOf('})();')) + autoplay + '\n})();';
}
fs.writeFileSync('C:/Users/elegi/Desktop/projects/boda/assets/js/app.js', s);
console.log('ok');