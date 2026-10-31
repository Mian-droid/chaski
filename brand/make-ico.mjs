/* Junta PNG de 16, 32 y 48 px en un favicon.ico (los ICO modernos aceptan PNG adentro).
   Uso, desde la raíz del repositorio:  node brand/make-ico.mjs
   Lee brand/_icon-16.png, _icon-32.png y _icon-48.png (ver brand/README.md) y escribe brand/favicon.ico. */
import { readFileSync, writeFileSync } from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

const dir = path.dirname(fileURLToPath(import.meta.url));
const sizes = [16, 32, 48];
const pngs = sizes.map((n) => readFileSync(path.join(dir, `_icon-${n}.png`)));

const head = Buffer.alloc(6);
head.writeUInt16LE(0, 0); // reservado
head.writeUInt16LE(1, 2); // tipo: ícono
head.writeUInt16LE(sizes.length, 4);

let offset = 6 + 16 * sizes.length;
const entries = sizes.map((n, i) => {
  const e = Buffer.alloc(16);
  e.writeUInt8(n, 0); // ancho
  e.writeUInt8(n, 1); // alto
  e.writeUInt8(0, 2); // sin paleta
  e.writeUInt8(0, 3);
  e.writeUInt16LE(1, 4); // planos
  e.writeUInt16LE(32, 6); // bits por píxel
  e.writeUInt32LE(pngs[i].length, 8);
  e.writeUInt32LE(offset, 12);
  offset += pngs[i].length;
  return e;
});

writeFileSync(path.join(dir, "favicon.ico"), Buffer.concat([head, ...entries, ...pngs]));
console.log(`favicon.ico listo: ${sizes.join(", ")} px.`);
