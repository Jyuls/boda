const fs = require('fs');
let s = fs.readFileSync('C:/Users/elegi/Desktop/projects/boda/index.html', 'utf8');
s = s.replace('WEDDING DAY SCHEDULE', 'ITINERARIO DEL DÍA');
s = s.replace('Save The Date', 'Reserva la Fecha');
s = s.replace('Codially Invites', 'Te invitamos');
fs.writeFileSync('C:/Users/elegi/Desktop/projects/boda/index.html', s);
console.log('ok');