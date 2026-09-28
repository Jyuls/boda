/* Mide la ventana interior transparente de fondo.png: el rectángulo más grande
   (en área) donde no hay ningún pétalo. Es la única zona donde un texto sobre
   la imagen seguiría leyéndose, y por eso decide si la guirnalda entera puede
   flotar sobre una página con letras.

   Para cada fila se toma su lapso transparente (el hueco entre la primera flor
   que llega desde la izquierda y la primera desde la derecha). La ventana tiene
   que caber dentro del lapso común a todas sus filas. Se barre cada posible
   borde superior y se estira el borde inferior mientras el lapso común aguante,
   y se queda con el rectángulo de mayor área. */

const fs = require('fs');
const zlib = require('zlib');

function leerPNG(ruta) {
  const buf = fs.readFileSync(ruta);
  const firma = Buffer.from([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a]);
  if (!buf.subarray(0, 8).equals(firma)) throw new Error(ruta + ' no es un PNG');

  let p = 8, ihdr = null, idat = [];
  while (p < buf.length) {
    const largo = buf.readUInt32BE(p);
    const tipo = buf.toString('ascii', p + 4, p + 8);
    const d = buf.subarray(p + 8, p + 8 + largo);
    if (tipo === 'IHDR') {
      ihdr = { ancho: d.readUInt32BE(0), alto: d.readUInt32BE(4), bits: d[8], color: d[9], entrelazado: d[12] };
    } else if (tipo === 'IDAT') idat.push(d);
    else if (tipo === 'IEND') break;
    p += 12 + largo;
  }
  const canales = ihdr.color === 6 ? 4 : 3;
  const W = ihdr.ancho, H = ihdr.alto, paso = W * canales;
  const crudo = zlib.inflateSync(Buffer.concat(idat));
  const pix = Buffer.alloc(H * paso);

  function paeth(a, b, c) {
    const pp = a + b - c;
    const pa = Math.abs(pp - a), pb = Math.abs(pp - b), pc = Math.abs(pp - c);
    return pa <= pb && pa <= pc ? a : pb <= pc ? b : c;
  }
  let q = 0;
  for (let y = 0; y < H; y++) {
    const filtro = crudo[q++];
    for (let x = 0; x < paso; x++) {
      const b = crudo[q++];
      const a = x >= canales ? pix[y * paso + x - canales] : 0;
      const u = y > 0 ? pix[(y - 1) * paso + x] : 0;
      const c = x >= canales && y > 0 ? pix[(y - 1) * paso + x - canales] : 0;
      let v = b;
      if (filtro === 1) v = b + a;
      else if (filtro === 2) v = b + u;
      else if (filtro === 3) v = b + Math.floor((a + u) / 2);
      else if (filtro === 4) v = b + paeth(a, u, c);
      pix[y * paso + x] = v & 0xff;
    }
  }
  return { W, H, canales, paso, pix };
}

const UMBRAL = 24;
const img = leerPNG('assets/img/fondo.png');
const W = img.W, H = img.H;
const alfa = img.canales === 4
  ? (x, y) => img.pix[y * img.paso + x * 4 + 3]
  : () => 255;

/* L[y] = primer x con flor desde la izquierda; R[y] = primer x con flor desde
   la derecha (es decir, el último x transparente). */
const L = new Int32Array(H), R = new Int32Array(H);
for (let y = 0; y < H; y++) {
  let izq = -1, der = -1;
  for (let x = 0; x < W; x++) if (alfa(x, y) > UMBRAL) { izq = x; break; }
  for (let x = W - 1; x >= 0; x--) if (alfa(x, y) > UMBRAL) { der = x; break; }
  L[y] = izq; R[y] = der;
}

/* Mayor rectángulo transparente, sin dar por buena una fila sin papel (flor de
   borde a borde) ni pedazar. Se recorre cada tope de fila y se estira hacia
   abajo mientras el corte común tenga al menos 1px de ancho; se queda con la
   mayor área. */
let mejor = { area: 0 };
for (let a = 0; a < H; a++) {
  if (L[a] === -1 || R[a] <= L[a]) continue;
  let izq = L[a], der = R[a];
  for (let b = a; b < H; b++) {
    if (L[b] === -1 || R[b] <= L[b]) break;
    if (L[b] > izq) izq = L[b];
    if (R[b] < der) der = R[b];
    if (der <= izq) break;
    const area = (der - izq + 1) * (b - a + 1);
    if (area > mejor.area) mejor = { area, x: izq, y: a, w: der - izq + 1, h: b - a + 1 };
  }
}

console.log('origen:      ' + W + ' x ' + H);
console.log('ventana:     ' + mejor.w + ' x ' + mejor.h + '  en (' + mejor.x + ',' + mejor.y + ')');
console.log('ancho:       ' + (100 * mejor.w / W).toFixed(1) + '% del ancho');
console.log('alto:        ' + (100 * mejor.h / H).toFixed(1) + '% del alto');
console.log('esquina:     la guirnalda entra ' + (W - mejor.x - mejor.w) + 'px por la derecha y ' +
  (H - mejor.y - mejor.h) + 'px por abajo');

/* Lo que le queda al texto en pantalla, si la imagen entera flota fija con
   background-size: cover centrado y el lector la ve completa. */
const TAM = [[320, 640], [390, 844], [414, 896], [768, 1024], [1024, 768], [1440, 900]];
console.log('');
for (const [vw, vh] of TAM) {
  const esc = Math.max(vw / W, vh / H);
  const escW = W * esc, escH = H * esc;
  const enf = (v, dim) => v >= (dim - escW) / 2 - 0.5 && v <= (dim - escW) / 2 + escW + 0.5;
  /* La ventana en pantalla sale de mapear el rectángulo fuente por cover. */
  const ox = (vw - escW) / 2, oy = (vh - escH) / 2;
  const wx = mejor.x * esc + ox, wy = mejor.y * esc + oy, ww = mejor.w * esc, wh = mejor.h * esc;
  console.log(vw + 'x' + vh +
    '  garfli ' + escW.toFixed(0) + 'x' + escH.toFixed(0) +
    '  ventana visible ' + Math.round(Math.max(0, Math.min(vw, wx + ww) - Math.max(0, wx))) +
    'x' + Math.round(Math.max(0, Math.min(vh, wy + wh) - Math.max(0, wy))) +
    '  (cierra borde en x=' + ox.toFixed(0) + ', y=' + oy.toFixed(0) + ')');
}