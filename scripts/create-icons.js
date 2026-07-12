/**
 * Generates placeholder app icons (solid brand-color squares) with no external
 * dependencies, so the PWA manifest and <link rel="icon"> resolve.
 *
 * Replace public/icon-*.png and public/favicon.ico with real brand artwork
 * before a production launch. Run: `npm run generate-icons`.
 */
const fs = require("fs");
const path = require("path");
const zlib = require("zlib");

// Fitness360 brand color (deep teal-green).
const BRAND = { r: 0x0f, g: 0x6e, b: 0x56 };

const CRC_TABLE = (() => {
  const t = new Int32Array(256);
  for (let n = 0; n < 256; n++) {
    let c = n;
    for (let k = 0; k < 8; k++) c = c & 1 ? 0xedb88320 ^ (c >>> 1) : c >>> 1;
    t[n] = c;
  }
  return t;
})();

function crc32(buf) {
  let c = ~0;
  for (let i = 0; i < buf.length; i++) c = CRC_TABLE[(c ^ buf[i]) & 0xff] ^ (c >>> 8);
  return ~c >>> 0;
}

function chunk(type, data) {
  const len = Buffer.alloc(4);
  len.writeUInt32BE(data.length, 0);
  const typeBuf = Buffer.from(type, "ascii");
  const body = Buffer.concat([typeBuf, data]);
  const crc = Buffer.alloc(4);
  crc.writeUInt32BE(crc32(body), 0);
  return Buffer.concat([len, body, crc]);
}

function solidPng(size, { r, g, b }) {
  const sig = Buffer.from([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a]);

  const ihdr = Buffer.alloc(13);
  ihdr.writeUInt32BE(size, 0);
  ihdr.writeUInt32BE(size, 4);
  ihdr[8] = 8; // bit depth
  ihdr[9] = 6; // color type RGBA
  ihdr[10] = 0;
  ihdr[11] = 0;
  ihdr[12] = 0;

  const rowLen = size * 4;
  const raw = Buffer.alloc((rowLen + 1) * size);
  for (let y = 0; y < size; y++) {
    const off = y * (rowLen + 1);
    raw[off] = 0; // filter: none
    for (let x = 0; x < size; x++) {
      const p = off + 1 + x * 4;
      raw[p] = r;
      raw[p + 1] = g;
      raw[p + 2] = b;
      raw[p + 3] = 255;
    }
  }
  const idat = zlib.deflateSync(raw, { level: 9 });

  return Buffer.concat([
    sig,
    chunk("IHDR", ihdr),
    chunk("IDAT", idat),
    chunk("IEND", Buffer.alloc(0)),
  ]);
}

const publicDir = path.join(__dirname, "..", "public");
const outputs = [
  ["icon-192x192.png", 192],
  ["icon-512x512.png", 512],
  ["favicon.ico", 48],
];

for (const [name, size] of outputs) {
  const png = solidPng(size, BRAND);
  fs.writeFileSync(path.join(publicDir, name), png);
  console.log(`wrote public/${name} (${size}x${size}, ${png.length} bytes)`);
}
