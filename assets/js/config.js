/* Único lugar del proyecto que hay que editar al publicar.
   El resto de archivos leen de aquí. */

window.CONFIG = {
  // Tu usuario de GitHub. Ejemplo: "juan" -> https://juan.github.io/boda
  usuario: 'Jyuls',

  // URL completa del sitio ya publicado, con "/" al final. Si la dejás vacía
  // se arma sola con "usuario", pero conviene ponerla: el repositorio
  // puede llamarse distinto de "boda".
  // Ejemplo: 'https://juan.github.io/casamiento/'
  urlSitio: 'https://jyuls.github.io/boda/',

  // Pegá acá la URL de tu Web App de Apps Script.
  // Implementar > Nueva implementación > Aplicación web > Copiar.
  // Si está vacío, el sitio funciona igual y guarda la respuesta en el
  // dispositivo del invitado, pero no llega a tu spreadsheet.
  urlScript: 'https://script.google.com/macros/s/AKfycbzeum-vZuBwPdFagFrb1mHGE5AAVPsnWTkWT-Dums0av0UVRm0VL01J1lsgJt-0uaI/exec',

  enlaceMaps: 'https://maps.app.goo.gl/UJr6qCr8tBrk5gqE9',

  // La boda: 22 de octubre de 2026 a las 11:00, hora de Tijuana (UTC-7).
  // En UTC son las 18:00.
  boda: {
    inicio: '2026-10-22T18:00:00Z',
    fin: '2026-10-22T20:00:00Z',
    fechaLarga: 'Jueves 22 de octubre de 2026',
    titulo: 'Boda de Abril Cristina y Johann Ezequiel',
    lugar: 'Parroquia San Ignacio de Loyola',
    ciudad: 'Tijuana, Baja California',

    /* La dirección se arma en "Cómo llegar" con estas líneas. Cámbialas aquí y
       se actualiza la página; no hace falta tocar el HTML.
       El número "Pte. 95" es el que publica la Arquidiócesis de Tijuana para
       San Ignacio de Loyola. El C.P. 22435 es el que corresponde a Nueva
       Tijuana, donde está la parroquia. */
    direccion: 'Av. José López Portillo Pte. 95',
    colonia: 'Nueva Tijuana',
    cp: '22435',
    ciudadCorta: 'Tijuana, B.C.',

    /* Para el enlace "Llamar": sólo números, con código de país y sin espacios.
       Dejarlo en '' esconde el teléfono. */
    telefono: '5216646234040',

    /* Fotos. Si el archivo no está en assets/img/, la página se queda igual
       con su texto y no aparece ningún cuadrito roto. Con la imagen puesta,
       aparece sola.

       El marco de cada una está en el CSS, ajustado a la proporción de la foto
       para que no se recorte nada:
         - iglesia: 5:3, panorámica (1261x751 va bien)
         - pareja:  3:4, vertical    (1201x1600 va bien)
       Si cambias las fotos, revisa esas dos reglas en styles.css para que el
       marco siga la proporción de la nueva imagen. */
    fotoIglesia: 'assets/img/iglesia.jpg',
    fotoPareja: 'assets/img/nuestros.jpg'
  }
};

/* Un solo lugar donde se decide cuál es la dirección del sitio. Antes cada
   archivo se armaba su propia versión y era fácil que se contradigan: los
   links de invitación salían mal porque usaban el usuario pelado. */
if (!window.CONFIG.urlSitio && window.CONFIG.usuario &&
    window.CONFIG.usuario !== 'TU_USUARIO') {
  window.CONFIG.urlSitio = 'https://' + window.CONFIG.usuario + '.github.io/boda/';
}
