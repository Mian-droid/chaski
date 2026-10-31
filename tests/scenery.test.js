/**
 * Pruebas del dibujo (js/scenery.js). Ejecutar: node tests/scenery.test.js
 * Solo cubre lo que no necesita un navegador: el paisaje y los símbolos de Chaski son texto SVG.
 */
const assert = require('assert');
const Scenery = require('../js/scenery.js');

const tasks = [];
const t = (name, fn) => tasks.push([name, fn]);
const count = (s, re) => (s.match(re) || []).length;

t('el paisaje de cada momento del día es un SVG completo y sin valores rotos', () => {
  ['amanecer', 'dia', 'atardecer'].forEach((time) => {
    const svg = Scenery.world(time);
    assert.ok(svg.startsWith('<svg ') && svg.endsWith('</svg>'), time);
    assert.ok(!/undefined|NaN|null/.test(svg), time + ': valores rotos');
    assert.strictEqual(count(svg, /<g[ >]/g), count(svg, /<\/g>/g), time + ': grupos sin cerrar');
    assert.ok(svg.includes('viewBox="0 0 1200 800"'), time);
  });
});

t('el paisaje llena cualquier pantalla: panorama anclado abajo y recortado por los lados', () => {
  assert.ok(Scenery.world('dia').includes('preserveAspectRatio="xMidYMax slice"'));
});

t('un encabezado puede mostrar solo una franja del paisaje', () => {
  const svg = Scenery.world('dia', { viewBox: '0 300 1200 330', par: 'xMidYMid slice' });
  assert.ok(svg.includes('viewBox="0 300 1200 330"') && svg.includes('preserveAspectRatio="xMidYMid slice"'));
});

t('el paisaje es siempre el mismo y cada momento del día es distinto', () => {
  assert.strictEqual(Scenery.world('dia'), Scenery.world('dia'));
  assert.notStrictEqual(Scenery.world('dia'), Scenery.world('atardecer'));
  assert.strictEqual(Scenery.world('otro'), Scenery.world('dia'), 'un momento desconocido usa el día');
});

t('los detalles del paisaje (casas, llamas, árboles, flores) quedan agrupados para poder atenuarlos', () => {
  assert.strictEqual(count(Scenery.world('dia'), /class="det"/g), 2);
});

t('Chaski tiene un símbolo por cada estado de ánimo', () => {
  ['confident', 'happy', 'oops', 'think', 'listen'].forEach((mood) => {
    const s = Scenery.symbol(mood);
    assert.ok(s.startsWith('<symbol id="ch-' + mood + '"') && s.endsWith('</symbol>'), mood);
    assert.ok(!/undefined|NaN/.test(s), mood);
  });
});

t('Chaski caminando se dibuja de frente, con piernas y brazos en grupos para animarlos', () => {
  const s = Scenery.runnerSvg('away');
  assert.ok(s.startsWith('<svg class="chsvg runner away"') && s.endsWith('</svg>'));
  assert.ok(!/undefined|NaN/.test(s));
  ['rl1', 'rl2', 'ra1', 'ra2', 'rb'].forEach((c) => assert.ok(s.includes('class="' + (c.startsWith('rb') ? c : (c.startsWith('rl') ? 'rl ' : 'ra ') + c) + '"'), c));
  assert.strictEqual((s.match(/<g[ >]/g) || []).length, (s.match(/<\/g>/g) || []).length);
  assert.ok(s.includes('class="mth"'), 'de frente: lleva cara');
});

let ok = 0;
for (const [name, fn] of tasks) {
  try { fn(); ok++; console.log('ok  ' + name); } catch (e) { console.log('FALLA  ' + name + '\n   ' + (e && e.message)); process.exitCode = 1; }
}
console.log('\n' + ok + ' de ' + tasks.length + ' pruebas pasaron');
