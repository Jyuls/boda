const fs = require('fs');
let s = fs.readFileSync('C:/Users/elegi/Desktop/projects/boda/index.html', 'utf8');
s = s.replace('Close lightbox', 'Cerrar galería');
s = s.replace('Wedding photo', 'Foto de boda');
fs.writeFileSync('C:/Users/elegi/Desktop/projects/boda/index.html', s);
console.log('ok');