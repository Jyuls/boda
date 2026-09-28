/* Corta assets/img/fondo.png en las piezas que el sitio puede usar de verdad.

   Por qué hace falta cortar. La imagen es una guirnalda densa de 1056 x 1489:
   la flor ocupa todo el contorno y la ventana libre del centro mide 26% del
   ancho por 40% del alto. Servida entera como marco, al texto le queda una
   franja de 26% del ancho de la pantalla, que en un teléfono son 100px. Y
   reducerla a 28px de grosor, que es lo que pediría un marco normal, obliga a
   encogerla once veces: un pétalo de 30px se queda en 2.6px y se ve como ruido.

   Lo que sí sobrevive a esa prueba son las esquinas y un trozo de guirnalda
   horizontal, porque esas piezas se muestran grandes. Eso es lo que sale de
   aquí: cuatro esquinas ajustadas a su tinta y un separador.

   El corte de cada esquina se aprieta hasta la última fila o columna que aun
   tiene flor, con un mínimo de densidad, para no arrastrar filamentos sueltos
   ni un centavo de papel vacío. */

const fs = require('fs');
const zlib = require('zlib');

const ORIGEN = 'assets/img/fondo.png';
const UMBRAL = 24;      /* por debajo de este alfa el píxel se considera papel */
const MINIMO = 0.035;   /* una fila cuenta como parte de la pieza si al menos
                            el 3.5% de su ancho tiene flor: por debajo de eso
                            son filamentos que van a media camino y se cortan. */

/* -------------------------------------------------------------------------- */
/* leer el PNG                                                                  */
/* -------------------------------------------------------------------------- */

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
      ihdr = {
        ancho: d.readUInt32BE(0), alto: d.readUInt32BE(4),
        bits: d[8], color: d[9], entrelazado: d[12]
      };
    } else if (tipo === 'IDAT') {
      idat.push(d);
    } else if (tipo === 'IEND') {
      break;
    }
    p += 12 + largo;
  }
  if (!ihdr) throw new Error('falta IHDR');
  if (ihdr.entrelazado) throw new Error('la imagen está entrelazada y no se sabe leer');
  if (ihdr.bits !== 8) throw new Error('la imagen usa ' + ihdr.bits + ' bits y sólo se sabe leer a 8');
  if (ihdr.color !== 6 && ihdr.color !== 2) {
    throw new Error('la imagen es de tipo ' + ihdr.color + ' y sólo se sabe leer RGB o RGBA');
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
      let v;
      switch (filtro) {
        case 0: v = b; break;
        case 1: v = b + a; break;
        case 2: v = b + u; break;
        case 3: v = b + Math.floor((a + u) / 2); break;
        case 4: v = b + paeth(a, u, c); break;
        default: throw new Error('filtro ' + filtro + ' desconocido');
      }
      pix[y * paso + x] = v & 0xff;
    }
  }
  return { W, H, canales, paso, pix };
}

/* -------------------------------------------------------------------------- */
/* escribir el PNG                                                              */
/* -------------------------------------------------------------------------- */

const TABLA_CRC = (() => {
  const t = new Int32Array(256);
  for (let n = 0; n < 256; n++) {
    let c = n;
    for (let k = 0; k < 8; k++) c = (c & 1) ? (0xEDB88320 ^ (c >>> 1)) : (c >>> 1);
    t[n] = c;
  }
  return t;
})();

function crc32(buf) {
  let c = -1;
  for (let i = 0; i < buf.length; i++) c = TABLA_CRC[(c ^ buf[i]) & 0xFF] ^ (c >>> 8);
  return (c ^ -1) >>> 0;
}

function trozo(tipo, datos) {
  const largo = Buffer.alloc(4);
  largo.writeUInt32BE(datos.length, 0);
  const t = Buffer.from(tipo, 'ascii');
  const crc = Buffer.alloc(4);
  crc.writeUInt32BE(crc32(Buffer.concat([t, datos])), 0);
  return Buffer.concat([largo, t, datos, crc]);
}

function escribirPNG(w, h, rgba) {
  const ihdr = Buffer.alloc(13);
  ihdr.writeUInt32BE(w, 0);
  ihdr.writeUInt32BE(h, 4);
  ihdr[8] = 8;   /* 8 bits por canal */
  ihdr[9] = 6;   /* RGBA, con alfa */
  ihdr[10] = 0;  /* compresión deflate */
  ihdr[11] = 0;  /* filtro adaptativo */
  ihdr[12] = 0;  /* sin entrelazar */

  /* El filtro 0 (ninguno) deja el archivo un poco más grande que un PNG con
     filtro Paeth, pero se decodifica igual de bien en todas partes y el código
     se queda legible. Son 1.4 MB de entrada: el peso no es un problema. */
  const filas = [];
  for (let y = 0; y < h; y++) {
    const f = Buffer.alloc(1 + w * 4);
    f[0] = 0;
    rgba.copy(f, 1, y * w * 4, (y + 1) * w * 4);
    filas.push(f);
  }

  return Buffer.concat([
    Buffer.from([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a]),
    trozo('IHDR', ihdr),
    trozo('IDAT', zlib.deflateSync(Buffer.concat(filas), { level: 9 })),
    trozo('IEND', Buffer.alloc(0))
  ]);
}

