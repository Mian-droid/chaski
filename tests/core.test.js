/**
 * Pruebas del núcleo de Chaski (sin dependencias). Ejecutar: node tests/core.test.js
 * Cubre: contenido de los tres temas, cerebro, lectura con reglas, lectura con servidor simulado,
 * originalidad y métricas.
 */
const assert = require('assert');
const Core = require('../js/core.js');
const C = require('../js/content.js');
const Brain = require('../js/brain.js');

const tasks = [];
function t(name, fn) { tasks.push([name, fn]); }
const TOPICS = ['proporciones', 'porcentajes', 'ecuaciones'];
const taught = (k1, k2, k3) => ({ K1: { state: k1, evidence: '' }, K2: { state: k2, evidence: '' }, K3: { state: k3, evidence: '' } });
const near = (a, b) => Math.abs(a - b) < 1e-9;

/* ---------------------------------------------------------------------------------------------
 * Utilidades
 * ------------------------------------------------------------------------------------------- */
t('parseNum acepta coma, punto y texto', () => {
  assert.strictEqual(Core.parseNum('3,5'), 3.5);
  assert.strictEqual(Core.parseNum(' S/ 24 soles'), 24);
  assert.strictEqual(Core.parseNum('abc'), null);
  assert.strictEqual(Core.parseNum(''), null);
});

t('personalData detecta correo, teléfono y documento, y deja pasar los números de matemática', () => {
  const pd = Core.personalData;
  assert.strictEqual(pd('escríbeme a juan@gmail.com'), 'correo');
  assert.strictEqual(pd('mi cel es 987654321'), 'teléfono');
  assert.strictEqual(pd('987 654 321'), 'teléfono');
  assert.strictEqual(pd('+51 987-654-321'), 'teléfono');
  assert.strictEqual(pd('mi dni es 12345678'), 'documento');
  ['el 20% de 150 es 30', '2 cuadernos cuestan 6 soles y 8 cuestan 24', '12 000 000 soles', '1 000 000 y 2.500', 'x + 8 = 20 entonces x = 12'].forEach((s) => assert.strictEqual(pd(s), '', s));
  assert.strictEqual(pd(''), '');
  assert.strictEqual(pd(null), '');
});

t('numEq con tolerancia', () => {
  assert.ok(Core.numEq(24, 24.004));
  assert.ok(!Core.numEq(24, 12));
  assert.ok(!Core.numEq(null, 12));
});

/* ---------------------------------------------------------------------------------------------
 * Contenido: estructura común a todos los temas
 * ------------------------------------------------------------------------------------------- */
TOPICS.forEach((id) => {
  t(`[${id}] estructura: fichas, ronda de 6 con 2 problemas por ficha, descuidos y sondeos`, () => {
    C.use(id);
    assert.strictEqual(C.topic.id, id);
    ['K1', 'K2', 'K3'].forEach((k) => {
      assert.ok(C.cards[k].title && C.cards[k].text && C.cards[k].short, k);
      assert.ok(C.cards[k].belief.bien && C.cards[k].belief.mal, k + ' belief');
    });
    assert.ok(C.cards.S, 'ficha de descuido');
    assert.strictEqual(C.round.length, 6);
    const perCard = {};
    C.round.forEach((pid) => { perCard[C.problems[pid].card] = (perCard[C.problems[pid].card] || 0) + 1; });
    assert.deepStrictEqual(perCard, { K1: 2, K2: 2, K3: 2 });
    C.slipOrder.forEach((pid) => assert.ok(C.problems[pid].slip, pid + ' debe tener descuido'));
    const kinds = C.probes.map((p) => p.kind);
    assert.deepStrictEqual(kinds, ['num', 'num', 'num', 'free']);
    assert.deepStrictEqual(C.probes.filter((p) => p.kind === 'num').map((p) => p.rule).sort(), ['K1', 'K2', 'K3']);
    assert.ok(C.teach.length === 2 && C.lines.intro.join(' ').includes(C.topic.about));
  });

  t(`[${id}] cada problema: solución correcta dice la respuesta, la equivocada difiere y señala un paso real`, () => {
    C.use(id);
    Object.keys(C.problems).forEach((pid) => {
      const p = C.problems[pid];
      assert.strictEqual(p.ok.said, p.answer, pid);
      assert.notStrictEqual(p.bad.said, p.answer, pid + ' bad');
      assert.ok(p.bad.errStep >= 0 && p.bad.errStep < p.bad.steps.length, pid + ' errStep');
      assert.strictEqual(p.bad.steps.length, p.ok.steps.length, pid + ' mismo número de pasos');
      if (p.slip) {
        assert.notStrictEqual(p.slip.said, p.answer, pid + ' slip');
        assert.strictEqual(p.slip.steps.length, p.ok.steps.length);
        assert.ok(p.slip.errStep === p.ok.steps.length - 1, pid + ': el descuido está en la última cuenta');
      }
    });
  });
});

