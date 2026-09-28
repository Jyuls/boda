/* Busca en los archivos de texto letras que no deberían estar ahí.

   Pasó tres veces en este proyecto. Una traducción automática dejó "se limita"
   escrito con caracteres chinos en un comentario del CSS, y en este mismo
   trabajo se colaron un par de ideogramas y una palabra en inglés dentro de
   comentarios. Los tres son invisibles a simple vista y llegan al sitio
   publicado, así que se buscan solos.

   Se miran tres familias de escritura: la de chino y japonés, la cirílica, y la
   árabe y la devanagari. No se revisan los valores de las clases. */
const fs = require('fs');
const path = require('path');

const raiz = path.join(__dirname, '..');
const archivos = [
  'assets/css/styles.css',
  'index.html',
  'assets/js/app.js',
  'assets/js/rsvp.js',
  'assets/js/config.js',
  'assets/js/invitados.js',
  'README.md'
];

const RANGOS = {
  'chino o japones': /[\u2E80-\u9FFF\u3040-\u30FF\uAC00-\uD7AF]/,
  'cirilico': /[\u0400-\u04FF]/,
  'arabe o devanagari': /[\u0600-\u06FF\u0900-\u097F\u0E00-\u0E7F]/
};


let hallazgos = 0;

for (const rel of archivos) {
  const p = path.join(raiz, rel);
  if (!fs.existsSync(p)) continue;
  const lineas = fs.readFileSync(p, 'utf8').split('\n');

  lineas.forEach((linea, i) => {
    for (const [nombre, re] of Object.entries(RANGOS)) {
      const m = linea.match(re);
      if (m) {
        hallazgos++;
        const trozo = linea.slice(Math.max(0, m.index - 30), m.index + 30);
        console.log('  ' + rel + ':' + (i + 1) + '  [' + nombre + ']  ' + trozo.trim());
      }
    }
  });
}

console.log('');
console.log(hallazgos
  ? hallazgos + ' caractere(s) que no pertenecen al español. Revisar.'
  : 'Ningún carácter fuera del español ni inglés técnico.');
