/**
 * Cerebro de Chaski.
 *
 * Reúne tres cosas:
 *  1. Las fichas que el estudiante le enseñó (`brain`).
 *  2. La solución de cada problema según esas fichas (`solve`, `planRound`).
 *  3. La lectura de la explicación del estudiante (`extract`): un modelo de lenguaje a través del servidor
 *     intermedio o, si no hay conexión, reglas de palabras definidas en cada tema (`heuristics`).
 *
 * El modelo solo lee: nunca resuelve. Resolver lo hacen siempre las fichas, así cada error de Chaski
 * se puede atribuir a lo que se enseñó.
 *
 * Estructura de un cerebro: { K1: {state, evidence}, K2: {...}, K3: {...} }
 *   state: "bien" | "mal" | "ausente"
 */
(function (root) {
  'use strict';

  var C = root.ChaskiContent || (typeof require !== 'undefined' ? require('./content.js') : null);
  var Core = root.ChaskiCore || (typeof require !== 'undefined' ? require('./core.js') : null);
  var IDS = ['K1', 'K2', 'K3'];
  var STATES = ['bien', 'mal', 'ausente'];

  /** @returns {object} Un cerebro vacío: las tres fichas ausentes. */
  function emptyBrain() {
    var b = {};
    IDS.forEach(function (k) { b[k] = { state: 'ausente', evidence: '' }; });
    return b;
  }

  /**
   * Une lo enseñado antes con lo nuevo. Lo nuevo gana, salvo que no diga nada de esa ficha.
   * @param {object} prev Cerebro anterior.
   * @param {object} next Cerebro leído de la última explicación.
   * @returns {object} Cerebro combinado (objeto nuevo).
   */
  function merge(prev, next) {
    var out = emptyBrain();
    IDS.forEach(function (k) {
      var p = prev && prev[k], n = next && next[k];
      if (n && n.state !== 'ausente') out[k] = { state: n.state, evidence: n.evidence || '' };
      else if (p) out[k] = { state: p.state, evidence: p.evidence || '' };
    });
    return out;
  }

  /** @returns {number} Cuántas fichas están bien enseñadas (de 3). */
  function good(brain) {
    return IDS.filter(function (k) { return brain[k] && brain[k].state === 'bien'; }).length;
  }

  /**
   * Resuelve un problema con el cerebro actual.
   * Con la ficha bien: solución correcta (o con descuido si `withSlip`). Si falta o está mal: el error típico.
   * @param {object} problem  Problema del tema activo.
   * @param {object} brain    Cerebro de Chaski.
   * @param {boolean} withSlip Si es true y el problema tiene variante `slip`, usa el descuido de cálculo.
   * @returns {{id, text, card, state, steps, said, answer, errStep, hasError, cause}}
   *   `cause` es la ficha responsable ("K1".."K3"), "S" si fue un descuido, o null si acertó.
   */
  function solve(problem, brain, withSlip) {
    var st = brain && brain[problem.card] ? brain[problem.card].state : 'ausente';
    var v = st === 'bien' ? (withSlip && problem.slip ? problem.slip : problem.ok) : problem.bad;
    var wrong = v !== problem.ok;
    return {
      id: problem.id, text: problem.text, fig: problem.fig, card: problem.card, state: st,
      steps: v.steps, said: v.said, answer: problem.answer, errStep: wrong ? v.errStep : -1,
      hasError: wrong, cause: wrong ? (v === problem.bad ? problem.card : 'S') : null
    };
  }

  /**
   * Arma la ronda de problemas. Mete un único descuido de cálculo, en el primer problema de `slipOrder`
   * cuya ficha esté bien enseñada, para que haya siempre algo que revisar.
   * @returns {object[]} Soluciones en el orden de la ronda.
   */
  function planRound(brain, ids, slipOrder) {
    ids = ids || C.round; slipOrder = slipOrder || C.slipOrder;
    var slipId = null;
    for (var i = 0; i < slipOrder.length && !slipId; i++) {
      var p = C.problems[slipOrder[i]];
      if (p && p.slip && brain[p.card] && brain[p.card].state === 'bien') slipId = p.id;
    }
    return ids.map(function (id) { return solve(C.problems[id], brain, id === slipId); });
  }

  /* ---------- lectura con reglas de palabras (respaldo sin conexión) ---------- */

  function norm(s) { return Core.strip(s).replace(/[^a-z0-9\s.,;:¿?¡!/÷×+*=%()-]/g, ' ').replace(/\s+/g, ' ').trim(); }
  function sentences(text) { return String(text).split(/(?<=[.!?;\n])\s+/).map(function (s) { return s.trim(); }).filter(Boolean); }
  function firstMatch(text, re) { var ss = sentences(text); for (var i = 0; i < ss.length; i++) if (re.test(norm(ss[i]))) return ss[i]; return ''; }
  /** True si `re` aparece en `n` sin una negación («no», «nunca», «sin») justo antes. */
  function unnegated(n, re) {
    var m, g = new RegExp(re.source, 'g');
    while ((m = g.exec(n))) {
      var before = n.slice(Math.max(0, m.index - 14), m.index);
      if (!/\b(no|nunca|sin)\b[\w\s]{0,10}$/.test(before)) return true;
    }
    return false;
  }

  /**
   * Lee la explicación con las reglas de palabras del tema activo (`C.heuristics`).
   * Es menos flexible que el modelo, pero funciona sin conexión y de forma predecible.
   * @param {string} text Lo que escribió el estudiante.
   * @returns {{cards: object, restatement: string}}
   */
  function heuristicExtract(text) {
    var n = norm(text), cards = emptyBrain(), rules = C.heuristics || {};
    IDS.forEach(function (k) {
      var r = rules[k] || {};
      if (r.mal && unnegated(n, r.mal)) cards[k] = { state: 'mal', evidence: firstMatch(text, r.mal) };
      else if (r.bien && r.bien.test(n)) cards[k] = { state: 'bien', evidence: firstMatch(text, r.bien) };
    });
    return { cards: cards, restatement: restate(cards) };
  }

  /**
   * Chaski repite lo que entendió, sin nombrar los temas que no se le enseñaron.
   * @param {object} cards Cerebro.
   * @returns {string}
   */
  function restate(cards) {
    var bits = IDS.filter(function (k) { return cards[k] && cards[k].state !== 'ausente'; })
      .map(function (k) { return C.cards[k].belief[cards[k].state]; });
    if (!bits.length) return 'Mmm, todavía no entendí nada. ¿Me lo explicas con otro ejemplo?';
    return 'Entendí que ' + bits.join('; y que ') + '. De lo demás todavía no sé nada.';
  }

  /* ---------- lectura con el modelo (a través del servidor intermedio) ---------- */

  /**
   * Valida la respuesta del servidor. Cualquier desvío del formato la descarta.
   * @param {object} o Respuesta ya interpretada como JSON.
   * @returns {{cards: object, restatement: string}|null} La lectura limpia, o null si no es válida.
   */
  function validExtraction(o) {
    if (!o || typeof o !== 'object' || !o.cards || typeof o.restatement !== 'string') return null;
    var cards = emptyBrain();
    for (var i = 0; i < IDS.length; i++) {
      var c = o.cards[IDS[i]];
      if (!c || STATES.indexOf(c.state) === -1) return null;
      cards[IDS[i]] = { state: c.state, evidence: c.state === 'ausente' ? '' : String(c.evidence || '').slice(0, 200) };
    }
    return { cards: cards, restatement: o.restatement.slice(0, 400) };
  }

  /**
   * Lee la explicación. Primero pide al servidor (modelo); si falla, tarda o responde algo inválido,
   * cae a las reglas de palabras. Nunca rechaza la promesa.
   * @param {string} text Explicación del estudiante.
   * @param {{url?: string, topic?: string, fetch?: Function, timeout?: number}} [opts]
   *   url: dirección de /extract; topic: id del tema; timeout: milisegundos (12000 por defecto).
   * @returns {Promise<{cards, restatement, source: "modelo"|"reglas", why?: string}>}
   */
  function extract(text, opts) {
    opts = opts || {};
    var url = opts.url, fetchFn = opts.fetch || (typeof fetch !== 'undefined' ? fetch : null), timeout = opts.timeout || 12000;
    var fallback = function (why) { var h = heuristicExtract(text); h.source = 'reglas'; h.why = why; return h; };
    if (!url || !fetchFn) return Promise.resolve(fallback('sin servidor'));
    var ctl = typeof AbortController !== 'undefined' ? new AbortController() : null;
    var timer = ctl ? setTimeout(function () { ctl.abort(); }, timeout) : null;
    return fetchFn(url, {
      method: 'POST', headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ text: String(text).slice(0, 800), topic: opts.topic }),
      signal: ctl ? ctl.signal : undefined
    })
      .then(function (r) { if (!r.ok) throw new Error('http ' + r.status); return r.json(); })
      .then(function (j) { var v = validExtraction(j); if (!v) throw new Error('respuesta inválida'); v.source = 'modelo'; return v; })
      .catch(function (e) { return fallback(String(e && e.message || e)); })
      .then(function (r) { if (timer) clearTimeout(timer); return r; });
  }

  /**
   * ¿Chaski casi no entendió? Es verdad cuando ninguna de las tres ideas quedó enseñada, ni bien ni mal.
   * Si alguna quedó «mal», no: ahí Chaski debe equivocarse para que el estudiante o su docente lo noten.
   */
  function vague(brain) {
    return IDS.every(function (k) { return brain[k] && brain[k].state === 'ausente'; });
  }

  var api = { vague: vague,
    IDS: IDS, emptyBrain: emptyBrain, merge: merge, good: good, solve: solve, planRound: planRound,
    heuristicExtract: heuristicExtract, restate: restate, validExtraction: validExtraction, extract: extract
  };
  root.ChaskiBrain = api;
  if (typeof module !== 'undefined' && module.exports) module.exports = api;
})(typeof window !== 'undefined' ? window : globalThis);
