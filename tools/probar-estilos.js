/* Comprueba dos cosas que se rompen solas cuando se cambia el CSS:
     1. que ninguna clase usada en el HTML o el JS se quede sin estilo
     2. que no queden reglas huérfanas que ya nadie usa
   Corre:  node tools/probar-estilos.js

   Sólo se ocupa del CSS de styles.css. Los <style> internos de cada página
   existen por su cuenta y no se cuentan como faltantes. */

const fs = require('fs');
const path = require('path');

const raiz = path.join(__dirname, '..');
const css = fs.readFileSync(path.join(raiz, 'assets/css/styles.css'), 'utf8');

/* Las clases tienen acentos (vacío,，油...), y \w de JavaScript es sólo
   ASCII: sin este rango, ".vacío" se leía como ".vac" y daba por hecho que
   faltaba el estilo. */
const LETRA = '[a-zA-Z\\u00C0-\\u024F]';
const NOMBRE = LETRA + '[\\w\\u00C0-\\u024F-]*';

/* Clases que existen en el CSS. */
const enCss = new Set();
for (const m of css.matchAll(new RegExp('\\.(' + NOMBRE + ')', 'g'))) enCss.add(m[1]);

/* Variables definidas y referenciadas. La declaración tiene que estar al
   principio de una línea: si no, ".boton--discreto:hover" parecería una
   variable llamada --discreto. */
