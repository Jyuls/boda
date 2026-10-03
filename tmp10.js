const fs = require('fs');
let s = fs.readFileSync('C:/Users/elegi/Desktop/projects/boda/assets/js/app.js', 'utf8');
s = s.replace('Close lightbox', 'Cerrar galería');
s = s.replace("días'Wedding photo'", 'Foto de boda');
fs.writeFileSync('C:/Users/elegi/Desktop/projects/boda/assets/js/app.js', s);
console.log('ok');