t('use() con un tema desconocido vuelve a proporciones', () => {
  C.use('no-existe');
  assert.strictEqual(C.topic.id, 'proporciones');
});

/* ---------------------------------------------------------------------------------------------
 * Contenido: las cuentas de cada tema, calculadas de forma independiente
 * ------------------------------------------------------------------------------------------- */
t('[proporciones] respuestas correctas y errores coherentes con su propio razonamiento', () => {
  C.use('proporciones');
  const direct = (a, b, c) => (b / a) * c, inverse = (a, b, c) => (a * b) / c, P = C.problems;
  assert.strictEqual(P.p1.answer, direct(2, 6, 8));
  assert.strictEqual(P.p2.answer, direct(12, 3, 36));
  assert.strictEqual(P.p3.answer, inverse(4, 6, 8));
  assert.strictEqual(P.p4.answer, direct(3, 12, 5));
  assert.strictEqual(P.p5.answer, direct(5, 10, 7));
  assert.strictEqual(P.p6.answer, inverse(6, 10, 12));
  assert.strictEqual(P.p1.bad.said, 6 + 6);
  assert.strictEqual(P.p2.bad.said, 3 + 24);
  assert.strictEqual(P.p3.bad.said, 6 * 2);
  assert.strictEqual(P.p4.bad.said, 15 / 12);
  assert.strictEqual(P.p5.bad.said, 35 / 10);
  assert.strictEqual(P.p6.bad.said, 10 * 2);
  assert.strictEqual(C.probes[0].answer, direct(2, 6, 5));
  assert.strictEqual(C.probes[1].answer, inverse(4, 6, 12));
  assert.strictEqual(C.probes[2].answer, direct(5, 10, 10));
});

t('[porcentajes] respuestas correctas y errores coherentes con su propio razonamiento', () => {
  C.use('porcentajes');
  const P = C.problems;
  assert.ok(near(P.p1.answer, 150 * 20 / 100));
  assert.ok(near(P.p2.answer, 150 - 150 * 20 / 100));
  assert.ok(near(P.p3.answer, 30 / 20 * 100));
  assert.ok(near(P.p4.answer, 80 * 25 / 100));
  assert.ok(near(P.p5.answer, 2000 + 2000 * 10 / 100));
  assert.ok(near(P.p6.answer, 60 / 40 * 100));
  assert.ok(near(P.p1.bad.said, 150 / 20));
  assert.ok(near(P.p2.bad.said, 150 - 20));
  assert.ok(near(P.p3.bad.said, 30 * 20 / 100));
  assert.ok(near(P.p4.bad.said, 80 / 25));
  assert.ok(near(P.p5.bad.said, 2000 + 10));
  assert.ok(near(P.p6.bad.said, 60 * 40 / 100));
  assert.ok(near(C.probes[0].answer, 250 * 30 / 100));
  assert.ok(near(C.probes[1].answer, 80 - 80 * 25 / 100));
  assert.ok(near(C.probes[2].answer, 24 / 30 * 100));
});

t('[ecuaciones] cada respuesta cumple su ecuación y cada error sale de su equivocación', () => {
  C.use('ecuaciones');
  const P = C.problems;
  const eq = { p1: (x) => x + 8 === 20, p2: (x) => 2 * (x + 3) === 14, p3: (x) => 3 * x + 6 === 21, p4: (x) => x - 5 === 9, p5: (x) => 4 * (x - 2) === 20, p6: (x) => 2 * x + 10 === 30 };
  Object.keys(eq).forEach((id) => {
    assert.ok(eq[id](P[id].answer), id + ' la respuesta cumple la ecuación');
    assert.ok(!eq[id](P[id].bad.said), id + ' la respuesta equivocada no la cumple');
  });
  assert.strictEqual(P.p1.bad.said, 20 + 8);          // pasa sumando sin cambiar de signo
  assert.strictEqual(P.p2.bad.said, (14 - 3) / 2);    // el 2 solo multiplica a la x
  assert.strictEqual(P.p3.bad.said, 21 / 3 - 6);      // divide solo algunos términos
  assert.strictEqual(P.p4.bad.said, 9 - 5);
  assert.strictEqual(P.p5.bad.said, (20 + 2) / 4);
  assert.strictEqual(P.p6.bad.said, 30 / 2 - 10);
  assert.strictEqual(P.p2.slip.said, 9 / 2);          // 2x = 14 − 6 mal restado
  assert.strictEqual(C.probes[0].answer, 15 - 6);
  assert.ok(3 * (C.probes[1].answer + 1) === 18);
  assert.ok(4 * C.probes[2].answer + 8 === 32);
});

