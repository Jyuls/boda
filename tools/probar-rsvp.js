/* Corre las pruebas de comportamiento del formulario RSVP en un navegador de
   verdad y reporta el resultado.

   Estas pruebas no son un extra: el formulario estuvo roto por completo (el
   "Sí" no se marcaba y "Confirmar asistencia" no hacía nada, por un
   ReferenceError que sólo aparecía en la consola) y ninguna de las otras 72
   pruebas lo notó, porque ninguna aprieta un botón.

   Uso:  node tools/probar-rsvp.js
   (necesita el servidor local: python -m http.server 8000)  */

const { execFileSync } = require('child_process');
const fs = require('fs');
const os = require('os');
const path = require('path');

const EDGE = 'C:\\Program Files (x86)\\Microsoft\\Edge\\Application\\msedge.exe';
const PUERTO = process.env.PUERTO || '8000';

if (!fs.existsSync(EDGE)) {
  console.log('No encontré Edge en:\n  ' + EDGE);
  process.exit(2);
}

const perfil = path.join(os.tmpdir(), 'boda-pruebas-rsvp');

/* El perfil se borra antes de cada corrida. No es mania de limpiar: el
   cache-buster que se le pone a la URL de la invitación sólo invalida el
   HTML, no los <script> y los <link> que ese HTML pide. Con el perfil
   guardado, el navegador servía un rsvp.js viejo y las pruebas daban un
   resultado falso: se llegó a "pasar" una prueba con la lista de los que
   dijeron que sí invertida, porque lo que se estaba midiendo era el código
   de la corrida anterior. */
fs.rmSync(perfil, { recursive: true, force: true });

let dom = '';
try {
  /* utf8 y no latin1: la salida trae acentos ("Sí", "confirmación") y con
     latin1 cada uno sale como "Sí" en el informe, que hace creer que el
     archivo del sitio está roto cuando no lo está. */
  dom = execFileSync(EDGE, [
    '--headless=new', '--disable-gpu', '--no-sandbox',
    '--user-data-dir=' + perfil,
    '--virtual-time-budget=90000',
    '--window-size=1200,2000',
    '--dump-dom',
    'http://localhost:' + PUERTO + '/tools/banco-rsvp.html?t=' + Date.now()
  ], { encoding: 'utf8', maxBuffer: 64 * 1024 * 1024, stdio: ['ignore', 'pipe', 'ignore'] });
} catch (e) {
  console.log('No pude correr el navegador. ¿Está el servidor en el puerto ' + PUERTO + '?');
  console.log(String(e.message).slice(0, 300));
  process.exit(2);
}

/* El marcador también va partido acá, por el mismo motivo que en el HTML: si
   la cadena completa estuviera escrita en cualquiera de los dos lados, el
   regex la encontraría primero dentro del código y no en el resultado. */
const MARCA = 'RESULTADO_' + 'JSON';
const FIN = 'FIN_' + 'JSON';

const m = dom.match(new RegExp(MARCA + '([\\s\\S]*?)' + FIN));
if (!m) {
  console.log('El navegador no devolvió resultados.');
  console.log('Revisá que el servidor esté en el puerto ' + PUERTO + ' y que banco-rsvp.html exista.');
  process.exit(2);
}

const pruebas = JSON.parse(m[1].replace(/&quot;/g, '"').replace(/&amp;/g, '&'));
let fallos = 0;

for (const p of pruebas) {
  if (p.ok) {
    console.log('  ok    ' + p.nombre);
  } else {
    fallos++;
    console.log('  FALLA ' + p.nombre);
    if (p.detalle) console.log('          ' + p.detalle);
  }
}

console.log('\n' + (fallos
  ? '*** ' + fallos + ' de ' + pruebas.length + ' pruebas de RSVP fallaron'
   : pruebas.length + ' pruebas de RSVP: el formulario sí responde.'));

process.exit(fallos ? 1 : 0);
