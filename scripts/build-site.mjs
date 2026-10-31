/**
 * Arma `dist/` con solo lo que debe publicarse: el juego y el panel docente.
 * Deja fuera pruebas, documentos, el servidor y el mockup.
 *
 * Las direcciones se pueden fijar al empaquetar, sin escribirlas en el repositorio:
 *   EXTRACT_URL=https://chaski-lector.tu-cuenta.workers.dev/extract npm run build:site
 *   TRANSCRIBE_URL=/transcribe                                      npm run build:site   (dictado por voz; en Pages ya es /transcribe)
 *   ENDPOINT=/events                                                npm run build:site   (base de datos del propio sitio)
 *   ENDPOINT=https://script.google.com/macros/s/.../exec            npm run build:site   (hoja de Google)
 *
 * Sin EXTRACT_URL, Chaski lee la explicación con reglas de palabras en vez del modelo.
 * EXTRACT_URL puede ser una ruta del mismo sitio ("/extract", la Pages Function de functions/) o una dirección https.
 * En Cloudflare Pages (CF_PAGES=1) y sin EXTRACT_URL, se usa "/extract" solo: la función viene en este repositorio.
 *
 * CONTACT_EMAIL=correo@ejemplo.org fija el correo de contacto que muestran las páginas de privacidad y términos.
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
  ["privacidad.html", "privacidad.html"],
  ["terminos.html", "terminos.html"],
  ["consentimiento.html", "consentimiento.html"],
  ["acerca.html", "acerca.html"],
  ["404.html", "404.html"],
  ["css", "css"],
  ["js", "js"],
  ["deploy/_headers", "_headers"],
  ["deploy/robots.txt", "robots.txt"],
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
function samePathOrHttps(name, value) {
  if (/^\/[A-Za-z0-9_\-\/]*$/.test(value) && !value.startsWith("//")) return value;
  return httpsUrl(name, value);
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
let extract = process.env.EXTRACT_URL ? samePathOrHttps("EXTRACT_URL", process.env.EXTRACT_URL) : "";
const onPages = process.env.CF_PAGES === "1";
if (!extract && onPages) extract = "/extract";
/* Dictado por voz: igual que EXTRACT_URL. En Cloudflare Pages se usa "/transcribe" (la función viene en este repositorio). */
let transcribe = process.env.TRANSCRIBE_URL ? samePathOrHttps("TRANSCRIBE_URL", process.env.TRANSCRIBE_URL) : "";
if (!transcribe && onPages) transcribe = "/transcribe";
if (transcribe) config = setConfig(config, "TRANSCRIBE_URL", transcribe);
const endpoint = process.env.ENDPOINT ? samePathOrHttps("ENDPOINT", process.env.ENDPOINT) : "";
if (extract) config = setConfig(config, "EXTRACT_URL", extract);
if (endpoint) config = setConfig(config, "ENDPOINT", endpoint);
/* Correo de contacto de las páginas legales: se fija al empaquetar para no escribirlo en el repositorio. */
const contact = (process.env.CONTACT_EMAIL || "").trim();
if (contact) {
  if (!/^[^\s@"<>]+@[^\s@"<>]+\.[^\s@"<>]+$/.test(contact)) throw new Error(`CONTACT_EMAIL no es un correo válido: ${contact}`);
  config = setConfig(config, "CONTACT_EMAIL", contact);
}
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
console.log(transcribe ? `  Dictado por voz: ${transcribe}` : "  Sin TRANSCRIBE_URL: no hay dictado por voz.");
console.log(`  Vista previa al compartir: ${site}/brand/og-image.jpg`);
console.log(endpoint ? `  Guardado de datos: ${endpoint}` : "  Sin ENDPOINT: los datos quedan en el dispositivo de cada estudiante.");