/* ---------------------------------------------------------------------------------------------
 * Cerebro
 * ------------------------------------------------------------------------------------------- */
TOPICS.forEach((id) => {
  t(`[${id}] cerebro: con las 3 fichas bien todo es correcto salvo un único descuido`, () => {
    C.use(id);
    const plan = Brain.planRound(taught('bien', 'bien', 'bien'));
    const wrong = plan.filter((x) => x.hasError);
    assert.strictEqual(plan.length, 6);
    assert.strictEqual(wrong.length, 1);
    assert.strictEqual(wrong[0].cause, 'S');
    assert.strictEqual(wrong[0].id, 'p2');
    assert.ok(wrong[0].errStep >= 0);
  });

  t(`[${id}] cerebro: sin enseñar nada se equivoca en los 6 y la causa es cada ficha`, () => {
    C.use(id);
    const plan = Brain.planRound(Brain.emptyBrain());
    assert.strictEqual(plan.filter((x) => x.hasError).length, 6);
    assert.ok(plan.every((x) => x.cause === x.card));
  });

  t(`[${id}] cerebro: el error sale solo de la ficha que falta o está mal`, () => {
    C.use(id);
    const plan = Brain.planRound(taught('bien', 'ausente', 'mal'));
    plan.forEach((x) => {
      if (x.card === 'K1') assert.ok(!x.hasError || x.cause === 'S', x.id);
      else assert.ok(x.hasError && x.cause === x.card, x.id);
    });
    assert.strictEqual(plan.filter((x) => x.cause === 'S').length, 1);
  });
});

t('cerebro: el descuido pasa a otro problema si su ficha no está bien', () => {
  C.use('proporciones');
  const slip = Brain.planRound(taught('ausente', 'bien', 'bien')).filter((x) => x.cause === 'S');
  assert.strictEqual(slip.length, 1);
  assert.strictEqual(slip[0].id, 'p6');
});

t('cerebro: solución mal marcada apunta al paso equivocado y la correcta no', () => {
  C.use('proporciones');
  const s = Brain.solve(C.problems.p1, taught('mal', 'ausente', 'ausente'), false);
  assert.ok(s.hasError);
  assert.strictEqual(s.errStep, 1);
  assert.strictEqual(s.said, 12);
  const ok = Brain.solve(C.problems.p1, taught('bien', 'ausente', 'ausente'), false);
  assert.ok(!ok.hasError && ok.errStep === -1 && ok.said === ok.answer && ok.cause === null);
});

t('cerebro: unir lo enseñado, lo nuevo gana salvo que no diga nada', () => {
  const m = Brain.merge(taught('mal', 'bien', 'ausente'), taught('bien', 'ausente', 'bien'));
  assert.deepStrictEqual(['K1', 'K2', 'K3'].map((k) => m[k].state), ['bien', 'bien', 'bien']);
  assert.strictEqual(Brain.good(m), 3);
  assert.strictEqual(Brain.merge(taught('mal', 'bien', 'ausente'), Brain.emptyBrain()).K1.state, 'mal');
});

/* ---------------------------------------------------------------------------------------------
 * Lectura con reglas de palabras, por tema
 * ------------------------------------------------------------------------------------------- */
const states = (r) => ['K1', 'K2', 'K3'].map((k) => r.cards[k].state);

