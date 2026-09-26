/* Prueba el panel del resumen de Code.gs: que el cálculo coincide con la hoja,
   que el HTML sale entero y que el buscador filtra bien.

   El buscador se prueba contra un DOM de mentira, hecho a mano, porque el panel
   se dibuja dentro de un diálogo de Google que aquí no existe. Sólo implementa
   lo que el filtro usa: textContent, style.display, querySelector y rows.
   Cubre dos cosas que rompieron de verdad: una tabla sin coincidencias tapaba
   la ventana entera, y un espacio en blanco al final no encontraba a nadie. */
const fs = require('fs');
const path = require('path');
const vm = require('vm');

/* ---- hoja de mentira: lo mínimo para que resumenActual() pueda leer ---- */

const HOJAS = {
  Invitados: [
    ['codigo', 'grupo', 'miembros', 'esperados', 'max_acompanantes', 'notas'],
    ['YZ32', 'Familia Carrillo', 'Victoria Padilla, Alejandra Sanchez', 2, 2, ''],
    ['AB01', 'Sanchez Irina', 'Irina Sanchez, Luis Rojas', 2, 2, ''],
    ['CD09', 'Peña Oscar', 'Oscar Peña', 1, 2, ''],
    ['EF22', 'Familia Vega', 'Lucia Vega, Pablo Vega', 2, 2, ''],
    ['GH33', 'Ruiz Joaquin', 'Joaquin Ruiz, Ana Ruiz, Luis Ruiz', 3, 2, '']
  ],
  Respuestas: [
    ['fecha', 'codigo', 'nombres', 'asistiran', 'no_asistiran', 'total', 'acompanantes', 'mensaje'],
    [new Date(2026, 9, 2, 10, 0), 'YZ32', 'Victoria Padilla, Alejandra Sanchez',
      'Victoria Padilla, Alejandra Sanchez', '', 3, 'Roberto Alonso', ''],
    [new Date(2026, 9, 3, 18, 30), 'GH33', 'Joaquin Ruiz, Ana Ruiz, Luis Ruiz',
      'Joaquin Ruiz, Ana Ruiz, Luis Ruiz', '', 3, '', '']
  ],
  Config: [
    ['clave', 'valor'],
    ['fecha_texto', 'Jueves 22 de octubre de 2026']
  ]
};

const dosDigitos = (n) => (n < 10 ? '0' + n : '' + n);
function formatear(fecha, formato) {
  return formato
    .replace('dd', dosDigitos(fecha.getDate()))
    .replace('MM', dosDigitos(fecha.getMonth() + 1))
    .replace('yyyy', fecha.getFullYear())
    .replace('HH:mm', dosDigitos(fecha.getHours()) + ':' + dosDigitos(fecha.getMinutes()))
    .replace(/'a las'/, 'a las');
}

global.Utilities = { formatDate: (f, zona, fmt) => formatear(f, fmt) };
global.SpreadsheetApp = {
  getActiveSpreadsheet: () => ({
    getSheetByName: (nombre) => {
      const filas = HOJAS[nombre];
      if (!filas) return null;
      return {
        getLastRow: () => filas.length,
        getRange: (f, c, nf, nc) => ({
          getValues: () => {
            const out = [];
            for (let r = 0; r < nf; r++) {
              const fila = [];
              for (let i = 0; i < nc; i++) fila.push((filas[f - 1 + r] || [])[c + i - 1] || '');
              out.push(fila);
            }
            return out;
          }
        })
      };
    }
  })
};

const GS = path.join(__dirname, '..', 'gas', 'Code.gs');
vm.runInThisContext(fs.readFileSync(GS, 'utf8'), { filename: GS });

/* El cálculo, contra la hoja de mentira de arriba. */
function hojaDePrueba() {
  return resumenActual();
}

let fallos = 0, total = 0;
function igual(etiqueta, obtenido, esperado) {
  total++;
  const a = JSON.stringify(obtenido), b = JSON.stringify(esperado);
  if (a !== b) {
    fallos++;
    console.log('  FALLA  ' + etiqueta);
    console.log('         esperado: ' + b);
    console.log('         obtenido: ' + a);
  } else console.log('  ok     ' + etiqueta);
}
function cierto(etiqueta, cond) { igual(etiqueta, !!cond, true); }
function seccion(t) { console.log('\n' + t); }

