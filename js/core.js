/**
 * Funciones puras de Chaski: lectura de números, señal de originalidad de las explicaciones y métricas del piloto.
 * No usan el DOM, por eso se pueden probar en Node (tests/core.test.js).
 */
(function (root) {
  'use strict';

  /** Minúsculas y sin tildes, para comparar textos. */
  function strip(s) {
    return String(s == null ? '' : s).toLowerCase().normalize('NFD').replace(/[̀-ͯ]/g, '');
  }
  /** Palabras (letras y números) de un texto, sin tildes ni signos. */
  function words(s) {
    return strip(s).replace(/[^a-z0-9\s]/g, ' ').split(/\s+/).filter(Boolean);
  }
  /** Redondea a `d` decimales (2 por defecto). */
  function round(x, d) { var p = Math.pow(10, d == null ? 2 : d); return Math.round(x * p) / p; }

  /**
   * Lee el primer número de un texto. Acepta coma o punto decimal.
   * @returns {number|null} null si no hay número.
   */
  function parseNum(s) {
    var m = String(s == null ? '' : s).match(/-?\d+(?:[.,]\d+)?/);
    return m ? Number(m[0].replace(',', '.')) : null;
  }
  /** Compara dos números con una tolerancia (0,01 por defecto). Devuelve false si alguno no es un número. */
  function numEq(a, b, tol) {
    if (a == null || b == null || isNaN(a) || isNaN(b)) return false;
    return Math.abs(a - b) <= (tol == null ? 0.01 : tol);
  }

  function trigrams(tokens) {
    var out = [];
    for (var i = 0; i + 2 < tokens.length; i++) out.push(tokens[i] + ' ' + tokens[i + 1] + ' ' + tokens[i + 2]);
    return out;
  }
  /**
   * Proporción de trigramas del texto que ya aparecen en los textos de referencia.
   * @returns {number} Entre 0 (nada en común) y 1 (todo coincide).
   */
  function overlap(text, refs) {
    var tg = trigrams(words(text));
    if (!tg.length) return 0;
    var seen = {};
    (refs || []).forEach(function (r) { trigrams(words(r)).forEach(function (t) { seen[t] = true; }); });
    var hit = 0;
    tg.forEach(function (t) { if (seen[t]) hit++; });
    return hit / tg.length;
  }

  var REL = /\b(por|cada|veces|doble|triple|mitad|entonces|si|cuesta|cuestan|tarda|tardan|igual|mismo|mas|menos|sube|baja|aumenta|disminuye|descuento|aumento|total|pasa|suma|resta|multiplic\w*|divid\w*)\b/;

  /**
   * Señal exploratoria de si una explicación parece propia. No es un juicio: el docente puede leer el texto.
   * @param {string} text
   * @param {{refs?: string[], prior?: string[], needNumbers?: boolean, contextNumbers?: number[], pasted?: boolean, minWords?: number}} [opts]
   *   refs: frases de libro y enunciados; prior: textos anteriores del estudiante; contextNumbers: números de los
   *   enunciados (para detectar que reusó el mismo ejemplo); pasted: si se pegó el texto.
   * @returns {{score: 0|1|2, flags: string[], overlap: number}}
   *   score 0 = copiada, pegada o muy corta; 1 = débil; 2 = parece propia y relaciona cantidades.
   */
  function originality(text, opts) {
    opts = opts || {};
    var toks = words(text);
    var flags = [];
    var nums = (String(text).match(/\d+(?:[.,]\d+)?/g) || []).map(function (n) { return Number(n.replace(',', '.')); });
    var ov = overlap(text, (opts.refs || []).concat(opts.prior || []));
    if (opts.pasted) flags.push('pegado');
    if (toks.length < (opts.minWords || 5)) flags.push('corto');
    if (ov >= 0.5) flags.push('copiado');
    if (opts.needNumbers) {
      if (nums.length < 2) flags.push('pocos_numeros');
      var ctx = opts.contextNumbers || [];
      if (nums.length && nums.every(function (n) { return ctx.indexOf(n) !== -1; })) flags.push('mismo_ejemplo');
    }
    if (!REL.test(strip(text))) flags.push('sin_relacion');
    var hard = flags.indexOf('pegado') !== -1 || flags.indexOf('corto') !== -1 || flags.indexOf('copiado') !== -1;
    return { score: hard ? 0 : (flags.length === 0 ? 2 : 1), flags: flags, overlap: round(ov) };
  }

  /**
   * Métricas de una sesión (un estudiante jugando un tema).
   * @param {object[]} evs Eventos de esa sesión (tipos: teach, brain, ex, probe).
   * @returns {object} Detección, falsas alarmas, discriminación, correcciones, sondeos, textos débiles,
   *   dependencia (0 a 1, exploratorio), fichas bien/mal y errores no detectados por ficha.
   */
  function metricsFor(evs) {
    function of(t) { return evs.filter(function (e) { return e.type === t; }); }
    var exs = of('ex'), err = exs.filter(function (e) { return e.hasError; }), ctl = exs.filter(function (e) { return !e.hasError; });
    var hits = err.filter(function (e) { return e.saidError; }).length;
    var fa = ctl.filter(function (e) { return e.saidError; }).length;
    var hitRate = err.length ? hits / err.length : null;
    var faRate = ctl.length ? fa / ctl.length : null;
    var missedByRule = {};
    err.forEach(function (e) { if (!e.saidError) missedByRule[e.rule] = (missedByRule[e.rule] || 0) + 1; });
    var corrected = err.filter(function (e) { return e.saidError && e.correctionOk; }).length;

    var probes = of('probe'), nums = probes.filter(function (p) { return p.kind === 'num'; }), frees = probes.filter(function (p) { return p.kind === 'free'; });
    var numOk = nums.filter(function (p) { return p.ok; }).length;
    var teach = of('teach');
    var texts = frees.concat(teach);
    var weakTexts = texts.filter(function (t) { return !t.orig || t.orig.score < 2; }).length;
    var pasted = texts.filter(function (t) { return t.pasted; }).length;

    /* Calidad de enseñanza: fichas del último cerebro, según lo que leyó el modelo o las reglas. */
    var brains = of('brain'), lastCards = brains.length ? brains[brains.length - 1].cards : null;
    var cardKeys = lastCards ? Object.keys(lastCards) : [];
    var cardsBien = cardKeys.filter(function (k) { return lastCards[k].state === 'bien'; }).length;
    var cardsMal = cardKeys.filter(function (k) { return lastCards[k].state === 'mal'; }).length;

    /* Índice de dependencia exploratorio (0 a 1, más alto = más dependencia):
       promedio de lo que se le pasó, lo que no supo extender y las explicaciones que no parecen propias. */
    var parts = [];
    if (err.length) parts.push(1 - hits / err.length);
    if (nums.length) parts.push(1 - numOk / nums.length);
    if (texts.length) parts.push(weakTexts / texts.length);
    var dependence = parts.length ? round(parts.reduce(function (a, b) { return a + b; }, 0) / parts.length) : null;

    return {
      nErr: err.length, hits: hits, misses: err.length - hits, falseAlarms: fa, nCtl: ctl.length,
      hitRate: hitRate == null ? null : round(hitRate), faRate: faRate == null ? null : round(faRate),
      discrimination: hitRate != null && faRate != null ? round(hitRate - faRate) : null,
      corrected: corrected, missedByRule: missedByRule,
      probesOk: numOk, probesN: nums.length, weakTexts: weakTexts, nTexts: texts.length, pasted: pasted,
      cardsBien: lastCards ? cardsBien : null, cardsMal: lastCards ? cardsMal : null, teachTurns: teach.length,
      dependence: dependence
    };
  }

  /**
   * Agrupa eventos por estudiante (clase + apodo + tema) y toma su última sesión.
   * Los eventos sin tema se consideran del tema "proporciones" (versiones anteriores).
   * @param {object[]} events Todos los eventos.
   * @param {string} [cls] Si se indica, solo esa clase.
   * @param {string} [topic] Si se indica, solo ese tema.
   * @returns {{alias, cls, topic, m: object}[]} Un elemento por estudiante y tema, con sus métricas `m`.
   */
  function groupStudents(events, cls, topic) {
    var map = {}, want = cls ? String(cls).toUpperCase() : null;
    events.forEach(function (e) {
      if (!e || !e.alias) return;
      var c = String(e.cls || '').toUpperCase(), t = e.topic || 'proporciones';
      if (want && c !== want) return;
      if (topic && t !== topic) return;
      var key = c + '|' + String(e.alias).toLowerCase() + '|' + t;
      var s = map[key] || (map[key] = { alias: e.alias, cls: c, topic: t, sessions: {} });
      var ss = s.sessions[e.sid] || (s.sessions[e.sid] = { last: 0, evs: [] });
      ss.evs.push(e);
      ss.last = Math.max(ss.last, e.ts || 0);
    });
    return Object.keys(map).map(function (k) {
      var s = map[k], latest = null;
      Object.keys(s.sessions).forEach(function (sid) { if (!latest || s.sessions[sid].last > latest.last) latest = s.sessions[sid]; });
      return { alias: s.alias, cls: s.cls, topic: s.topic, m: metricsFor(latest.evs) };
    }).sort(function (a, b) { return String(a.alias).localeCompare(String(b.alias)); });
  }

  var api = { strip: strip, words: words, parseNum: parseNum, numEq: numEq, overlap: overlap, originality: originality, metricsFor: metricsFor, groupStudents: groupStudents, round: round };
  root.ChaskiCore = api;
  if (typeof module !== 'undefined' && module.exports) module.exports = api;
})(typeof window !== 'undefined' ? window : globalThis);