t('[proporciones] lectura con reglas', () => {
  C.use('proporciones');
  const a = Brain.heuristicExtract('Si compras el doble pagas el doble. Se multiplican las dos cantidades por lo mismo.');
  assert.deepStrictEqual(states(a), ['bien', 'ausente', 'ausente']);
  assert.ok(/multiplica/.test(a.restatement));
  assert.strictEqual(Brain.heuristicExtract('Si sube uno, al otro le sumas lo mismo').cards.K1.state, 'mal');
  assert.strictEqual(Brain.heuristicExtract('No se suma, se multiplica por el mismo número').cards.K1.state, 'bien');
  const b = Brain.heuristicExtract('Si hay más obreros se necesitan menos días, es inversa. Pongo kilos con kilos y soles con soles, en el mismo orden.');
  assert.deepStrictEqual(states(b), ['ausente', 'bien', 'bien']);
  const v = Brain.heuristicExtract('no sé');
  assert.deepStrictEqual(states(v), ['ausente', 'ausente', 'ausente']);
  assert.ok(/todavía no entendí nada/.test(v.restatement));
});

t('[porcentajes] lectura con reglas', () => {
  C.use('porcentajes');
  assert.strictEqual(Brain.heuristicExtract('Para sacar el 20% de 150 multiplico 150 por 20 y lo divido entre 100.').cards.K1.state, 'bien');
  assert.strictEqual(Brain.heuristicExtract('Si hay descuento, calculo el porcentaje y se lo resto al precio.').cards.K2.state, 'bien');
  assert.strictEqual(Brain.heuristicExtract('Si hay un aumento, calculo el porcentaje y se lo sumo.').cards.K2.state, 'bien');
  assert.strictEqual(Brain.heuristicExtract('En un descuento le resto 20 soles al precio').cards.K2.state, 'mal');
  assert.strictEqual(Brain.heuristicExtract('Si me dan la parte y el porcentaje, el total lo saco dividiendo entre el porcentaje y multiplicando por 100').cards.K3.state, 'bien');
  assert.deepStrictEqual(states(Brain.heuristicExtract('El porcentaje es algo de una cantidad')), ['ausente', 'ausente', 'ausente']);
});

t('[ecuaciones] lectura con reglas', () => {
  C.use('ecuaciones');
  assert.strictEqual(Brain.heuristicExtract('Cuando un número pasa al otro lado cambia de signo').cards.K1.state, 'bien');
  assert.strictEqual(Brain.heuristicExtract('Los números pasan al otro lado sin cambiar de signo').cards.K1.state, 'mal');
  assert.strictEqual(Brain.heuristicExtract('El número de afuera multiplica a todos los términos del paréntesis').cards.K2.state, 'bien');
  assert.strictEqual(Brain.heuristicExtract('El 2 multiplica solo a la x del paréntesis').cards.K2.state, 'mal');
  assert.strictEqual(Brain.heuristicExtract('Primero paso los números que suman o restan y al final divido entre el de la x').cards.K3.state, 'bien');
  assert.deepStrictEqual(states(Brain.heuristicExtract('Una ecuación tiene una x')), ['ausente', 'ausente', 'ausente']);
});

/* ---------------------------------------------------------------------------------------------
 * Lectura con el servidor (simulado)
 * ------------------------------------------------------------------------------------------- */
t('validar la respuesta del servidor: formato estricto', () => {
  const ok = { cards: { K1: { state: 'bien', evidence: 'x' }, K2: { state: 'ausente', evidence: 'ignorada' }, K3: { state: 'mal', evidence: 'y' } }, restatement: 'Entendí algo.' };
  const v = Brain.validExtraction(ok);
  assert.strictEqual(v.cards.K2.evidence, '');
  assert.strictEqual(v.cards.K3.state, 'mal');
  assert.strictEqual(Brain.validExtraction({ cards: { K1: { state: 'quizás' } }, restatement: '' }), null);
  assert.strictEqual(Brain.validExtraction(null), null);
  assert.strictEqual(Brain.validExtraction({ cards: ok.cards }), null);
});

t('extraer: usa el servidor, le manda el tema y marca la fuente', async () => {
  C.use('porcentajes');
  const body = { cards: { K1: { state: 'bien', evidence: 'multiplico' }, K2: { state: 'ausente', evidence: '' }, K3: { state: 'ausente', evidence: '' } }, restatement: 'Entendí que se multiplica.' };
  let sent;
  const r = await Brain.extract('multiplico por 20', { url: 'http://x/extract', topic: 'porcentajes', fetch: async (u, init) => { sent = JSON.parse(init.body); return { ok: true, json: async () => body }; } });
  assert.strictEqual(r.source, 'modelo');
  assert.strictEqual(sent.topic, 'porcentajes');
  assert.strictEqual(sent.text, 'multiplico por 20');
});

