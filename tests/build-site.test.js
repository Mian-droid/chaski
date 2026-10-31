/**
 * Pruebas del empaquetado del sitio (scripts/build-site.mjs). Ejecutar: node tests/build-site.test.js
 * Verifica qué se publica y qué no, y que las direcciones se escriban solo en dist/, nunca en el repositorio.
 */
const assert = require('assert');
const { spawnSync } = require('child_process');
const fs = require('fs');
const path = require('path');

const root = path.resolve(__dirname, '..');
const dist = path.join(root, 'dist');
const build = (env) => spawnSync(process.execPath, ['scripts/build-site.mjs'], { cwd: root, env: Object.assign({}, process.env, { EXTRACT_URL: '', ENDPOINT: '', CF_PAGES: '', SITE_URL: '' }, env), encoding: 'utf8' });
const read = (...p) => fs.readFileSync(path.join(...p), 'utf8');
const tasks = [];
const t = (name, fn) => tasks.push([name, fn]);

t('publica el juego, el panel y las cabeceras, y deja fuera pruebas, documentos y servidor', () => {
  const r = build({});
  assert.strictEqual(r.status, 0, r.stderr);
  ['index.html', 'panel.html', '_headers', 'css/game.css', 'css/panel.css', 'js/app.js', 'js/brain.js', 'js/content.js', 'js/core.js', 'js/scenery.js', 'js/panel.js', 'js/config.js']
    .forEach((f) => assert.ok(fs.existsSync(path.join(dist, f)), 'debe estar ' + f));
  ['tests', 'worker', 'docs', 'mockup', 'apps-script', 'scripts', 'README.md', 'package.json', '.git']
    .forEach((f) => assert.ok(!fs.existsSync(path.join(dist, f)), 'no debe estar ' + f));
  assert.ok(!/node_modules/.test(fs.readdirSync(dist).join(',')));
});

t('sin variables, la configuración queda vacía y avisa que leerá con reglas', () => {
  const r = build({});
  assert.match(read(dist, 'js', 'config.js'), /EXTRACT_URL:\s*""/);
  assert.match(r.stdout, /reglas de palabras/);
});

t('EXTRACT_URL y ENDPOINT se escriben en dist/ y no en el repositorio', () => {
  const before = read(root, 'js', 'config.js');
  const r = build({ EXTRACT_URL: 'https://chaski-lector.ejemplo.workers.dev/extract', ENDPOINT: 'https://script.google.com/macros/s/ABC/exec' });
  assert.strictEqual(r.status, 0, r.stderr);
  const cfg = read(dist, 'js', 'config.js');
  assert.match(cfg, /EXTRACT_URL:\s*"https:\/\/chaski-lector\.ejemplo\.workers\.dev\/extract"/);
  assert.match(cfg, /ENDPOINT:\s*"https:\/\/script\.google\.com\/macros\/s\/ABC\/exec"/);
  assert.strictEqual(read(root, 'js', 'config.js'), before, 'js/config.js del repositorio no debe cambiar');
});

t('rechaza direcciones que no sean https o no sean direcciones', () => {
  const http = build({ EXTRACT_URL: 'http://inseguro.example/extract' });
  assert.notStrictEqual(http.status, 0);
  assert.match(http.stderr, /https/);
  const junk = build({ EXTRACT_URL: 'esto no es una dirección' });
  assert.notStrictEqual(junk.status, 0);
});

t('las páginas no mandan el referente (el enlace lleva el código de clase)', () => {
  build({});
  ['index.html', 'panel.html'].forEach((f) => assert.match(read(dist, f), /<meta name="referrer" content="no-referrer">/, f));
  assert.match(read(dist, '_headers'), /Referrer-Policy: no-referrer/);
});

const meta = (html, attr, name) => { const m = html.match(new RegExp('<meta ' + attr + '="' + name + '" content="([^"]*)"')); return m && m[1]; };

