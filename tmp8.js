const fs = require('fs');
let s = fs.readFileSync('C:/Users/elegi/Desktop/projects/boda/index.html', 'utf8');
s = s.replace('Minimalism Dark Blue Template', 'Abril & Johann');
s = s.replace('Cordially Invites', 'Te invitamos a celebrar');
fs.writeFileSync('C:/Users/elegi/Desktop/projects/boda/index.html', s);
console.log('ok');