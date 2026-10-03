const fs = require('fs');
let s = fs.readFileSync('C:/Users/elegi/Desktop/projects/boda/index.html', 'utf8');
s = s.replace('July 2027', 'Octubre 2026');
s = s.replace('Mo</span><span>Tu</span><span>We</span><span>Th</span><span>Fr</span><span>Sa</span><span>Su</span>', 'Lu</span><span>Ma</span><span>Mi</span><span>Ju</span><span>Vi</span><span>Sá</span><span>Do</span>');
s = s.replace('<span>1</span>', '<span>22</span>');
fs.writeFileSync('C:/Users/elegi/Desktop/projects/boda/index.html', s);
console.log('ok');