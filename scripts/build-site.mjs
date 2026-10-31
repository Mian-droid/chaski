/**
 * Arma `dist/` con solo lo que debe publicarse: el juego y el panel docente.
 * Deja fuera pruebas, documentos, el servidor y el mockup.
 *
 * Las direcciones se pueden fijar al empaquetar, sin escribirlas en el repositorio:
 *   EXTRACT_URL=https://chaski-lector.tu-cuenta.workers.dev/extract npm run build:site
 *   ENDPOINT=https://script.google.com/macros/s/.../exec            npm run build:site
 *
 * Sin EXTRACT_URL, Chaski lee la explicación con reglas de palabras en vez del modelo.
 * EXTRACT_URL puede ser una ruta del mismo sitio ("/extract", la Pages Function de functions/) o una dirección https.
 * En Cloudflare Pages (CF_PAGES=1) y sin EXTRACT_URL, se usa "/extract" solo: la función viene en este repositorio.
 *
 * La vista previa al compartir (WhatsApp, redes) pide la imagen con dirección completa. index.html trae la de
 * https://chaski.pages.dev; si el sitio vive en otra, pásala al empaquetar:
 *   SITE_URL=https://juega.ejemplo.org npm run build:site
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
  ["brand/favicon.svg", "brand/favicon.svg"],
  ["brand/favicon.ico", "brand/favicon.ico"],
  ["brand/apple-touch-icon.png", "brand/apple-touch-icon.png"],
  ["brand/og-image.jpg", "brand/og-image.jpg"],
];

/** Dirección del sitio que trae index.html. */
const DEFAULT_SITE = "https://chaski.pages.dev";

/** Valida una dirección https y la devuelve limpia; falla con un mensaje claro si no sirve. */
function httpsUrl(name, value) {
  let u;
  try { u = new URL(value); } catch { throw new Error(`${name} no es una dirección válida: ${value}`); }
  if (u.protocol !== "https:") throw new Error(`${name} debe empezar con https:// (recibido: ${u.protocol})`);
  return u.toString();
}

/** Dirección del servidor de lectura: una ruta del mismo sitio ("/extract") o una dirección https. */
function extractUrl(value) {
  if (/^\/[A-Za-z0-9_\-\/]*$/.test(value) && !value.startsWith("//")) return value;
  return httpsUrl("EXTRACT_URL", value);
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
let extract = process.env.EXTRACT_URL ? extractUrl(process.env.EXTRACT_URL) : "";
const onPages = process.env.CF_PAGES === "1";
if (!extract && onPages) extract = "/extract";
const endpoint = process.env.ENDPOINT ? httpsUrl("ENDPOINT", process.env.ENDPOINT) : "";
if (extract) config = setConfig(config, "EXTRACT_URL", extract);
if (endpoint) config = setConfig(config, "ENDPOINT", endpoint);
writeFileSync(configPath, config);

/* Dirección del sitio para la vista previa al compartir. */
const site = process.env.SITE_URL ? new URL(httpsUrl("SITE_URL", process.env.SITE_URL)).origin : DEFAULT_SITE;
if (site !== DEFAULT_SITE) {
  const indexPath = path.join(out, "index.html");
  writeFileSync(indexPath, readFileSync(indexPath, "utf8").split(DEFAULT_SITE).join(site));
}

console.log(`dist/ listo: ${countFiles(out)} archivos.`);
const viaPages = onPages && !process.env.EXTRACT_URL ? " (Cloudflare Pages Function)" : "";
console.log(extract ? `  Lectura con el modelo: ${extract}${viaPages}` : "  Sin EXTRACT_URL: Chaski leerá con reglas de palabras, no con el modelo.");
console.log(`  Vista previa al compartir: ${site}/brand/og-image.jpg`);
console.log(endpoint ? `  Hoja de Google: ${endpoint}` : "  Sin ENDPOINT: los datos quedan en el dispositivo de cada estudiante.");