const d = hojaDePrueba();

seccion('1. el cálculo del panel');
igual('5 invitaciones', d.totales.invitaciones, 5);
igual('2 confirmadas', d.totales.confirmados, 2);
igual('3 pendientes', d.totales.pendientes, 3);
igual('10 personas en la lista (2+2+1+2+3)', d.totales.personas, 10);
igual('asistirán = los que dijeron sí más los acompañantes (2+1 y 3)', d.totales.asistiran, 6);
igual('1 acompañante', d.totales.acompanantes, 1);
igual('nadie dijo que no', d.totales.noAsistiran, 0);
igual('sin decidir son los 5 de los tres que no han respondido', d.totales.sinDecidir, 5);
igual('trae la fecha de la Config', d.fechaTexto, 'Jueves 22 de octubre de 2026');
igual('los confirmados traen su momento', d.confirmaron.every(c => c.cuando !== ''), true);
igual('los pendientes dicen a quiénes esperar',
  d.sinResponder.every(s => s.nombres.length === s.personas), true);
igual('sin responder y confirmadas suman todas', d.sinResponder.length + d.confirmaron.length, 5);
igual('el acompañante va aparte de los asistentes', d.confirmaron[0].extra, ['Roberto Alonso']);

seccion('2. aColumnas rellena los huecos');
igual('de 1 a 7', aColumnas(['a'], 7), ['a', '', '', '', '', '', '']);
igual('de 7 a 7 no se toca', aColumnas([1, 2, 3, 4, 5, 6, 7], 7), [1, 2, 3, 4, 5, 6, 7]);
igual('si sobra, se recorta a 7', aColumnas([1, 2, 3, 4, 5, 6, 7, 8], 7), [1, 2, 3, 4, 5, 6, 7]);
igual('la fila vacía también', aColumnas([], 7), ['', '', '', '', '', '', '']);

seccion('3. escaparHtml');
igual('el ampersand', escaparHtml('a & b'), 'a &amp; b');
igual('los ángulos', escaparHtml('<b>x</b>'), '&lt;b&gt;x&lt;/b&gt;');
igual('las comillas', escaparHtml('"y"'), '&quot;y&quot;');
igual('el apóstrofo', escaparHtml("'"), '&#39;');
igual('aguanta null', escaparHtml(null), '');

seccion('4. el HTML sale entero');
const panel = htmlResumen();
cierto('abre y cierra <html>', /^<!DOCTYPE html>/.test(panel) && /<\/html>\s*$/.test(panel));
cierto('declara el charset', /<meta charset="utf-8">/.test(panel));
['script', 'style', 'div', 'table', 'tbody', 'h2', 'section', 'header'].forEach(function (et) {
  const abren = (panel.match(new RegExp('<' + et + '[ >]', 'g')) || []).length;
  const cierran = (panel.match(new RegExp('</' + et + '>', 'g')) || []).length;
  cierto(et + ' abre y cierra lo mismo (' + abren + ')', abren === cierran && abren > 0);
});
cierto('trae las 8 tarjetas de números', (panel.match(/class="num[ "]/g) || []).length === 8);
cierto('trae los dos bloques con section', (panel.match(/<section class="bloque"/g) || []).length === 2);
cierto('trae el buscador', /id="q"/.test(panel));
cierto('trae el aviso de sin resultados', /id="nada"/.test(panel));
cierto('el buscador quita acentos como el de la invitación',
  /normalize\("NFD"\)/.test(panel) && /\[\\u0300-\\u036f\]/.test(panel));
cierto('y quita los espacios sobrantes', /\.trim\(\)/.test(panel));
cierto('los dos encabezados con su cuenta',
  /Sin responder <em>\(3\)<\/em>/.test(panel) && /Confirmaron <em>\(2\)<\/em>/.test(panel));

