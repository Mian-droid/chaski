/**
 * Arma `dist/` con solo lo que debe publicarse: el juego y el panel docente.
 * Deja fuera pruebas, documentos, el servidor y el mockup.
 *
 * Las direcciones se pueden fijar al empaquetar, sin escribirlas en el repositorio:
 *   EXTRACT_URL=https://chaski-lector.tu-cuenta.workers.dev/extract npm run build:site
 *   ENDPOINT=https://script.google.com/macros/s/.../exec            npm run build:site
 *
 * Sin EXTRACT_URL, Chaski lee la explicación con reglas de palabras en vez del modelo.
 */
import { cpSync, existsSync, mkdirSync, readFileSync, readdirSync, rmSync, writeFileSync } from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const out = path.join(root, "dist");

/** Qué se copia: [origen, destino] relativos a la raíz y a `dist/`. */
const FILES = [
  ["index.html", "index.html"],
  ["panel.html", "panel.html"],
  ["css", "css"],
  ["js", "js"],
  ["deploy/_headers", "_headers"],
];

/** Valida una dirección https y la devuelve limpia; falla con un mensaje claro si no sirve. */
function httpsUrl(name, value) {
  let u;
  try { u = new URL(value); } catch { throw new Error(`${name} no es una dirección válida: ${value}`); }
  if (u.protocol !== "https:") throw new Error(`${name} debe empezar con https:// (recibido: ${u.protocol})`);
  return u.toString();
}

/** Reemplaza el valor de una clave de js/config.js. Falla si no la encuentra, para no publicar sin darse cuenta. */
function setConfig(source, key, value) {
  const re = new RegExp(`(${key}:\\s*)"[^"]*"`);
  if (!re.test(source)) throw new Error(`No se encontró ${key} en js/config.js`);
  return source.replace(re, `$1${JSON.stringify(value)}`);
}

function countFiles(dir) {
  return readdirSync(dir, { withFileTypes: true }).reduce(
    (n, e) => n + (e.isDirectory() ? countFiles(path.join(dir, e.name)) : 1), 0);
}

rmSync(out, { recursive: true, force: true });
mkdirSync(out, { recursive: true });
for (const [from, to] of FILES) {
  const src = path.join(root, from);
  if (!existsSync(src)) throw new Error(`Falta ${from}`);
  cpSync(src, path.join(out, to), { recursive: true });
}

const configPath = path.join(out, "js", "config.js");
let config = readFileSync(configPath, "utf8");
const extract = process.env.EXTRACT_URL ? httpsUrl("EXTRACT_URL", process.env.EXTRACT_URL) : "";
const endpoint = process.env.ENDPOINT ? httpsUrl("ENDPOINT", process.env.ENDPOINT) : "";
if (extract) config = setConfig(config, "EXTRACT_URL", extract);
if (endpoint) config = setConfig(config, "ENDPOINT", endpoint);
writeFileSync(configPath, config);

console.log(`dist/ listo: ${countFiles(out)} archivos.`);
console.log(extract ? `  Lectura con el modelo: ${extract}` : "  Sin EXTRACT_URL: Chaski leerá con reglas de palabras, no con el modelo.");
console.log(endpoint ? `  Hoja de Google: ${endpoint}` : "  Sin ENDPOINT: los datos quedan en el dispositivo de cada estudiante.");
