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
const build = (env) => spawnSync(process.execPath, ['scripts/build-site.mjs'], { cwd: root, env: Object.assign({}, process.env, { EXTRACT_URL: '', ENDPOINT: '' }, env), encoding: 'utf8' });
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

let ok = 0;
for (const [name, fn] of tasks) {
  try { fn(); ok++; console.log('ok  ' + name); } catch (e) { console.log('FALLA  ' + name + '\n   ' + (e && e.message)); process.exitCode = 1; }
}
fs.rmSync(dist, { recursive: true, force: true });
console.log('\n' + ok + ' de ' + tasks.length + ' pruebas pasaron');