seccion('5. el buscador filtra bien');
/* DOM mínimo: sólo lo que el filtro toca. */
function nodo(etiqueta, texto) {
  return {
    etiqueta, texto: texto || '', style: { display: '' }, hijos: [],
    get textContent() { return this.texto + this.hijos.map(h => h.textContent).join(''); },
    querySelector(sel) {
      if (sel !== 'tbody') return null;
      const ir = (n) => {
        if (n.etiqueta === 'tbody') return n;
        for (const h of n.hijos) { const r = ir(h); if (r) return r; }
        return null;
      };
      return ir(this);
    }
  };
}
function filaCelda() {
  const tr = nodo('tr');
  for (let i = 0; i < arguments.length; i++) tr.hijos.push(nodo('td', arguments[i]));
  return tr;
}
function bloque(filas) {
  const sec = nodo('section');
  const tb = nodo('tbody');
  tb.rows = filas;
  sec.hijos.push(nodo('h2', 'x'), tb);
  return sec;
}

const pend = bloque([
  filaCelda('YZ32', 'Familia Carrillo', '2'),
  filaCelda('AB01', 'Sanchez Irina', '3'),
  filaCelda('CD09', 'Oscar Peña', '1')
]);
const conf = bloque([
  filaCelda('EF22', 'Lucia Vega', '2'),
  filaCelda('GH33', 'Ruiz Joaquin', '4')
]);
const bloques = [pend, conf];
const campo = { value: '', addEventListener() {} };
const aviso = nodo('div');
aviso.style.display = 'none';

const filtrar = new Function('document', 'window', 'console',
  panel.match(/<script>([\s\S]*?)<\/script>/)[1] + '\nreturn filtrar;')(
  {
    getElementById: id => (id === 'q' ? campo : id === 'nada' ? aviso : null),
    querySelectorAll: sel => (sel === 'section.bloque' ? bloques : [])
  },
  {}, console
);

const visibles = (b) => b.hijos[1].rows.filter(r => r.style.display !== 'none').length;
const seVe = (b) => b.style.display !== 'none';
function buscar(termino) {
  bloques.forEach(b => {
    b.style.display = '';
    b.hijos[1].rows.forEach(r => { r.style.display = ''; });
  });
  aviso.style.display = 'none';
  campo.value = termino;
  filtrar();
}

buscar('');
igual('sin filtrar se ven las 5 filas', visibles(pend) + visibles(conf), 5);
igual('sin filtrar se ven los 2 bloques', seVe(pend) && seVe(conf), true);

buscar('sanchez');
igual('buscar sin tilde encuentra a Sanchez', visibles(pend), 1);
igual('y es la fila correcta', pend.hijos[1].rows[1].style.display, '');
igual('el bloque sin coincidencias se oculta entero', seVe(conf), false);
igual('y con una coincidencia no avisa que no hay nadie', aviso.style.display, 'none');

buscar('joaquin');
igual('encuentra a Joaquin sin tilde', visibles(conf), 1);
igual('y oculta el otro bloque', seVe(pend), false);

buscar('carrillo');
igual('busca por el nombre del grupo', visibles(pend), 1);

buscar('yz32');
igual('busca por el código', visibles(pend), 1);

buscar('zzzz');
igual('sin resultados oculta los dos bloques', seVe(pend) && seVe(conf), false);
igual('y avisa que no encontró a nadie', aviso.style.display, 'block');
igual('y no deja ninguna fila a la vista', visibles(pend) + visibles(conf), 0);

buscar('   ');
igual('unos espacios en blanco no ocultan nada', visibles(pend) + visibles(conf), 5);
igual('y no avisa que no hay nadie', aviso.style.display, 'none');

buscar('  sanchez  ');
igual('espacios alrededor del término también funcionan', visibles(pend), 1);

buscar('');
igual('volver a vacío lo muestra todo', visibles(pend) + visibles(conf), 5);
igual('y esconde el aviso', aviso.style.display, 'none');

console.log('\n' + (fallos
  ? '*** ' + fallos + ' PRUEBAS FALLIDAS de ' + total
  : 'Las ' + total + ' pruebas del panel pasaron.'));
process.exit(fallos ? 1 : 0);
