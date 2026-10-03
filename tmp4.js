const fs = require('fs');
let s = fs.readFileSync('C:/Users/elegi/Desktop/projects/boda/index.html', 'utf8');
s = s.replace('Enter your name*', 'Tu nombre*');
s = s.replace('Enter your wishes*', 'Escribe tus buenos deseos*');
s = s.replace('Guestbook', 'Libro de Visitas');
s = s.replace('SEND WISHES', 'ENVIAR DESEOS');
fs.writeFileSync('C:/Users/elegi/Desktop/projects/boda/index.html', s);
console.log('ok');