t('extraer: si el servidor falla o devuelve basura, cae a las reglas del tema activo', async () => {
  C.use('proporciones');
  const bad = await Brain.extract('Se multiplica por el mismo número', { url: 'http://x', fetch: async () => ({ ok: true, json: async () => ({ hola: 1 }) }) });
  assert.strictEqual(bad.source, 'reglas');
  assert.strictEqual(bad.cards.K1.state, 'bien');
  const down = await Brain.extract('Se multiplica por el mismo número', { url: 'http://x', fetch: async () => { throw new Error('sin red'); } });
  assert.strictEqual(down.source, 'reglas');
  assert.strictEqual((await Brain.extract('x', { url: 'http://x', fetch: async () => ({ ok: false, status: 502 }) })).source, 'reglas');
  assert.strictEqual((await Brain.extract('Se multiplica', {})).source, 'reglas');
});

/* ---------------------------------------------------------------------------------------------
 * Originalidad
 * ------------------------------------------------------------------------------------------- */
t('originalidad: definición copiada vale 0, propia vale 2', () => {
  C.use('proporciones');
  const opts = { refs: C.refs, minWords: 5 };
  assert.strictEqual(Core.originality('Una proporción es la igualdad de dos razones', opts).score, 0);
  assert.strictEqual(Core.originality('Es cuando algo crece parejo: si compras el doble, pagas el doble', opts).score, 2);
  assert.strictEqual(Core.originality('no se', opts).score, 0);
});

t('originalidad: pegado fuerza 0, mismo ejemplo baja, ejemplo nuevo vale 2', () => {
  C.use('proporciones');
  const o = { refs: C.refs, needNumbers: true, contextNumbers: C.contextNumbers, minWords: 4 };
  assert.strictEqual(Core.originality('Si 4 panes cuestan 8 soles, entonces 8 panes cuestan 16', Object.assign({ pasted: true }, o)).score, 0);
  assert.ok(Core.originality('si 2 cuadernos cuestan 6 soles entonces 4 cuadernos cuestan 12 soles', o).score < 2);
  assert.strictEqual(Core.originality('Si 7 panes cuestan 14 soles, entonces 21 panes cuestan 42 soles', o).score, 2);
});

t('originalidad: repetir lo anterior se detecta con prior', () => {
  const prev = 'Si 7 panes cuestan 14 soles, entonces 21 panes cuestan 42 soles';
  assert.strictEqual(Core.originality(prev, { refs: [], prior: [prev], needNumbers: true, contextNumbers: [], minWords: 4 }).score, 0);
});

/* ---------------------------------------------------------------------------------------------
 * Métricas
 * ------------------------------------------------------------------------------------------- */
const ev = (type, o) => Object.assign({ type, ts: 1, alias: 'Ana', cls: 'A1', sid: 's1', day: 1, topic: 'proporciones' }, o);

t('métricas: detección, falsas alarmas, dependencia y calidad de enseñanza', () => {
  const evs = [
    ev('brain', { cards: taught('bien', 'ausente', 'mal') }),
    ev('ex', { rule: 'K1', hasError: true, saidError: true, correctionOk: true }),
    ev('ex', { rule: 'K3', hasError: true, saidError: false }),
    ev('ex', { rule: 'S', hasError: true, saidError: true, correctionOk: false }),
    ev('ex', { rule: null, hasError: false, saidError: false }),
    ev('ex', { rule: null, hasError: false, saidError: true }),
    ev('ex', { rule: null, hasError: false, saidError: false }),
    ev('probe', { kind: 'num', ok: true }), ev('probe', { kind: 'num', ok: false }), ev('probe', { kind: 'num', ok: true }),
    ev('probe', { kind: 'free', orig: { score: 2 } }),
    ev('teach', { orig: { score: 0 }, pasted: true }), ev('teach', { orig: { score: 2 } })
  ];
  const m = Core.metricsFor(evs);
  assert.strictEqual(m.hits, 2);
  assert.strictEqual(m.misses, 1);
  assert.strictEqual(m.falseAlarms, 1);
  assert.strictEqual(m.corrected, 1);
  assert.deepStrictEqual(m.missedByRule, { K3: 1 });
  assert.strictEqual(m.discrimination, 0.33);
  assert.strictEqual(m.probesOk, 2);
  assert.strictEqual(m.pasted, 1);
  assert.strictEqual(m.dependence, 0.33);
  assert.strictEqual(m.cardsBien, 1);
  assert.strictEqual(m.cardsMal, 1);
  assert.strictEqual(m.teachTurns, 2);
});

