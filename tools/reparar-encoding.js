/* Repara el doble codificado UTF-8.
   Qué pasó: en PowerShell 5.1, "Get-Content -Raw" + "Set-Content -Encoding
   UTF8" sobre un archivo que ya era UTF-8 hace que los bytes se lean como
   Windows-1252 y se vuelvan a guardar como UTF-8. El resultado es "Ã³" donde
   decía "ó", es decir el archivo queda guardado dos veces codificado.

   No se perdió nada: la transformación es reversible, porque en el camino
   sólo se pasó de UTF-8 a Windows-1252 y de vuelta.

    Este script:
      - detecta cuáles archivos están así (busca 'Ã' seguida de un carácter
        del tramo Latin-1, que en un archivo que sí está bien no aparece)
      - deshace una vuelta de la conversión
      - quita el BOM que Set-Content agregaba de más
      - avisa de los caracteres que ya se perdieron (U+FFFD), que no tienen
        vuelta atrás
      - y NO toca los que ya están bien

   Uso:  node tools/reparar-encoding.js            (repara y reporta)
         node tools/reparar-encoding.js --revisar  (sólo dice qué encuentra)
*/

const fs = require('fs');
const path = require('path');

const raiz = path.join(__dirname, '..');
const soloRevisar = process.argv.includes('--revisar');

/* Extensiones que pueden haber pasado por el PowerShell. */
const EXT = new Set(['.html', '.js', '.css', '.md', '.json', '.txt']);
const IGNORAR = new Set(['node_modules', '.git', 'capturas']);

/* ¿El texto tiene la firma del doble codificado?
   'Ã' (U+00C3) seguido de un carácter entre U+00A0 y U+00BF. En un archivo
   UTF-8 correcto eso no aparece nunca en español. */
function roto(texto) {
  return /[\u00C3][\u00A0-\u00BF]/.test(texto);
}

/* U+FFFD es el otro daño, y es el peor: no tiene vuelta atrás. Aparece cuando
   algo escribió el archivo con una codificación que no podía representar un
   acento (el "Set-Content -Encoding UTF8" de PowerShell 5.1 con la consola en
   otra página de códigos) y puso el signo de reemplazo en su lugar. Un archivo
   con U+FFFD no se puede reparar solo: hay que saber qué carácter iba. Este
   script lo busca para que no pase desapercibido. */
function perdidos(texto) {
  const n = (texto.match(/\uFFFD/g) || []).length;
  return n;
}

/* Una vuelta de la vuelta: el texto se decodifica como Windows-1252 y eso
   devuelve los bytes UTF-8 originales. */
function revertir(texto) {
  return Buffer.from(texto, 'binary');
}

function archivos() {
  const salida = [];
  (function recorrer(dir) {
    for (const entrada of fs.readdirSync(dir, { withFileTypes: true })) {
      if (IGNORAR.has(entrada.name)) continue;
      const completo = path.join(dir, entrada.name);
      /* Este mismo archivo queda fuera a propósito: su comentario trae el
         ejemplo del texto roto ('Ã³' donde iba 'ó') para explicar qué hace,
         así que el detector lo marcaría y "repararlo"-damaría la explicación.
         Es el único lugar del proyecto donde esa secuencia es correcta. */
      if (completo === __filename) continue;
      if (entrada.isDirectory()) recorrer(completo);
      else if (EXT.has(path.extname(entrada.name))) salida.push(completo);
    }
  })(raiz);
  return salida;
}

let reparados = 0;
let marcados = 0;

for (const archivo of archivos()) {
  const bytes = fs.readFileSync(archivo);
  const tieneBom = bytes[0] === 0xef && bytes[1] === 0xbb && bytes[2] === 0xbf;
  const sinBom = tieneBom ? bytes.slice(3) : bytes;
  const texto = sinBom.toString('utf8');

  const perdidosN = perdidos(texto);
  if (perdidosN) {
    marcados++;
    const primera = texto.slice(0, texto.indexOf('\uFFFD')).split('\n').length;
    console.log('  ATENCIÓN: ' + relativo(archivo) + ' tiene ' + perdidosN +
      ' carácter(es) perdidos (U+FFFD), el primero en la línea ' + primera +
      '. No es reversible: hay que escribir a mano lo que iba.');
  }

  if (!roto(texto)) {
    if (tieneBom) {
      console.log('  BOM sin doble codificar: ' + relativo(archivo));
      if (!soloRevisar) fs.writeFileSync(archivo, sinBom);
    }
    continue;
  }

  console.log('  doble codificado: ' + relativo(archivo));
  if (soloRevisar) continue;

  const original = revertir(texto);
  /* El control: si al revertir ya no aparece la firma, era eso. */
  const revisado = original.toString('utf8');
  if (roto(revisado)) {
    console.log('      no se pudo revertir limpio, se deja como está');
    continue;
  }
  fs.writeFileSync(archivo, original);
  reparados++;
  console.log('      revertido y guardado sin BOM');
}

function relativo(a) { return path.relative(raiz, a).replace(/\\/g, '/'); }

console.log('\n' + (reparados
  ? reparados + ' archivo(s) reparados.'
  : 'Nada roto.') + (marcados
  ? '\n' + marcados + ' archivo(s) con caracteres perdidos: hay que corregirlos a mano.'
  : ''));
