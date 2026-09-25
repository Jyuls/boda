/* Único lugar del proyecto que hay que editar al publicar.
   El resto de archivos leen de aquí. */

window.CONFIG = {
  // Tu usuario de GitHub. Ejemplo: "juan" -> https://juan.github.io/boda
  usuario: 'TU_USUARIO',

  // Pegá acá la URL de tu Web App de Apps Script.
  // Implementar > Nueva implementación > Aplicación web > Copiar.
  // Si está vacío, el sitio funciona igual y guarda la respuesta en el
  // dispositivo del invitado, pero no llega a tu spreadsheet.
  urlScript: '',

  enlaceMaps: 'https://maps.app.goo.gl/UJr6qCr8tBrk5gqE9',

  // La boda: 22 de octubre de 2026 a las 11:00, hora de Tijuana (UTC-7).
  // En UTC son las 18:00.
  boda: {
    inicio: '2026-10-22T18:00:00Z',
    fin: '2026-10-22T20:00:00Z',
    fechaLarga: 'jueves 22 de octubre de 2026',
    titulo: 'Boda de Johann Ezequiel y Abril Cristina',
    lugar: 'Parroquia San Ignacio de Loyola',
    ciudad: 'Tijuana, Baja California'
  }
};