t('el juego trae favicon y vista previa para compartir, con la imagen en dirección completa y publicada', () => {
  assert.strictEqual(build({}).status, 0);
  const html = read(dist, 'index.html');
  assert.match(html, /<link rel="icon" href="brand\/favicon\.svg" type="image\/svg\+xml">/);
  assert.match(html, /<link rel="apple-touch-icon" href="brand\/apple-touch-icon\.png">/);
  assert.ok((meta(html, 'name', 'description') || '').length > 40, 'falta la descripción');
  assert.ok(meta(html, 'property', 'og:title') && meta(html, 'property', 'og:description'));
  assert.strictEqual(meta(html, 'name', 'twitter:card'), 'summary_large_image');
  const image = meta(html, 'property', 'og:image');
  assert.match(image, /^https:\/\//, 'WhatsApp pide la imagen con dirección completa');
  ['brand/favicon.svg', 'brand/favicon.ico', 'brand/apple-touch-icon.png', 'brand/og-image.jpg']
    .forEach((f) => assert.ok(fs.existsSync(path.join(dist, f)), 'debe estar ' + f));
  assert.strictEqual(new URL(image).pathname, '/brand/og-image.jpg');
  assert.ok(fs.statSync(path.join(dist, 'brand/og-image.jpg')).size < 300 * 1024, 'la imagen para compartir debe pesar menos de 300 KB');
  ['brand/og-image.html', 'brand/icon.html', 'brand/make-ico.mjs'].forEach((f) => assert.ok(!fs.existsSync(path.join(dist, f)), 'no debe estar ' + f));
});

t('SITE_URL cambia la dirección de la imagen al compartir, solo en dist/', () => {
  const before = read(root, 'index.html');
  const r = build({ SITE_URL: 'https://juega.ejemplo.org/cualquier/ruta' });
  assert.strictEqual(r.status, 0, r.stderr);
  const html = read(dist, 'index.html');
  assert.strictEqual(meta(html, 'property', 'og:image'), 'https://juega.ejemplo.org/brand/og-image.jpg');
  assert.ok(!html.includes('chaski.pages.dev'), 'no debe quedar la dirección por defecto');
  assert.strictEqual(read(root, 'index.html'), before, 'index.html del repositorio no debe cambiar');
  assert.notStrictEqual(build({ SITE_URL: 'http://inseguro.example' }).status, 0);
});

t('el panel lleva favicon y no se indexa', () => {
  build({});
  const html = read(dist, 'panel.html');
  assert.match(html, /<link rel="icon" href="brand\/favicon\.svg"/);
  assert.match(html, /<meta name="robots" content="noindex">/);
});

t('EXTRACT_URL acepta una ruta del mismo sitio y rechaza rutas raras', () => {
  const r = build({ EXTRACT_URL: '/extract' });
  assert.strictEqual(r.status, 0, r.stderr);
  assert.match(read(dist, 'js', 'config.js'), /EXTRACT_URL:\s*"\/extract"/);
  ['//otro.example/x', '/con espacio', '/../x', 'extract'].forEach((v) => assert.notStrictEqual(build({ EXTRACT_URL: v }).status, 0, v));
});

t('en Cloudflare Pages (CF_PAGES=1) usa /extract sin configurar nada, salvo que se indique otra dirección', () => {
  const auto = build({ CF_PAGES: '1' });
  assert.strictEqual(auto.status, 0, auto.stderr);
  assert.match(read(dist, 'js', 'config.js'), /EXTRACT_URL:\s*"\/extract"/);
  assert.match(auto.stdout, /Pages Function/);
  build({ CF_PAGES: '1', EXTRACT_URL: 'https://otro.ejemplo.workers.dev/extract' });
  assert.match(read(dist, 'js', 'config.js'), /EXTRACT_URL:\s*"https:\/\/otro\.ejemplo\.workers\.dev\/extract"/);
  build({});
  assert.match(read(dist, 'js', 'config.js'), /EXTRACT_URL:\s*""/, 'fuera de Pages no se activa solo');
});

t('las funciones de Pages no viajan dentro de dist/ (Pages las toma de la raíz del proyecto)', () => {
  build({});
  assert.ok(!fs.existsSync(path.join(dist, 'functions')));
  assert.ok(fs.existsSync(path.join(root, 'functions', 'extract.ts')));
});

let ok = 0;
for (const [name, fn] of tasks) {
  try { fn(); ok++; console.log('ok  ' + name); } catch (e) { console.log('FALLA  ' + name + '\n   ' + (e && e.message)); process.exitCode = 1; }
}
fs.rmSync(dist, { recursive: true, force: true });
console.log('\n' + ok + ' de ' + tasks.length + ' pruebas pasaron');
