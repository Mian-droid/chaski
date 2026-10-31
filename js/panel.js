/**
 * Panel docente de Chaski.
 *
 *  1. Elegir el tema y generar el enlace que se comparte con los estudiantes.
 *  2. Cargar los eventos (hoja de Google, este dispositivo o un archivo) y resumirlos por clase y tema.
 *
 * No hay cuentas: la «clave del panel» solo protege la lectura de la hoja (ver apps-script/Code.gs).
 */
(function () {
  'use strict';

  var Core = window.ChaskiCore, C = window.ChaskiContent, CFG = window.CHASKI_CONFIG || {};
  var $ = function (id) { return document.getElementById(id); };
  var events = [];

  /** Crea un elemento con atributos y contenido. El texto siempre entra como texto, nunca como HTML. */
  function h(tag, attrs) {
    var el = document.createElement(tag);
    if (attrs) Object.keys(attrs).forEach(function (k) {
      if (k === 'class') el.className = attrs[k]; else if (k === 'text') el.textContent = attrs[k]; else el.setAttribute(k, attrs[k]);
    });
    for (var i = 2; i < arguments.length; i++) {
      var c = arguments[i]; if (c == null) continue;
      (Array.isArray(c) ? c : [c]).forEach(function (x) { el.appendChild(typeof x === 'string' ? document.createTextNode(x) : x); });
    }
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

  /* ---------- 1. Enlace para los estudiantes ---------- */

  /** Dirección del juego con el tema y la clase ya elegidos. */
  function buildLink() {
    var url = new URL('index.html', location.href);
    url.search = '';
    url.searchParams.set('tema', topic());
    if (cls()) url.searchParams.set('clase', cls());
    return url.toString();
  }
  function refreshLink() { $('link').value = buildLink(); }

  C.list.forEach(function (t) { $('tema').appendChild(h('option', { value: t.id, text: t.title })); });
  $('tema').addEventListener('change', function () { refreshLink(); render(); });
  $('cls').addEventListener('input', function () { refreshLink(); render(); });
  $('bCopy').addEventListener('click', function () {
    var input = $('link');
    function fallback() { input.select(); $('linkNote').textContent = 'Copia el enlace con Ctrl+C.'; }
    try { navigator.clipboard.writeText(input.value).then(function () { $('linkNote').textContent = 'Enlace copiado.'; }, fallback); }
    catch (e) { fallback(); }
  });
  refreshLink();

  /* ---------- 2. Cargar datos ---------- */

  /** Agrega eventos sin repetir los que ya estaban. */
  function merge(list) {
    var seen = {};
    function key(e) { return e.sid + '|' + e.ts + '|' + e.type + '|' + (e.k || e.ex || ''); }
    events.forEach(function (e) { seen[key(e)] = true; });
    list.forEach(function (e) { if (!seen[key(e)]) { seen[key(e)] = true; events.push(e); } });
    render();
  }

  $('keybox').hidden = !CFG.ENDPOINT;
  $('bSheet').hidden = !CFG.ENDPOINT;
  $('bSheet').addEventListener('click', function () {
    if (!cls()) return say('Escribe el código de clase.');
    say('Cargando…');
    fetch(CFG.ENDPOINT + '?cls=' + encodeURIComponent(cls()) + '&key=' + encodeURIComponent($('key').value.trim()))
      .then(function (r) { return r.json(); })
      .then(function (d) { if (d.error) return say('La hoja respondió: ' + d.error); merge(d.events || []); say('Listo: ' + (d.events || []).length + ' eventos de la hoja.'); })
      .catch(function () { say('No se pudo leer la hoja. Revisa la dirección del Apps Script y la clave.'); });
  });
  $('bLocal').addEventListener('click', function () {
    try { var d = JSON.parse(localStorage.getItem('chaski.log.v1') || 'null'); merge(d && d.events ? d.events : []); say('Cargado de este dispositivo.'); }
    catch (e) { say('No hay datos en este dispositivo.'); }
  });
  $('file').addEventListener('change', function (ev) {
    var f = ev.target.files[0]; if (!f) return;
    var r = new FileReader();
    r.onload = function () {
      try { var d = JSON.parse(r.result); merge(Array.isArray(d) ? d : d.events || []); say('Archivo cargado.'); }
      catch (e) { say('Ese archivo no es un JSON válido de Chaski.'); }
    };
    r.readAsText(f);
  });

  /* ---------- Resumen ---------- */

  function render() {
    C.use(topic());
    var students = Core.groupStudents(events, cls() || null, topic());
    $('summary').hidden = $('tableCard').hidden = $('textsCard').hidden = !students.length;
    if (!students.length) return;

    var st = [
      ['Estudiantes', students.length],
      ['Detección media', fmtPct(avg(students, function (s) { return s.m.hitRate; }))],
      ['Falsas alarmas', fmtPct(avg(students, function (s) { return s.m.faRate; }))],
      ['Dependencia media', dash(avg(students, function (s) { return s.m.dependence; }) == null ? null : Core.round(avg(students, function (s) { return s.m.dependence; })))],
      ['Ideas bien (media)', dash(avg(students, function (s) { return s.m.cardsBien; }) == null ? null : Core.round(avg(students, function (s) { return s.m.cardsBien; }), 1) + ' / 3')]
    ];
    var box = $('stats'); box.textContent = '';
    st.forEach(function (x) { box.appendChild(h('div', { class: 'stat' }, h('span', { text: x[0] }), h('p', { class: 'big', text: String(x[1]) }))); });

    var bars = $('bars'); bars.textContent = '';
    ['K1', 'K2', 'K3', 'S'].forEach(function (k) {
      var missed = students.filter(function (s) { return s.m.missedByRule[k]; }).length, p = students.length ? missed / students.length : 0;
      var span = h('span'); span.style.width = Math.round(p * 100) + '%';
      bars.appendChild(h('div', { class: 'line' }, h('div', null, h('p', { text: C.cards[k].title }), h('div', { class: 'bar' }, span)), h('p', { class: 'big', text: Math.round(p * 100) + '%' })));
    });

    var tbl = $('tbl'); tbl.textContent = '';
    var head = ['Apodo', 'Clase', 'Detectó', 'Falsas alarmas', 'Corrigió', 'Seguimiento', 'Textos débiles', 'Pegados', 'Dependencia', 'Ideas bien'];
    tbl.appendChild(h('thead', null, h('tr', null, head.map(function (t) { return h('th', { text: t }); }))));
    var body = h('tbody');
    students.forEach(function (s) {
      var m = s.m;
      body.appendChild(h('tr', null, [
        s.alias, s.cls, m.hits + '/' + m.nErr, m.falseAlarms + '/' + m.nCtl, m.corrected + '/' + m.nErr, m.probesOk + '/' + m.probesN,
        m.weakTexts + '/' + m.nTexts, m.pasted, dash(m.dependence), m.cardsBien != null ? m.cardsBien + '/3' : '·'
      ].map(function (t) { return h('td', { text: String(t) }); })));
    });
    tbl.appendChild(body);

    var texts = $('texts'); texts.textContent = '';
    events.filter(function (e) {
      return (e.type === 'teach' || (e.type === 'probe' && e.kind === 'free')) && e.text && (e.topic || 'proporciones') === topic() && (!cls() || String(e.cls).toUpperCase() === cls());
    }).slice(-60).forEach(function (e) {
      var flags = e.orig && e.orig.flags && e.orig.flags.length ? ' · señales: ' + e.orig.flags.join(', ') : '';
      texts.appendChild(h('div', { class: 'item' }, h('p', { class: 'small', text: e.alias + ' · ' + (e.k || e.type) + flags }), h('p', { text: e.text })));
    });
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
})();
