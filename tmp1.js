const fs = require('fs');
let s = fs.readFileSync('C:/Users/elegi/Desktop/projects/boda/index.html', 'utf8');
s = s.replace('<span>Youssef</span>\n      <span class="amp">&amp;</span>\n      <span>Nour</span>', '<span>Abril</span>\n      <span class="amp">&amp;</span>\n      <span>Johann</span>');
fs.writeFileSync('C:/Users/elegi/Desktop/projects/boda/index.html', s);
console.log('ok');