/* -------------------------------------------------------------------------- */
/* medir y cortar                                                               */
/* -------------------------------------------------------------------------- */

const img = leerPNG(ORIGEN);
const alfa = img.canales === 4
  ? (x, y) => img.pix[y * img.paso + x * 4 + 3]
  : () => 255;   /* sin canal alfa no hay nada que recortar */

function densidadFila(y) {
  let n = 0;
  for (let x = 0; x < img.W; x += 2) if (alfa(x, y) > UMBRAL) n++;
  return n / (img.W / 2);
}
function densidadColumna(x) {
  let n = 0;
  for (let y = 0; y < img.H; y += 2) if (alfa(x, y) > UMBRAL) n++;
  return n / (img.H / 2);
}

/* Aprieta una región hasta la última fila y columna que todavía sostiene flor. */
function ajustar(x0, y0, x1, y1) {
  let arriba = y0, abajo = y1, izq = x0, der = x1;

  while (arriba < abajo - 2 && densidadFila(arriba) < MINIMO) arriba += 2;
  while (abajo > arriba + 2 && densidadFila(abajo - 1) < MINIMO) abajo -= 2;
  while (izq < der - 2 && densidadColumna(izq) < MINIMO) izq += 2;
  while (der > izq + 2 && densidadColumna(der - 1) < MINIMO) der -= 2;

  return { x: izq, y: arriba, w: der - izq, h: abajo - arriba };
}

function recortar(x, y, w, h) {
  const out = Buffer.alloc(w * h * 4);
  for (let fila = 0; fila < h; fila++) {
    for (let col = 0; col < w; col++) {
      const base = img.pix[(y + fila) * img.paso + (x + col) * img.canales];
      const d = (fila * w + col) * 4;
      if (img.canales === 4) {
        out[d] = base; out[d + 1] = img.pix[(y + fila) * img.paso + (x + col) * 4 + 1];
        out[d + 2] = img.pix[(y + fila) * img.paso + (x + col) * 4 + 2];
        out[d + 3] = img.pix[(y + fila) * img.paso + (x + col) * 4 + 3];
      } else {
        out[d] = base; out[d + 1] = base; out[d + 2] = base; out[d + 3] = 255;
      }
    }
  }
  return out;
}

function guardar(nombre, caja) {
  const rgba = recortar(caja.x, caja.y, caja.w, caja.h);
  fs.writeFileSync('assets/img/' + nombre, escribirPNG(caja.w, caja.h, rgba));
  return { nombre, caja, peso: Math.round(escribirPNG(caja.w, caja.h, rgba).length / 1024) };
}

/* Cada esquina se recorta en un cuadrado de LADO px desde su rincón y luego se
   aprieta. Un cuadrado y no el cuadrante entero, porque la guirnalda del borde
   superior se extiende 923px hacia abajo por el lateral: cortada entera sale un
   barrido larguísimo, no una esquina. Con el cuadrado sale el racimo de la
   esquina, que es lo que se quiere. */
const mitadX = Math.floor(img.W / 2);
const mitadY = Math.floor(img.H / 2);
const LADO = 420;

console.log('leyendo ' + ORIGEN + '  (' + img.W + ' x ' + img.H + ')');
console.log('');

const planos = [
  ['flor-esquina-si.png', 'esquina superior izquierda', 0, 0, LADO, LADO],
  ['flor-esquina-sd.png', 'esquina superior derecha', img.W - LADO, 0, img.W, LADO],
  ['flor-esquina-ii.png', 'esquina inferior izquierda', 0, img.H - LADO, LADO, img.H],
  ['flor-esquina-id.png', 'esquina inferior derecha', img.W - LADO, img.H - LADO, img.W, img.H]
];

console.log('=== las cuatro esquinas ===');
console.log('');
const hechos = [];
for (const [archivo, etiqueta, x0, y0, x1, y1] of planos) {
  const caja = ajustar(x0, y0, x1, y1);
  const r = guardar(archivo, caja);
  hechos.push(r);
  console.log('  ' + etiqueta.padEnd(24) + caja.w + ' x ' + caja.h +
    '   ' + String(r.peso) + ' KB   ' + archivo);
}

console.log('');
console.log('=== el separador ===');
console.log('');
/* La guirnalda horizontal cruza la parte de abajo. Se toma una banda de 300px
   de alto centrada en ella y se aprieta igual que las esquinas. */
const bandaSeparador = ajustar(
  Math.floor(img.W * 0.12),
  Math.floor(img.H * 0.80),
  Math.floor(img.W * 0.88),
  Math.floor(img.H * 0.96)
);
const sep = guardar('flor-separador.png', bandaSeparador);
console.log('  ' + bandaSeparador.w + ' x ' + bandaSeparador.h +
  '   ' + sep.peso + ' KB   flor-separador.png');

console.log('');
console.log('listo: ' + (hechos.length + 1) + ' piezas en assets/img/');