const declaradas = new Set([...css.matchAll(/^\s*(--[\w-]+)\s*:/gm)].map(m => m[1]));
const referenciadas = new Set([...css.matchAll(/var\((--[\w-]+)/g)].map(m => m[1]));

const fuentes = [
  'index.html',
  'assets/js/app.js',
  'assets/js/rsvp.js',
  'tools/generar-links.html'
];

const usadas = new Set();
/* Todas las clases que se definen en un <style> dentro de una página, porque
   esas páginas se traen su propio estilo y no dependen de styles.css. */
const definidasEnLaPropiaPagina = new Set();

function agregar(cadena) {
  /* Las clases se arman por concatenación en varios lados
     ('opcion opcion--' + decision), así que una parte puede quedar pegada al
     signo. Se separa también por esos signos. */
  cadena.split(/[\s,+]+/).forEach(c => {
    const limpia = c
      .replace(new RegExp('^[^' + LETRA + '_-]+'), '')
      .replace(new RegExp('[^' + LETRA + '0-9_-]+$'), '');
    /* Un fragmento que termina en guion es la mitad de un modificador BEM
       que se completa con un += en el JS, no una clase real. */
    if (limpia && !/-$/.test(limpia)) usadas.add(limpia);
  });
}

const todoElCodigo = [];

for (const f of fuentes) {
  const t = fs.readFileSync(path.join(raiz, f), 'utf8');
  todoElCodigo.push(t);

  for (const m of t.matchAll(/<style[^>]*>([\s\S]*?)<\/style>/g)) {
    for (const s of m[1].matchAll(new RegExp('\\.(' + NOMBRE + ')', 'g'))) definidasEnLaPropiaPagina.add(s[1]);
  }

  /* class="..." en el HTML y className = '...' en el JS */
  for (const m of t.matchAll(/class="([^"]+)"/g)) agregar(m[1]);
  for (const m of t.matchAll(/className\s*=\s*'([^']+)'/g)) agregar(m[1]);

  /* el('div', 'clase') y el('p', 'clase', 'texto') */
  for (const m of t.matchAll(/el\([^,]+,\s*'([^']+)'/g)) agregar(m[1]);

  /* classList.add('clase'), .remove, .toggle */
  for (const m of t.matchAll(/classList\.\w+\(\s*'([^']+)'/g)) agregar(m[1]);

  /*_botón.className = x + ' ' + 'otra-clase' */
  for (const m of t.matchAll(/'([a-z][\w-]*(?:__|--)[\w-]+)'/g)) agregar(m[1]);
}

/* Búsqueda laxa, sólo para detectar reglas huérfanas. Las clases se arman por
   concatenación, así que "opcion--si" nunca aparece escrito entero: basta con
   que aparezca su base. */
const codigo = todoElCodigo.join('\n');

let fallos = 0;

const sinEstilo = [...usadas].filter(c => !enCss.has(c) && !definidasEnLaPropiaPagina.has(c)).sort();
if (sinEstilo.length) {
  fallos++;
  console.log('CLASES SIN ESTILO (se verían como texto pelado):');
  sinEstilo.forEach(c => console.log('  .' + c));
} else {
  console.log('ok  las ' + usadas.size + ' clases que se usan tienen estilo');
}

const huerfanas = [...enCss].filter(c => !usadas.has(c) && !codigo.includes(c.split('--')[0])).sort();
if (huerfanas.length) {
  console.log('\nreglas en el CSS que ya nadie usa:');
  huerfanas.forEach(c => console.log('  .' + c));
} else {
  console.log('ok  no hay reglas huérfanas');
}

const sinDefinir = [...referenciadas].filter(t => !declaradas.has(t)).sort();
if (sinDefinir.length) {
  fallos++;
  console.log('\nVARIABLES INDEFINIDAS (el navegador las ignora en silencio):');
  sinDefinir.forEach(t => console.log('  var(' + t + ')'));
} else {
  console.log('ok  todas las variables de color están definidas');
}

const nuncaUsadas = [...declaradas].filter(v => !referenciadas.has(v)).sort();
if (nuncaUsadas.length) {
  console.log('\nvariables declaradas y no usadas: ' + nuncaUsadas.join(', '));
}

/* --- Auditoría de las fuentes que se piden ------------------------------------
   Pedir un peso que no se usa cuesta dinero real del invitado: cada peso es un
   archivo WOFF2 de 26-36 KB que baja con datos de móvil para no verse nunca.
   Ya pasó dos veces aquí (un 500 y un Jost 300 que nadie usaba), y es el tipo
   de error que no se nota a ojo: la página se ve idéntica.

   Es una aproximación por la cascada: si una regla no dice font-weight, hereda
   el del body (400), y casi todo el texto hereda la serif del body. Se
   agrupan las reglas por familia declarada y se toman los pesos explícitos. */
const html = fs.readFileSync(path.join(raiz, 'index.html'), 'utf8');

const pedidoFonts = html.match(/fonts\.googleapis\.com\/css2\?([^"']+)/);
if (!pedidoFonts) {
  console.log('\nnote: no se encontró la petición de Google Fonts en index.html');
} else {
  const params = decodeURIComponent(pedidoFonts[1]).replace(/\+/g, ' ');

  /* Qué pesos pide cada familia, tal como los pide Google. */
  const pedidos = new Map();
  for (const parte of params.split('&')) {
    if (!parte.startsWith('family=')) continue;
    const [nombre, eje] = parte.slice(7).split(':');
    const pares = [];
    if (!eje) continue;
    for (const t of eje.split('@')[1].split(';')) {
      if (eje.startsWith('ital')) {
        const [ital, w] = t.split(',');
        pares.push([w, ital === '1' ? 'italic' : 'normal']);
      } else {
        pares.push([t, 'normal']);
      }
    }
    pedidos.set(nombre.trim(), pares);
  }

  /* Qué pesos usa el CSS, por familia. */
  const aliasDe = { "'Cormorant Infant'": 'Cormorant Infant', "'Jost'": 'Jost' };
  const usadasPor = new Map();
  for (const bloque of css.split('}')) {
    if (!bloque.includes('{')) continue;
    const cuerpo = bloque.slice(bloque.indexOf('{'));
    let familia = null;
    for (const [alias, real] of Object.entries(aliasDe)) {
      if (cuerpo.includes('--' + (alias === "'Cormorant Infant'" ? 'serif' : 'sans'))) familia = real;
    }
    /* Reglas con font-weight y sin font-family: heredan la serif del body. */
    if (!familia && !cuerpo.includes('font-family')) familia = 'Cormorant Infant';

    const peso = (cuerpo.match(/font-weight:\s*(\d+)/) || [])[1] || '400';
    const estilo = (cuerpo.match(/font-style:\s*(\w+)/) || [])[1] || 'normal';
    if (familia) {
      if (!usadasPor.has(familia)) usadasPor.set(familia, new Set());
      usadasPor.get(familia).add(peso + '/' + estilo);
    }
  }

  const deMas = [];
  for (const [familia, pares] of pedidos) {
    const usadas = usadasPor.get(familia) || new Set();
    for (const [peso, estilo] of pares) {
      if (!usadas.has(peso + '/' + estilo)) deMas.push({ familia, peso, estilo });
    }
  }

  if (deMas.length) {
    fallos++;
    console.log('\nPESOS DE FUENTE PEDIDOS Y NO USADOS (cada uno son 26-36 KB de más por invitado):');
    for (const d of deMas) console.log('  ' + d.familia + ' ' + d.peso + ' ' + d.estilo);
  } else {
    const n = [...pedidos.values()].reduce((a, p) => a + p.length, 0);
    console.log('ok  los ' + n + ' pesos de fuente que se piden son los que el CSS usa');
  }
}

console.log(fallos ? '\n*** hay ' + fallos + ' problema(s)' : '\nTodo en orden.');
process.exit(fallos ? 1 : 0);
