/* Prueba que el backend de la invitación está en pie.
   Lee la URL de "assets/js/config.js", así que no hay que escribirla de nuevo
   ni acordarse de dónde quedó.

   Por defecto sólo pregunta si el script responde: eso no escribe nada.
   Con --escribir manda además una confirmación de prueba, y eso SÍ agrega una
   fila a la pestaña Respuestas. Se usa el primer código de la lista, que
   normalmente es un invitado de ejemplo: la fila se borra en un clic. */
const fs = require('fs');

const CFG = 'assets/js/config.js';

/* La URL se saca con la misma forma que está escrita en el archivo, en vez de
   con una expresión regular compleja: si alguien la cambia a comillas dobles
   o le mete un espacio, esta prueba tiene que seguir leyendo lo mismo que el
   sitio. */
function leerUrlScript() {
  const t = fs.readFileSync(CFG, 'utf8');
  const m = /urlScript\s*:\s*(['"])([\s\S]*?)\1/.exec(t);
  return m ? m[2].trim() : null;
}

function pedir(url, opciones) {
  return fetch(url, opciones).then(async r => {
    const cuerpo = await r.text();
    let datos = null;
    try { datos = JSON.parse(cuerpo); } catch (e) { /* no es JSON */ }
    return { estado: r.status, tipo: r.headers.get('content-type'), cuerpo, datos };
  });
}

async function main() {
  let malas = 0;
  const url = leerUrlScript();

  if (!url) {
    console.log('No hay urlScript en ' + CFG + '.');
    console.log('El sitio anda igual, pero las respuestas no salen del dispositivo.');
    process.exit(1);
  }

  console.log('Destino: ' + url.replace(/[^/]+\/exec$/, '.../exec'));
  console.log('\n¿El Web App responde?');

  const salud = await pedir(url);

  if (salud.estado !== 200) {
    console.log('  FALLA  respondió ' + salud.estado + ' ' + salud.tipo);
    malas++;
  } else if (!salud.datos || salud.datos.ok !== true || salud.datos.servicio !== 'boda') {
    console.log('  FALLA  respondió 200 pero no es el script de la boda: ' + salud.cuerpo.slice(0, 120));
    malas++;
  } else {
    console.log('  ok     respondió 200 con el servicio "boda"');
    console.log('         hora del servidor: ' + salud.datos.hora);
  }

  if (!process.argv.includes('--escribir')) {
    console.log('\nEso prueba que el script está desplegado y despierto, no que escriba bien.');
    console.log('Para probar el viaje completo (y agrega una fila a Respuestas):');
    console.log('  node tools/probar-conexion.js --escribir');
    return malas;
  }

  /* --- prueba de escritura ------------------------------------------------- */
  console.log('\n¿Una confirmación llega a la hoja?  (esto SÍ escribe una fila)');

  const datos = fs.readFileSync('data/invitados.js', 'utf8');
  const primero = /codigo:\s*'([^']+)'/.exec(datos);
  if (!primero) {
    console.log('  FALLA  no se encontró ningún código en data/invitados.js');
    return malas + 1;
  }
  const codigo = primero[1];
  const grupo = new RegExp("codigo:\\s*'" + codigo + "',\\s*grupo:\\s*'([^']+)'").exec(datos);
  console.log('  usando el código ' + codigo + ' (' + (grupo ? grupo[1] : '?') + ')');

  const escrito = await pedir(url, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      codigo: codigo,
      asistiran: [],
      no_asistiran: [],
      acompanantes: [],
      mensaje: 'prueba de conexión, se puede borrar'
    })
  });

  if (escrito.estado !== 200) {
    console.log('  FALLA  respondió ' + escrito.estado);
    console.log('         ' + escrito.cuerpo.slice(0, 200));
    malas++;
  } else if (escrito.datos && escrito.datos.ok === true) {
    console.log('  ok     la hoja aceptó la respuesta');
    console.log('         -> andá a la pestaña Respuestas y fijate si está la fila.');
    console.log('         -> después podés borrarla.');
  } else {
    console.log('  FALLA  el script la rechazó: ' +
      (escrito.datos ? escrito.datos.error : escrito.cuerpo.slice(0, 200)));
    console.log('         Si dice "código no encontrado", es que la lista del repo y la');
    console.log('         del Sheet no son la misma: faltan los datos de invitados.');
    malas++;
  }

  return malas;
}

main().then(malas => {
  if (malas) {
    console.log('\n*** ' + malas + ' problema(s)');
    process.exit(1);
  }
  console.log('\nEl backend está en pie.');
});