t('dictado: se agrega al final con un espacio y respeta el límite de la tablilla', () => {
  assert.deepStrictEqual(Core.appendDictation('', 'Si compras el doble', 400), { text: 'Si compras el doble', cut: false });
  assert.deepStrictEqual(Core.appendDictation('Primero esto.', '  luego   aquello ', 400), { text: 'Primero esto. luego aquello', cut: false });
  assert.deepStrictEqual(Core.appendDictation('Ya escribí ', 'y sigo', 400), { text: 'Ya escribí y sigo', cut: false }, 'no duplica el espacio');
  assert.deepStrictEqual(Core.appendDictation('algo', '   ', 400), { text: 'algo', cut: false }, 'lo vacío no cambia nada');
  assert.deepStrictEqual(Core.appendDictation(null, undefined, 400), { text: '', cut: false });
  const cut = Core.appendDictation('uno dos', 'tres cuatro cinco', 14);
  assert.strictEqual(cut.cut, true);
  assert.strictEqual(cut.text, 'uno dos tres', 'corta en una palabra completa');
  assert.ok(Core.appendDictation('x'.repeat(390), 'palabra '.repeat(20), 400).text.length <= 400);
  assert.strictEqual(Core.appendDictation('a'.repeat(400), 'más', 400).text.length, 400, 'si la tablilla está llena no agrega nada');
});

t('métricas: cuenta los textos dictados por voz y cuántos revisó el estudiante', () => {
  const m = Core.metricsFor([
    { type: 'teach', text: 'a', orig: { score: 2 }, voz: true, editado: true, vozMs: 9000 },
    { type: 'teach', text: 'b', orig: { score: 2 }, voz: true, editado: false, vozMs: 4000 },
    { type: 'probe', kind: 'free', text: 'c', orig: { score: 2 } },
    { type: 'teach', text: 'd', orig: { score: 2 }, editado: true }
  ]);
  assert.strictEqual(m.voiced, 2);
  assert.strictEqual(m.voiceEdited, 1);
  assert.strictEqual(m.nTexts, 4);
  const none = Core.metricsFor([{ type: 'teach', text: 'a', orig: { score: 2 } }]);
  assert.strictEqual(none.voiced, 0);
  assert.strictEqual(none.voiceEdited, 0);
});

t('métricas: sin datos no revienta', () => {
  const m = Core.metricsFor([]);
  assert.strictEqual(m.hitRate, null);
  assert.strictEqual(m.dependence, null);
  assert.strictEqual(m.cardsBien, null);
});

t('agrupación: por estudiante y tema, con la última sesión y filtros', () => {
  const evs = [
    ev('ex', { sid: 'old', ts: 0, rule: 'K1', hasError: true, saidError: false }),
    ev('ex', { sid: 'new', ts: 5, rule: 'K1', hasError: true, saidError: true }),
    ev('ex', { sid: 'pc', ts: 6, topic: 'porcentajes', rule: 'K2', hasError: true, saidError: true }),
    ev('ex', { sid: 'z', ts: 3, alias: 'Luis', cls: 'B2', rule: 'K1', hasError: true, saidError: true }),
    ev('ex', { sid: 'legacy', ts: 4, alias: 'Rosa', cls: 'A1', topic: undefined, rule: 'K1', hasError: true, saidError: true })
  ];
  assert.strictEqual(Core.groupStudents(evs).length, 4);
  const ana = Core.groupStudents(evs, 'a1', 'proporciones').find((s) => s.alias === 'Ana');
  assert.strictEqual(ana.m.hits, 1, 'solo cuenta la última sesión');
  assert.strictEqual(Core.groupStudents(evs, 'A1', 'porcentajes').length, 1);
  assert.strictEqual(Core.groupStudents(evs, 'A1', 'proporciones').find((s) => s.alias === 'Rosa').topic, 'proporciones', 'sin tema = proporciones');
});

/* ---------------------------------------------------------------------------------------------
 * Ejecución
 * ------------------------------------------------------------------------------------------- */
(async () => {
  let ok = 0;
  for (const [name, fn] of tasks) {
    try { await fn(); ok++; console.log('ok  ' + name); }
    catch (e) { console.log('FALLA  ' + name + '\n   ' + (e && e.message)); process.exitCode = 1; }
  }
  console.log('\n' + ok + ' de ' + tasks.length + ' pruebas pasaron');
})();
