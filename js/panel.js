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
  var events = [], source = '', sortKey = null, sortDir = 1, lastId = 0, timer = null, topicChecked = false;

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
  /** Sala elegida para filtrar lo que se ve. Es solo una etiqueta: vacía significa todas. */
  function room() { return $('room').value; }

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
  }

  C.list.forEach(function (t) { $('tema').appendChild(h('option', { value: t.id, text: t.title })); });
  $('tema').addEventListener('change', function () { C.use(topic()); sortKey = null; refreshLink(); render(); });
  $('cls').addEventListener('input', refreshLink);
  $('room').addEventListener('change', render);
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
    // La primera vez, si el tema elegido no tiene partidas pero otro sí, se muestra el de la partida más reciente.
    if (!topicChecked && events.length) {
      topicChecked = true;
      if (!events.some(function (e) { return (e.topic || 'proporciones') === topic(); })) {
        var latest = events.reduce(function (m, e) { return (e.ts || 0) > (m.ts || 0) ? e : m; }, events[0]), t = latest.topic || 'proporciones';
        if (C.list.some(function (x) { return x.id === t; })) { $('tema').value = t; sortKey = null; }
      }
    }
    render();
  }
  /** Salas que aparecen en los datos, para filtrar. Se conserva la elegida. */
  function fillRooms() {
    var sel = $('room'), cur = sel.value, seen = {}, rooms = [];
    events.forEach(function (e) { var c = String(e.cls || '').toUpperCase(); if (c && !seen[c]) { seen[c] = true; rooms.push(c); } });
    rooms.sort();
    var sig = rooms.join('|');
    if (sel.dataset.sig === sig) return;
    sel.dataset.sig = sig; sel.textContent = '';
    sel.appendChild(h('option', { value: '', text: 'Todas las salas' }));
    rooms.forEach(function (c) { sel.appendChild(h('option', { value: c, text: c })); });
    sel.value = rooms.indexOf(cur) >= 0 ? cur : '';
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
  function storeCall(method, query) {
    var key = $('key').value.trim();
    if (SAME) return fetch(CFG.ENDPOINT + query, { method: method, headers: { 'X-Panel-Key': key } }).then(function (r) { return r.json(); });
    return fetch(CFG.ENDPOINT + query + '&key=' + encodeURIComponent(key)).then(function (r) { return r.json(); });
  }
  function remember(k) { try { sessionStorage.setItem('chaski.panelkey', k); } catch (e) { /* sin almacenamiento: se escribe de nuevo */ } }
  /** Trae lo nuevo de la base, de todas las salas, y lo suma a lo que ya se muestra. Con el Apps Script se pide una clase. */
  function pull(manual) {
    if (!SAME && !cls()) return say('Escribe el código de clase.');
    if (manual) say('Cargando…');
    return storeCall('GET', SAME ? '?since=' + lastId : '?cls=' + encodeURIComponent(cls()))
      .then(function (d) {
        if (d.error) { stopAuto(); return say('Respondió ' + STORE + ': ' + d.error); }
        remember($('key').value.trim());
        if (SAME) lastId = d.last || lastId;
        if (manual || (d.events && d.events.length)) merge(d.events || [], STORE);
        if (manual) say('');
        if (SAME && d.more) return pull(false);
        if (SAME) startAuto();
      })
      .catch(function () { if (manual) say('No se pudo leer ' + STORE + '. Revisa la dirección y la clave.'); });
  }
  function startAuto() {
    if (timer) return;
    timer = setInterval(function () { if ($('auto').checked && document.visibilityState === 'visible') pull(false); }, 15000);
  }
  function stopAuto() { clearInterval(timer); timer = null; }
  /* Al volver a la pestaña, se trae lo que llegó mientras estaba oculta. */
  document.addEventListener('visibilitychange', function () { if (document.visibilityState === 'visible' && timer && $('auto').checked) pull(false); });
  $('bSheet').addEventListener('click', function () { pull(true); });
  $('auto').addEventListener('change', function () { if ($('auto').checked && lastId) pull(false); else render(); });
  $('bWipe').addEventListener('click', function () {
    if (!room()) return say('Elige arriba, en «Sala», la sala que quieres borrar.');
    if (!window.confirm('Se borrarán del servidor todos los datos de la sala ' + room() + '. No se puede deshacer. ¿Continuar?')) return;
    var wiped = room();
    say('Borrando…');
    storeCall('DELETE', '?cls=' + encodeURIComponent(wiped))
      .then(function (d) {
        if (d.error) return say('Respondió ' + STORE + ': ' + d.error);
        events = events.filter(function (e) { return String(e.cls).toUpperCase() !== wiped; });
        $('room').value = ''; render(); say('Se borraron los datos de la sala ' + wiped + ' del servidor.');
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
  $('bClear').addEventListener('click', function () { events = []; source = ''; lastId = 0; topicChecked = false; stopAuto(); say(''); render(); });

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

  /** Eventos de la partida más reciente de un estudiante. */
  function latestSession(s) {
    var by = {};
    events.forEach(function (e) {
      if (e.alias === s.alias && String(e.cls).toUpperCase() === s.cls && (e.topic || 'proporciones') === s.topic) (by[e.sid] = by[e.sid] || []).push(e);
    });
    var best = null;
    Object.keys(by).forEach(function (sid) {
      var last = Math.max.apply(null, by[sid].map(function (e) { return e.ts || 0; }));
      if (!best || last > best.last) best = { last: last, evs: by[sid] };
    });
    return best;
  }
  function ago(ts) {
    var min = Math.floor((Date.now() - ts) / 60000);
    return min < 1 ? 'ahora' : min < 60 ? 'hace ' + min + ' min' : min < 1440 ? 'hace ' + Math.floor(min / 60) + ' h' : 'hace ' + Math.floor(min / 1440) + ' d';
  }
  /** Dónde va el estudiante y cuándo hizo algo por última vez, según los eventos que llegaron. */
  function progressOf(s) {
    var ses = latestSession(s);
    if (!ses) return null;
    var n = {};
    ses.evs.forEach(function (e) { n[e.type] = (n[e.type] || 0) + 1; });
    var done = (n.probe || 0) >= 4;
    var where = done ? 'Llegó a la rendición' : n.probe ? 'Preguntas: ' + n.probe + ' de 4' : n.ex >= 6 ? 'Va a las preguntas' : n.ex ? n.ex + ' de 6 problemas' : n.brain ? 'Chaski leyó su explicación' : n.teach ? 'Enseñando' : 'Entró';
    var asked = ses.evs.some(function (e) { return e.type === 'brain' && e.clarify; });
    return { where: where + (asked ? ' · Chaski repreguntó' : ''), when: ago(ses.last), live: !done && Date.now() - ses.last < 5 * 60000 };
  }

  /** Textos que escribió un estudiante (lecciones y pregunta libre), con las señales de originalidad. */
  function textsOf(s) {
    return events.filter(function (e) {
      return (e.type === 'teach' || (e.type === 'probe' && e.kind === 'free')) && e.text && e.alias === s.alias &&
        String(e.cls).toUpperCase() === String(s.cls).toUpperCase() && (e.topic || 'proporciones') === s.topic;
    });
  }
  function flagsOf(e) { return e.orig && e.orig.flags && e.orig.flags.length ? e.orig.flags : []; }
  /** Las señales de originalidad se muestran con palabras, no con el nombre interno. */
  var FLAG_TEXT = { pegado: 'Texto pegado', corto: 'Muy corto', copiado: 'Parecido a un libro o a otra respuesta', pocos_numeros: 'Con pocos números', mismo_ejemplo: 'Usa el mismo ejemplo que Chaski', sin_relacion: 'No relaciona las cantidades' };
  function flagChips(flags) { return flags.length ? h('div', { class: 'flags' }, flags.map(function (f) { return h('span', { class: 'flag', text: FLAG_TEXT[f] || f }); })) : null; }

  function renderKpis(students) {
    var hr = avg(students, function (s) { return s.m.hitRate; }), fr = avg(students, function (s) { return s.m.faRate; });
    var dp = avg(students, function (s) { return s.m.dependence; }), cb = avg(students, function (s) { return s.m.cardsBien; });
    var band = depBand(dp);
    var kpis = [
      ['Estudiantes', String(students.length), null, 'que jugaron este tema', 'var(--ochre)'],
      ['Detección media', fmtPct(hr), hr, 'de los errores de Chaski, cuántos atraparon', 'var(--leaf)'],
      ['Falsas alarmas', fmtPct(fr), fr, 'soluciones correctas que marcaron como error', 'var(--terra)'],
      ['Dependencia media', dp == null ? '·' : String(Core.round(dp, 2)).replace('.', ','), dp, 'escala de 0 (revisa todo) a 1 (confía a ciegas)' + (band ? ' · ' + band[1].toLowerCase() : ''), 'var(--magenta)'],
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
        if (i === 0) {
          var pr = progressOf(s);
          cells.push(h('td', { class: 'who', 'data-l': c[0] }, s.alias, h('span', { class: 'sub' },
            pr && pr.live ? h('i', { class: 'live', title: 'Jugando ahora' }) : null,
            'Sala ' + s.cls + (pr ? ' · ' + pr.where + ' · ' + pr.when : ''))));
        }
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
      return (e.type === 'teach' || (e.type === 'probe' && e.kind === 'free')) && e.text && (e.topic || 'proporciones') === topic() && (!room() || String(e.cls).toUpperCase() === room());
    }).slice(-60).forEach(function (e) {
      box.appendChild(h('div', { class: 'say' }, h('span', { class: 'who', text: e.alias + ' · ' + (e.k || e.type) }), h('div', { class: 'quote', text: e.text }), flagChips(flagsOf(e))));
    });
    $('textsCard').hidden = !box.childNodes.length;
  }

  function render() {
    C.use(topic());
    refreshLink();
    fillRooms();
    var students = Core.groupStudents(events, room() || null, topic());
    var has = students.length > 0;
    $('results').hidden = !has; $('empty').hidden = has;
    $('status').hidden = $('bClear').hidden = !events.length;
    $('autoRow').hidden = !(SAME && events.length);
    var where = room() ? ' y sala' : '';
    if (events.length) $('statusText').textContent = events.length + ' eventos de ' + source + (has ? ' · ' + students.length + ' estudiantes en este tema' + where : ' · ninguno es de este tema' + where) + (timer && $('auto').checked ? ' · se actualiza solo' : '');
    if (!has) return;
    renderKpis(students); renderIdeas(students); renderTable(students); renderTexts();
  }

  $('bCsv').addEventListener('click', function () {
    var rows = [['apodo', 'clase', 'tema', 'detecto', 'errores', 'falsas_alarmas', 'controles', 'corrigio', 'seguimiento_ok', 'seguimiento_n', 'textos_debiles', 'textos', 'pegados', 'dependencia', 'ideas_bien']];
    Core.groupStudents(events, room() || null, topic()).forEach(function (s) {
      var m = s.m;
      rows.push([s.alias, s.cls, s.topic, m.hits, m.nErr, m.falseAlarms, m.nCtl, m.corrected, m.probesOk, m.probesN, m.weakTexts, m.nTexts, m.pasted, m.dependence, m.cardsBien]);
    });
    var csv = rows.map(function (r) { return r.map(function (v) { return '"' + String(v == null ? '' : v).replace(/"/g, '""') + '"'; }).join(','); }).join('\n');
    var a = document.createElement('a'); a.href = URL.createObjectURL(new Blob(['﻿' + csv], { type: 'text/csv' })); a.download = 'chaski-' + topic() + (room() ? '-' + room() : '') + '.csv';
    document.body.appendChild(a); a.click(); a.remove();
  });

  try { var saved = sessionStorage.getItem('chaski.panelkey'); if (saved) $('key').value = saved; } catch (e) { /* sin almacenamiento */ }
  render();
  if (SAME && $('key').value) pull(true); /* con la clave recordada, los resultados se cargan al abrir */
})();
