const fs = require('fs');
let s = fs.readFileSync('C:/Users/elegi/Desktop/projects/boda/index.html', 'utf8');
s = s.replace('Groom - Example Bank of Egypt', 'Cuenta para regalo');
s = s.replace('Bride - Wise', 'Wise');
fs.writeFileSync('C:/Users/elegi/Desktop/projects/boda/index.html', s);
console.log('ok');