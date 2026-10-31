/**
 * Panel docente de Chaski.
 *
 *  1. Elegir el tema y generar el enlace que se comparte con los estudiantes.
 *  2. Cargar los eventos (hoja de Google, este dispositivo o un archivo) y resumirlos por clase y tema.
 *
 * No hay cuentas: la «clave del panel» solo protege la lectura de la hoja (ver apps-script/Code.gs).
 * Todo texto de estudiantes se inserta con textContent, nunca como HTML.
 */
(function () {
  'use strict';

  var Core = window.ChaskiCore, C = window.ChaskiContent, CFG = window.CHASKI_CONFIG || {}, Scenery = window.ChaskiScenery;
  var $ = function (id) { return document.getElementById(id); };
  var events = [], source = '', sortKey = null, sortDir = 1;

  function put(el, c) {
    if (c == null || c === false) return;
    if (Array.isArray(c)) { c.forEach(function (x) { put(el, x); }); return; }
    el.appendChild(typeof c === 'string' ? document.createTextNode(c) : c);
  }
  /** Crea un elemento con atributos y contenido. El texto siempre entra como texto, nunca como HTML. */
  function h(tag, attrs) {
    var el = document.createElement(tag);
    if (attrs) Object.keys(attrs).forEach(function (k) {
      if (k === 'class') el.className = attrs[k]; else if (k === 'text') el.textContent = attrs[k]; else el.setAttribute(k, attrs[k]);
    });
    for (var i = 2; i < arguments.length; i++) put(el, arguments[i]);
    return el;
  }
  function say(t) { $('msg').textContent = t; }
  function fmtPct(x) { return x == null ? '·' : Math.round(x * 100) + '%'; }
  function dash(x) { return x == null ? '·' : x; }
  function avg(list, f) {
    var v = list.map(f).filter(function (x) { return x != null; });
    return v.length ? v.reduce(function (a, b) { return a + b; }, 0) / v.length : null;
  }
  function topic() { return $('tema').value; }
  function cls() { return $('cls').value.trim().toUpperCase(); }

  /* ---------- Encabezado con el paisaje del juego ---------- */

  Scenery.symbols();
  $('land').innerHTML = Scenery.world('dia', { viewBox: '0 300 1200 330', par: 'xMidYMid slice' });

  /* ---------- 1. Enlace para los estudiantes ---------- */

  /** Dirección del juego con el tema y la clase ya elegidos. */
  function buildLink() {
    var url = new URL('index.html', location.href);
    url.search = '';
    url.searchParams.set('tema', topic());
    if (cls()) url.searchParams.set('clase', cls());
    return url.toString();
  }
  function refreshLink() {
    var link = buildLink();
    $('link').value = link;
    $('bTest').href = link;
    $('bWa').href = 'https://wa.me/?text=' + encodeURIComponent('Juega Chaski: ' + link);
    $('chipT').textContent = C.topic ? C.topic.title : topic();
    $('chipC').textContent = cls() || 'Todas';
  }

  C.list.forEach(function (t) { $('tema').appendChild(h('option', { value: t.id, text: t.title })); });
  $('tema').addEventListener('change', function () { C.use(topic()); sortKey = null; refreshLink(); render(); });
  $('cls').addEventListener('input', function () { refreshLink(); render(); });
  $('bCopy').addEventListener('click', function () {
    var input = $('link');
    function fallback() { input.select(); $('linkNote').textContent = 'Copia el enlace con Ctrl+C.'; }
    try { navigator.clipboard.writeText(input.value).then(function () { $('linkNote').textContent = 'Enlace copiado.'; }, fallback); }
    catch (e) { fallback(); }
  });

  /* ---------- 2. Cargar datos ---------- */

  /** Agrega eventos sin repetir los que ya estaban. */
  function merge(list, from) {
    var seen = {};
    function key(e) { return e.sid + '|' + e.ts + '|' + e.type + '|' + (e.k || e.ex || ''); }
    events.forEach(function (e) { seen[key(e)] = true; });
    list.forEach(function (e) { if (!seen[key(e)]) { seen[key(e)] = true; events.push(e); } });
    source = from;
    render();
  }

  /* El guardado puede ser la base de datos del propio sitio ("/events") o un Apps Script que escribe en una hoja. */
  var SAME = (CFG.ENDPOINT || '').charAt(0) === '/';
  var STORE = SAME ? 'la base de datos' : 'la hoja de Google';
  $('keybox').hidden = !CFG.ENDPOINT;
  $('bSheet').hidden = !CFG.ENDPOINT;
  $('bWipe').hidden = !SAME;
  if (SAME) {
    $('srcTitle').textContent = 'Base de datos';
    $('srcSub').textContent = 'Los resultados de todos los dispositivos, con la clave del panel';
    $('keyLbl').textContent = 'Clave del panel';
  }
  /** Llama al guardado con la clave del panel. La base del sitio la recibe en una cabecera; el Apps Script, en la dirección. */
  function storeCall(method) {
    var key = $('key').value.trim(), q = '?cls=' + encodeURIComponent(cls());
    if (SAME) return fetch(CFG.ENDPOINT + q, { method: method, headers: { 'X-Panel-Key': key } }).then(function (r) { return r.json(); });
    return fetch(CFG.ENDPOINT + q + '&key=' + encodeURIComponent(key)).then(function (r) { return r.json(); });
  }
  $('bSheet').addEventListener('click', function () {
    if (!cls()) return say('Escribe el código de clase.');
    say('Cargando…');
    storeCall('GET')
      .then(function (d) { if (d.error) return say('Respondió ' + STORE + ': ' + d.error); merge(d.events || [], STORE); say(''); })
      .catch(function () { say('No se pudo leer ' + STORE + '. Revisa la dirección y la clave.'); });
  });
  $('bWipe').addEventListener('click', function () {
    if (!cls()) return say('Escribe el código de clase que quieres borrar.');
    if (!window.confirm('Se borrarán del servidor todos los datos de la clase ' + cls() + '. No se puede deshacer. ¿Continuar?')) return;
    say('Borrando…');
    storeCall('DELETE')
      .then(function (d) {
        if (d.error) return say('Respondió ' + STORE + ': ' + d.error);
        events = events.filter(function (e) { return String(e.cls).toUpperCase() !== cls(); });
        render(); say('Se borraron los datos de la clase ' + cls() + ' del servidor.');
      })
      .catch(function () { say('No se pudo borrar. Revisa la clave y la conexión.'); });
  });
  $('bLocal').addEventListener('click', function () {
    try { var d = JSON.parse(localStorage.getItem('chaski.log.v1') || 'null'); merge(d && d.events ? d.events : [], 'este dispositivo'); say(''); }
    catch (e) { say('No hay datos en este dispositivo.'); }
  });
  $('bFile').addEventListener('keydown', function (e) { if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); $('file').click(); } });
  $('file').addEventListener('change', function (ev) {
    var f = ev.target.files[0]; if (!f) return;
    var r = new FileReader();
    r.onload = function () {
      try { var d = JSON.parse(r.result); merge(Array.isArray(d) ? d : d.events || [], 'un archivo'); say(''); }
      catch (e) { say('Ese archivo no es un JSON válido de Chaski.'); }
    };
    r.readAsText(f);
  });
  $('bClear').addEventListener('click', function () { events = []; source = ''; say(''); render(); });

  /* ---------- Resumen ---------- */

  function depBand(d) { return d == null ? null : d < 0.34 ? ['lo', 'Baja'] : d < 0.67 ? ['mid', 'Media'] : ['hi', 'Alta']; }
  function ratio(a, b) { return b ? a / b : null; }

  /** Cada columna de la tabla: título, cómo se muestra y por qué valor se ordena. */
  var COLS = [
    ['Apodo', function (s) { return s.alias; }, function (s) { return s.alias.toLowerCase(); }],
    ['Detectó', function (s) { return s.m.hits + '/' + s.m.nErr; }, function (s) { return ratio(s.m.hits, s.m.nErr); }],
    ['Falsas alarmas', function (s) { return s.m.falseAlarms + '/' + s.m.nCtl; }, function (s) { return ratio(s.m.falseAlarms, s.m.nCtl); }],
    ['Corrigió', function (s) { return s.m.corrected + '/' + s.m.nErr; }, function (s) { return ratio(s.m.corrected, s.m.nErr); }],
    ['Seguimiento', function (s) { return s.m.probesOk + '/' + s.m.probesN; }, function (s) { return ratio(s.m.probesOk, s.m.probesN); }],
    ['Textos débiles', function (s) { return s.m.weakTexts + '/' + s.m.nTexts; }, function (s) { return ratio(s.m.weakTexts, s.m.nTexts); }],
    ['Pegados', function (s) { return String(s.m.pasted); }, function (s) { return s.m.pasted; }],
    ['Dependencia', null, function (s) { return s.m.dependence; }],
    ['Ideas bien', null, function (s) { return s.m.cardsBien; }]
  ];

  /** Textos que escribió un estudiante (lecciones y pregunta libre), con las señales de originalidad. */
  function textsOf(s) {
    return events.filter(function (e) {
      return (e.type === 'teach' || (e.type === 'probe' && e.kind === 'free')) && e.text && e.alias === s.alias &&
        String(e.cls).toUpperCase() === String(s.cls).toUpperCase() && (e.topic || 'proporciones') === s.topic;
    });
  }
  function flagsOf(e) { return e.orig && e.orig.flags && e.orig.flags.length ? e.orig.flags : []; }
  function flagChips(flags) { return flags.length ? h('div', { class: 'flags' }, flags.map(function (f) { return h('span', { class: 'flag', text: f }); })) : null; }

  function renderKpis(students) {
    var hr = avg(students, function (s) { return s.m.hitRate; }), fr = avg(students, function (s) { return s.m.faRate; });
    var dp = avg(students, function (s) { return s.m.dependence; }), cb = avg(students, function (s) { return s.m.cardsBien; });
    var band = depBand(dp);
    var kpis = [
      ['Estudiantes', String(students.length), null, 'que jugaron este tema', 'var(--ochre)'],
      ['Detección media', fmtPct(hr), hr, 'de los errores de Chaski, cuántos atraparon', 'var(--leaf)'],
      ['Falsas alarmas', fmtPct(fr), fr, 'soluciones correctas que marcaron como error', 'var(--terra)'],
      ['Dependencia media', dp == null ? '·' : String(Core.round(dp, 2)).replace('.', ','), dp, '0 revisan, 1 confían a ciegas' + (band ? ' · ' + band[1].toLowerCase() : ''), 'var(--magenta)'],
      ['Ideas bien', cb == null ? '·' : String(Core.round(cb, 1)).replace('.', ',') + ' / 3', cb == null ? null : cb / 3, 'de las 3 que Chaski podía aprender', 'var(--turq)']
    ];
    var box = $('kpis'); box.textContent = '';
    kpis.forEach(function (k) {
      var card = h('div', { class: 'kpi' }, h('span', { class: 'lbl', text: k[0] }), h('span', { class: 'v', text: k[1] }),
        k[2] == null ? null : h('div', { class: 'meter', 'aria-hidden': 'true' }, h('i', { style: 'width:' + Math.round(k[2] * 100) + '%' })),
        h('span', { class: 'd', text: k[3] }));
      card.style.setProperty('--c', k[4]);
      box.appendChild(card);
    });
  }

  function renderIdeas(students) {
    var rows = ['K1', 'K2', 'K3', 'S'].map(function (k) {
      var n = students.filter(function (s) { return s.m.missedByRule[k]; }).length;
      return { name: C.cards[k].title, n: n, p: students.length ? Math.round(100 * n / students.length) : 0 };
    });
    var top = rows.reduce(function (m, r) { return r.p > m.p ? r : m; }, rows[0]);
    var box = $('ideas'); box.textContent = '';
    rows.forEach(function (r) {
      var first = r === top && r.p > 0;
      box.appendChild(h('div', { class: 'idea' + (first ? ' first' : '') },
        h('div', { class: 'top' },
          h('span', { class: 'name' }, r.name, first ? h('span', { class: 'badge', text: 'Retomar primero' }) : null),
          h('span', { class: 'pct' }, r.p + '%', h('small', { text: ' · ' + r.n + ' de ' + students.length }))),
        h('div', { class: 'track', role: 'img', 'aria-label': r.p + ' por ciento' }, h('i', { style: 'width:' + r.p + '%' }))));
    });
  }

  function renderTable(students) {
    var list = students.slice();
    if (sortKey != null) list.sort(function (a, b) {
      var x = COLS[sortKey][2](a), y = COLS[sortKey][2](b);
      if (x == null && y == null) return 0; if (x == null) return 1; if (y == null) return -1;
      return (x > y ? 1 : x < y ? -1 : 0) * sortDir;
    });
    var tbl = $('tbl'); tbl.textContent = '';
    tbl.appendChild(h('thead', null, h('tr', null, COLS.map(function (c, i) {
      var b = h('button', { type: 'button', text: c[0] });
      if (sortKey === i) b.setAttribute('aria-sort', sortDir > 0 ? 'ascending' : 'descending');
      b.addEventListener('click', function () { sortDir = sortKey === i ? -sortDir : 1; sortKey = i; renderTable(students); });
      return h('th', { scope: 'col' }, b);
    }), h('th'))));
    var body = h('tbody');
    list.forEach(function (s, idx) {
      var m = s.m, band = depBand(m.dependence), texts = textsOf(s), cells = [];
      COLS.forEach(function (c, i) {
        if (i === 0) cells.push(h('td', { class: 'who', 'data-l': c[0], text: c[1](s) }));
        else if (c[1]) cells.push(h('td', { 'data-l': c[0], text: c[1](s) }));
      });
      cells.splice(7, 0, h('td', { 'data-l': 'Dependencia' }, band ? h('span', { class: 'dep ' + band[0] }, h('i'), String(Core.round(m.dependence, 2)).replace('.', ',') + ' · ' + band[1]) : '·'));
      cells.push(h('td', { 'data-l': 'Ideas bien' }, m.cardsBien == null ? '·' : [
        h('span', { class: 'dots', 'aria-hidden': 'true' }, [0, 1, 2].map(function (j) { return h('i', { class: j < m.cardsBien ? 'on' : '' }); })), m.cardsBien + '/3']));
      var det = h('tr', { class: 'det', hidden: '', id: 'det' + idx }, h('td', { colspan: String(COLS.length + 1) },
        texts.length ? texts.map(function (e) { return [h('div', { class: 'quote', text: e.text }), flagChips(flagsOf(e))]; }) : h('p', { class: 'help', text: 'Este estudiante no escribió textos.' })));
      var more = h('button', { type: 'button', class: 'more', 'aria-expanded': 'false', 'aria-controls': 'det' + idx, text: 'Texto' });
      more.addEventListener('click', function () {
        var open = det.hidden; det.hidden = !open; more.setAttribute('aria-expanded', String(open)); more.textContent = open ? 'Cerrar' : 'Texto';
      });
      cells.push(h('td', { class: 'act' }, more));
      body.appendChild(h('tr', { class: 'row' }, cells));
      body.appendChild(det);
    });
    tbl.appendChild(body);
  }

  function renderTexts() {
    var box = $('texts'); box.textContent = '';
    events.filter(function (e) {
      return (e.type === 'teach' || (e.type === 'probe' && e.kind === 'free')) && e.text && (e.topic || 'proporciones') === topic() && (!cls() || String(e.cls).toUpperCase() === cls());
    }).slice(-60).forEach(function (e) {
      box.appendChild(h('div', { class: 'say' }, h('span', { class: 'who', text: e.alias + ' · ' + (e.k || e.type) }), h('div', { class: 'quote', text: e.text }), flagChips(flagsOf(e))));
    });
    $('textsCard').hidden = !box.childNodes.length;
  }

  function render() {
    C.use(topic());
    refreshLink();
    var students = Core.groupStudents(events, cls() || null, topic());
    var has = students.length > 0;
    $('results').hidden = !has; $('empty').hidden = has;
    $('status').hidden = $('bClear').hidden = !events.length;
    if (events.length) $('statusText').textContent = events.length + ' eventos cargados de ' + source + (has ? ' · ' + students.length + ' estudiantes en este tema y clase' : ' · ninguno es de este tema y clase');
    if (!has) return;
    renderKpis(students); renderIdeas(students); renderTable(students); renderTexts();
  }

  $('bCsv').addEventListener('click', function () {
    var rows = [['apodo', 'clase', 'tema', 'detecto', 'errores', 'falsas_alarmas', 'controles', 'corrigio', 'seguimiento_ok', 'seguimiento_n', 'textos_debiles', 'textos', 'pegados', 'dependencia', 'ideas_bien']];
    Core.groupStudents(events, cls() || null, topic()).forEach(function (s) {
      var m = s.m;
      rows.push([s.alias, s.cls, s.topic, m.hits, m.nErr, m.falseAlarms, m.nCtl, m.corrected, m.probesOk, m.probesN, m.weakTexts, m.nTexts, m.pasted, m.dependence, m.cardsBien]);
    });
    var csv = rows.map(function (r) { return r.map(function (v) { return '"' + String(v == null ? '' : v).replace(/"/g, '""') + '"'; }).join(','); }).join('\n');
    var a = document.createElement('a'); a.href = URL.createObjectURL(new Blob(['﻿' + csv], { type: 'text/csv' })); a.download = 'chaski-' + topic() + '.csv';
    document.body.appendChild(a); a.click(); a.remove();
  });

  render();
})();
