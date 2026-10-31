/**
 * Pruebas de las figuras de los problemas (js/figures.js y el campo `fig` de js/content.js).
 * Ejecutar: node tests/figures.test.js
 * Lo importante: la figura debe mostrar los mismos datos que el enunciado y nunca la respuesta.
 */
const assert = require('assert');
const Figures = require('../js/figures.js');
const C = require('../js/content.js');
const Brain = require('../js/brain.js');

const tasks = [];
const t = (name, fn) => tasks.push([name, fn]);
const count = (s, re) => (s.match(re) || []).length;
const nums = (s) => (String(s).match(/\d+(?:[.,]\d+)?/g) || []).map((n) => Number(n.replace(',', '.')));
const TOPICS = ['proporciones', 'porcentajes', 'ecuaciones'];

t('cada tipo de figura sale como un SVG completo, con su descripción para lectores de pantalla', () => {
  const specs = [
    { type: 'table', rows: [['Cuadernos', '2', '8'], ['Soles', '6', '?']] },
    { type: 'bar', pct: 20, whole: '150', part: '?', unit: 'estudiantes' },
    { type: 'balance', left: 'x + 8', right: '20' }
  ];
  specs.forEach((spec) => {
    const svg = Figures.svg(spec);
    assert.ok(svg.startsWith('<svg ') && svg.endsWith('</svg>'), spec.type);
    assert.ok(/role="img" aria-label="[^"]{15,}"/.test(svg), spec.type + ': sin descripción');
    assert.ok(!/undefined|NaN|\[object/.test(svg), spec.type + ': valores rotos');
    assert.strictEqual(count(svg, /<g[ >]/g), count(svg, /<\/g>/g), spec.type);
  });
  assert.deepStrictEqual(Figures.types.sort(), ['balance', 'bar', 'table']);
});

t('lo desconocido se marca como tal, y la descripción dice «desconocido» y no «?»', () => {
  const tbl = Figures.svg({ type: 'table', rows: [['Obreros', '4', '8'], ['Días', '6', '?']] });
  assert.strictEqual(count(tbl, /class="f-unk"/g), 1);
  assert.ok(/Días: 6, desconocido/.test(tbl) && !/aria-label="[^"]*\?/.test(tbl));
  const b = Figures.svg({ type: 'bar', pct: 20, whole: '?', part: '30', unit: 'entradas' });
  assert.ok(/100% = \?/.test(b) && /20% = 30 entradas/.test(b));
});

t('una descripción inválida no dibuja nada y el texto se escapa', () => {
  ['', null, undefined, { type: 'otro' }, { type: 'table', rows: [] }, { type: 'bar', pct: 0 }, { type: 'bar', pct: 100 }, { type: 'balance', left: 'x' }]
    .forEach((spec) => assert.strictEqual(Figures.svg(spec), '', JSON.stringify(spec)));
  const svg = Figures.svg({ type: 'balance', left: '<b>x</b>', right: '"20"' });
  assert.ok(!svg.includes('<b>') && svg.includes('&lt;b&gt;') && svg.includes('&quot;20&quot;'));
});

TOPICS.forEach((id) => {
  t(`[${id}] cada figura muestra datos del enunciado, tiene una sola incógnita y no revela la respuesta`, () => {
    C.use(id);
    const withFig = Object.values(C.problems).filter((p) => p.fig);
    assert.ok(withFig.length >= 4, 'debe haber al menos 4 problemas con figura');
    withFig.forEach((p) => {
      const f = p.fig, said = f.type === 'table' ? f.rows.slice(0).flat() : f.type === 'bar' ? [f.whole, f.part, f.pct + '%'] : [f.left, f.right];
      const unknowns = said.filter((v) => String(v).trim() === '?').length;
      assert.ok(unknowns <= 1, `${id}/${p.id}: más de una incógnita`);
      if (f.type !== 'balance') assert.strictEqual(unknowns, 1, `${id}/${p.id}: debe marcar lo que se pregunta`);
      const shown = nums(said.join(' '));
      const inText = nums(p.text);
      shown.forEach((n) => assert.ok(inText.includes(n), `${id}/${p.id}: la figura muestra ${n}, que no está en el enunciado`));
      assert.ok(!shown.includes(p.answer) || inText.includes(p.answer), `${id}/${p.id}: la figura muestra la respuesta`);
      assert.ok(Figures.svg(f).length > 200, `${id}/${p.id}: figura vacía`);
    });
  });
});

t('la figura viaja en el plan de la ronda, también cuando Chaski se equivoca', () => {
  C.use('porcentajes');
  const brain = { K1: { state: 'bien' }, K2: { state: 'ausente' }, K3: { state: 'mal' } };
  const plan = Brain.planRound(brain);
  const p1 = plan.find((x) => x.id === 'p1');
  assert.strictEqual(p1.fig.type, 'bar');
  assert.ok(plan.filter((x) => x.fig).length >= 4);
  assert.strictEqual(JSON.parse(JSON.stringify(p1)).fig.pct, 20, 'sobrevive a guardarse en el dispositivo');
});

t('«casi no entendió» solo si ninguna idea quedó enseñada; una idea mal enseñada no cuenta', () => {
  const st = (a, b, c) => ({ K1: { state: a }, K2: { state: b }, K3: { state: c } });
  assert.strictEqual(Brain.vague(st('ausente', 'ausente', 'ausente')), true);
  assert.strictEqual(Brain.vague(st('bien', 'ausente', 'ausente')), false);
  assert.strictEqual(Brain.vague(st('ausente', 'mal', 'ausente')), false, 'si dijo algo equivocado, Chaski debe equivocarse y no repreguntar');
  assert.strictEqual(Brain.vague(Brain.emptyBrain()), true);
});

t('la repregunta tiene su pregunta y su aviso en todos los temas', () => {
  TOPICS.forEach((id) => {
    C.use(id);
    assert.strictEqual(C.clarify.k, 'tc');
    assert.ok(C.clarify.say.length > 30 && C.clarify.needNumbers === true);
    assert.ok(C.lines.clarify.length > 30);
  });
});

let ok = 0;
for (const [name, fn] of tasks) {
  try { fn(); ok++; console.log('ok  ' + name); } catch (e) { console.log('FALLA  ' + name + '\n   ' + (e && e.message)); process.exitCode = 1; }
}
console.log('\n' + ok + ' de ' + tasks.length + ' pruebas pasaron');
