const fs = require('fs');
let s = fs.readFileSync('C:/Users/elegi/Desktop/projects/boda/index.html', 'utf8');
s = s.replace('LUGAR DE LA RECEPCIÓN', 'LUGAR DE LA CEREMONIA');
s = s.replace('Hacienda Santa Verónica', 'Casa de la familia González');
s = s.replace('https://maps.app.goo.gl/TxfZHiPZb3d2xCcZA', 'https://maps.app.goo.gl/bzvN4pfvZheXe6zM9');
s = s.replace('Cómo llegar', 'Ver ubicación');
s = s.replace('Celebración', 'Celebración');
fs.writeFileSync('C:/Users/elegi/Desktop/projects/boda/index.html', s);
console.log('ok');