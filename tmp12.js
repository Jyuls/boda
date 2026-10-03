const fs = require('fs');
let s = fs.readFileSync('C:/Users/elegi/Desktop/projects/boda/index.html', 'utf8');
s = s.replace('Agregar al calendario', 'Agregar al calendario');
fs.writeFileSync('C:/Users/elegi/Desktop/projects/boda/index.html', s);
console.log('ok');