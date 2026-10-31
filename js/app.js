/**
 * Chaski: flujo del juego (interfaz).
 *
 * Escenas: welcome -> intro -> teach -> brain -> map/ex (6 problemas) -> probe -> reveal -> (teach -> brain) -> end.
 * El tema se elige por la dirección: index.html?tema=porcentajes&clase=3A (ver docs/contenido-de-temas.md).
 * Todo texto del usuario se inserta con textContent, nunca como HTML.
 */
(function () {
  'use strict';

  var C = window.ChaskiContent, Core = window.ChaskiCore, Brain = window.ChaskiBrain, CFG = window.CHASKI_CONFIG || {};
  var root = document.getElementById('app');
  var ANNOUNCE = CFG.ANNOUNCE_ERRORS !== false;
  var KS = 'chaski.state.v3', KL = 'chaski.log.v1';
  var S = null;
  var keyHandler = null;

  /* ---------- utilidades ---------- */
  function store(k, v) {
    try {
      if (v === undefined) return JSON.parse(localStorage.getItem(k) || 'null');
      localStorage.setItem(k, JSON.stringify(v));
    } catch (e) { return null; }
  }
  function append(el, c) {
    if (c == null || c === false) return;
    if (Array.isArray(c)) { c.forEach(function (x) { append(el, x); }); return; }
    el.appendChild(typeof c === 'string' ? document.createTextNode(c) : c);
  }
  function h(tag, attrs) {
    var el = document.createElement(tag);
    if (attrs) Object.keys(attrs).forEach(function (k) {
      var v = attrs[k];
      if (k === 'class') el.className = v;
      else if (k === 'text') el.textContent = v;
      else if (k.slice(0, 2) === 'on') el.addEventListener(k.slice(2), v);
      else if (v !== false && v != null) el.setAttribute(k, v === true ? '' : v);
    });
    for (var i = 2; i < arguments.length; i++) append(el, arguments[i]);
    return el;
  }
  function btn(text, cls, fn) { return h('button', { type: 'button', class: 'gbtn ' + (cls || ''), text: text, onclick: fn }); }
  function fmt(n) { return String(Core.round(n, 2)).replace('.', ','); }
  window.addEventListener('keydown', function (e) { if (keyHandler) keyHandler(e); });

  /* ---------- registro de eventos ---------- */
  var Log = {
    events: [], sent: 0,
    load: function () { var d = store(KL); if (d) { this.events = d.events || []; this.sent = d.sent || 0; } },
    save: function () { store(KL, { events: this.events, sent: this.sent }); },
    push: function (type, data) {
      var ev = { ts: Date.now(), type: type, sid: S.sid, alias: S.alias, cls: S.cls, topic: S.topic, day: 1 };
      Object.keys(data || {}).forEach(function (k) { ev[k] = data[k]; });
      this.events.push(ev); this.save();
    },
    mine: function (type) { return this.events.filter(function (e) { return e.sid === S.sid && (!type || e.type === type); }); },
    flush: function () {
      var self = this;
      if (!CFG.ENDPOINT) return;
      var batch = this.events.slice(this.sent), upto = this.events.length;
      if (!batch.length) return;
      fetch(CFG.ENDPOINT, { method: 'POST', mode: 'no-cors', headers: { 'Content-Type': 'text/plain;charset=utf-8' }, body: JSON.stringify({ events: batch }) })
        .then(function () { self.sent = upto; self.save(); })
        .catch(function () { /* se reintenta en el siguiente envío */ });
    }
  };

  /* ---------- estado ---------- */
  /** Estado de una partida. Se guarda en el dispositivo para poder retomarla. */
  function newState(alias, cls, topic) {
    return { sid: Math.random().toString(36).slice(2, 10), alias: alias, cls: cls, topic: topic, scene: 'intro', i: 0,
      brain: Brain.emptyBrain(), plan: null, chat: [], pending: [], more: false, phase: 'inicial', extraTurns: 0, reteached: false };
  }
  function save() { store(KS, S); }
  function go(scene, i) {
    S.scene = scene; S.i = i || 0; save();
    if (scene === 'reveal' || scene === 'end') Log.flush(); /* enviar a la hoja en los hitos */
    render();
  }

  /* ---------- mundo y personaje ---------- */
  var WORLD = '<svg viewBox="0 0 390 800" preserveAspectRatio="xMidYMax slice"><defs>' +
    '<linearGradient id="sky" x1="0" y1="0" x2="0" y2="1"><stop offset="0" stop-color="#14142B"/><stop offset=".45" stop-color="#3A2468"/><stop offset=".72" stop-color="#9A4A78"/><stop offset=".9" stop-color="#FF8A5B"/></linearGradient>' +
    '<linearGradient id="gnd" x1="0" y1="0" x2="0" y2="1"><stop offset="0" stop-color="#2A2150"/><stop offset="1" stop-color="#14142B"/></linearGradient></defs>' +
    '<rect width="390" height="800" fill="url(#sky)"/>' +
    '<g fill="#fff" opacity=".85"><circle cx="40" cy="60" r="1.6"/><circle cx="120" cy="30" r="1.2"/><circle cx="210" cy="80" r="1.5"/><circle cx="300" cy="40" r="1.8"/><circle cx="350" cy="110" r="1.2"/><circle cx="70" cy="140" r="1.1"/><circle cx="260" cy="150" r="1.1"/><circle cx="170" cy="120" r="1.3"/></g>' +
    '<circle cx="318" cy="118" r="30" fill="#FFE9B8" opacity=".95"/><circle cx="330" cy="110" r="27" fill="#3A2468" opacity=".55"/>' +
    '<path d="M0 400 L60 330 L100 370 L170 290 L230 360 L290 310 L390 400 V470 H0Z" fill="#5B3F8C" opacity=".85"/>' +
    '<path d="M0 440 L50 390 L110 430 L190 350 L260 425 L330 380 L390 430 V500 H0Z" fill="#3A2A70"/>' +
    '<path d="M0 480 L80 430 L150 475 L230 420 L310 470 L390 440 V520 H0Z" fill="#241B54"/>' +
    '<rect y="470" width="390" height="330" fill="url(#gnd)"/>' +
    '<g stroke="#3A2F6E" stroke-width="2" opacity=".6" fill="none"><path d="M0 560 H390"/><path d="M0 640 H390"/><path d="M0 730 H390"/></g></svg>';

  var Y = '#F5B700';
  var EYES = {
    confident: '<circle cx="46" cy="70" r="6" fill="' + Y + '"/><circle cx="74" cy="70" r="6" fill="' + Y + '"/>',
    happy: '<path d="M40 73q6-10 12 0M68 73q6-10 12 0" stroke="' + Y + '" stroke-width="4" fill="none" stroke-linecap="round"/>',
    oops: '<circle cx="46" cy="70" r="8" fill="' + Y + '"/><circle cx="74" cy="70" r="8" fill="' + Y + '"/><circle cx="46" cy="70" r="3" fill="#14142B"/><circle cx="74" cy="70" r="3" fill="#14142B"/>',
    think: '<circle cx="46" cy="70" r="6" fill="' + Y + '"/><circle cx="74" cy="68" r="4" fill="' + Y + '"/>'
  };
  var MOUTH = {
    confident: '<path d="M48 86q12 9 24 0" stroke="' + Y + '" stroke-width="4" fill="none" stroke-linecap="round"/>',
    happy: '<path d="M46 84q14 14 28 0" stroke="' + Y + '" stroke-width="4" fill="none" stroke-linecap="round"/>',
    oops: '<circle cx="60" cy="88" r="4.5" fill="' + Y + '"/>',
    think: '<path d="M50 88h20" stroke="' + Y + '" stroke-width="4" stroke-linecap="round"/>'
  };
  function symbol(mood) {
    return '<symbol id="ch-' + mood + '" viewBox="0 0 120 172">' +
      '<rect x="42" y="146" width="12" height="22" rx="6" fill="#ECE6D6"/><rect x="66" y="146" width="12" height="22" rx="6" fill="#ECE6D6"/>' +
      '<ellipse cx="47" cy="168" rx="11" ry="4.5" fill="#FF6B4A"/><ellipse cx="73" cy="168" rx="11" ry="4.5" fill="#FF6B4A"/>' +
      '<path d="M34 104h52l12 46H22z" fill="#5B3F8C"/><path d="M28 126h64l4 12H24z" fill="#F5B700"/><path d="M30 134l6-5 6 5 6-5 6 5 6-5 6 5 6-5 6 5 6-5" stroke="#FF6B4A" stroke-width="2" fill="none"/>' +
      '<path d="M104 112v26" stroke="#F5B700" stroke-width="3"/><circle cx="104" cy="122" r="3" fill="#F5B700"/><circle cx="104" cy="132" r="3" fill="#FF6B4A"/><circle cx="104" cy="141" r="3" fill="#F5B700"/>' +
      '<rect x="14" y="52" width="13" height="30" rx="6.5" fill="#FF6B4A"/><rect x="93" y="52" width="13" height="30" rx="6.5" fill="#FF6B4A"/>' +
      '<rect x="22" y="40" width="76" height="64" rx="26" fill="#ECE6D6"/><rect x="32" y="58" width="56" height="40" rx="14" fill="#14142B"/>' +
      EYES[mood] + MOUTH[mood] +
      '<path d="M22 56C22 18 98 18 98 56Z" fill="#FF6B4A"/><rect x="22" y="46" width="76" height="11" rx="4" fill="#F5B700"/>' +
      '<path d="M30 51l5-4 5 4 5-4 5 4 5-4 5 4 5-4 5 4 5-4 5 4 5-4 5 4" stroke="#FF6B4A" stroke-width="2.4" fill="none"/>' +
      '<circle cx="60" cy="17" r="7" fill="#F5B700"/><path d="M34 106q26 12 52 0" stroke="#F5B700" stroke-width="5" fill="none" stroke-linecap="round"/></symbol>';
  }
  function setupWorld() {
    var w = document.createElement('div'); w.className = 'world'; w.setAttribute('aria-hidden', 'true'); w.innerHTML = WORLD;
    var d = document.createElement('div');
    d.innerHTML = '<svg width="0" height="0" style="position:absolute" aria-hidden="true"><defs>' + ['confident', 'happy', 'oops', 'think'].map(symbol).join('') + '</defs></svg>';
    document.body.insertBefore(d.firstChild, document.body.firstChild);
    document.body.insertBefore(w, document.body.firstChild);
  }
  function chaski(mood, w, cls) {
    var d = document.createElement('div');
    d.innerHTML = '<svg class="chsvg ' + (cls || '') + '" width="' + w + '" height="' + Math.round(w * 172 / 120) + '" viewBox="0 0 120 172" aria-hidden="true"><use href="#ch-' + mood + '"/></svg>';
    return d.firstChild;
  }
  function hutSVG() {
    var d = document.createElement('div');
    d.innerHTML = '<svg class="hut" width="104" height="104" viewBox="0 0 104 104" aria-hidden="true"><path d="M6 52 L52 12 L98 52Z" fill="#B58A4A"/><path d="M6 52 L52 12 L98 52" fill="none" stroke="#8C6A3B" stroke-width="4"/><rect x="16" y="52" width="72" height="46" fill="#8C8AA8"/><g stroke="#6B6990" stroke-width="2" fill="none"><path d="M16 66 H88"/><path d="M16 82 H88"/><path d="M40 52 V66 M64 66 V82 M34 82 V98"/></g><path d="M42 98 V72 Q52 62 62 72 V98Z" fill="#14142B"/></svg>';
    return d.firstChild;
  }
  function fireSVG() {
    var d = document.createElement('div');
    d.innerHTML = '<svg width="92" height="92" viewBox="0 0 92 92" aria-hidden="true"><ellipse cx="46" cy="84" rx="34" ry="6" fill="#0B0B1C" opacity=".5"/><path d="M16 80 L76 66" stroke="#5A3B20" stroke-width="7" stroke-linecap="round"/><path d="M18 66 L74 80" stroke="#7A5230" stroke-width="7" stroke-linecap="round"/><path d="M46 62 C30 52 40 36 46 18 C52 36 62 52 46 62Z" fill="#FF6B4A"/><path d="M46 62 C38 56 42 46 46 36 C50 46 54 56 46 62Z" fill="#F5B700"/></svg>';
    return d.firstChild;
  }
  var ICON_PASS = '<svg class="ic" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="3" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="M5 6l6 6-6 6M13 6l6 6-6 6"/></svg>';
  var ICON_STOP = '<svg class="ic" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="3" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="M8 3h8l5 5v8l-5 5H8l-5-5V8z"/><path d="M12 8v5M12 16.5v.1"/></svg>';
  function iconBtn(icon, text, cls, fn) { var b = h('button', { type: 'button', class: 'gbtn ' + cls, onclick: fn }); b.innerHTML = icon; b.appendChild(document.createTextNode(text)); return b; }

  /* ---------- piezas de pantalla ---------- */
  function frame() {
    var kids = Array.prototype.slice.call(arguments);
    root.replaceChildren(h('div', { class: 'screen' }, kids));
    window.scrollTo(0, 0);
  }
  function knots(n) {
    var k = []; for (var i = 0; i < 6; i++) k.push(h('i', { class: i < n ? 'on' : '' }));
    return h('span', { class: 'knots', 'aria-hidden': 'true' }, k);
  }
  function hud(left, right) {
    return h('div', { class: 'hud' }, h('span', { class: 'pill', text: left }), right);
  }
  function msgPill(done) { return h('span', { class: 'pill' }, 'Mensaje al Cusco ', knots(done)); }
  function bubbles(lines) { return lines.map(function (t) { return h('p', { text: t }); }); }

  function textBox(opts) { /* área de texto con envío; devuelve {el, area, send, pasted} */
    var st = { pasted: false };
    st.area = h('textarea', { id: 'resp', rows: 2, maxlength: 400, placeholder: opts.ph, 'aria-label': opts.label || 'Tu respuesta' });
    st.send = btn(opts.button || 'Enviar', 'go', function () { opts.onSend(st.area.value.trim(), st.pasted); });
    st.send.disabled = true;
    st.area.addEventListener('paste', function () { st.pasted = true; });
    st.area.addEventListener('input', function () { st.send.disabled = st.area.value.trim().length < (opts.min || 1); });
    st.el = h('div', { class: 'compose' }, st.area, st.send);
    return st;
  }

  /* Teclado de piedra. Acepta también el teclado físico. */
  function keypad(label, onChange, onEnter) {
    var val = '', span = h('span', { text: '·' });
    function set(v) { val = v; span.textContent = val || '·'; onChange(val); }
    function press(k) {
      if (k === '⌫') set(val.slice(0, -1));
      else if (val.length < 7 && !(k === ',' && (!val || val.indexOf(',') !== -1))) set(val + k);
    }
    var keys = h('div', { class: 'keys' }, ['7', '8', '9', '4', '5', '6', '1', '2', '3', ',', '0', '⌫'].map(function (k) {
      return h('button', { type: 'button', class: 'key' + (k === ',' || k === '⌫' ? ' sm' : ''), text: k, 'aria-label': k === '⌫' ? 'Borrar' : k, onclick: function () { press(k); } });
    }));
    keyHandler = function (e) {
      if (e.ctrlKey || e.metaKey || e.altKey) return;
      if (/^[0-9]$/.test(e.key)) press(e.key);
      else if (e.key === ',' || e.key === '.') press(',');
      else if (e.key === 'Backspace') press('⌫');
      else if (e.key === 'Enter' && onEnter) onEnter();
    };
    return { el: [h('div', { class: 'slot' }, h('small', { text: label }), span), keys], get: function () { return val; } };
  }

  /* ---------- escenas: inicio ---------- */
  /** Lee un parámetro de la dirección, por ejemplo ?tema=porcentajes. */
  function urlParam(name) {
    try { return new URLSearchParams(location.search).get(name) || ''; } catch (e) { return ''; }
  }
  function sWelcome() {
    var alias = h('input', { id: 'alias', class: 'inp', type: 'text', maxlength: 16, placeholder: 'Un apodo (no tu nombre)', autocomplete: 'off' });
    var cls = h('input', { id: 'cls', class: 'inp', type: 'text', maxlength: 10, placeholder: 'Código de la clase', autocomplete: 'off' });
    cls.value = urlParam('clase').slice(0, 10).toUpperCase();
    var ok = h('input', { id: 'ok', type: 'checkbox' });
    var msg = h('p', { class: 'msgerr', role: 'alert' });
    var prev = store(KS);
    function read() {
      var a = alias.value.trim(), c = cls.value.trim().toUpperCase();
      if (a.length < 2) { msg.textContent = 'Escribe un apodo de al menos 2 letras.'; return false; }
      if (c.length < 3) { msg.textContent = 'Escribe el código de tu clase (3 letras o números como mínimo).'; return false; }
      if (!ok.checked) { msg.textContent = 'Marca la casilla para continuar.'; return false; }
      S = newState(a, c, C.topic.id); save(); Log.push('start', { version: CFG.VERSION, model: !!CFG.EXTRACT_URL });
      return true;
    }
    var resume = prev && prev.scene && prev.scene !== 'end' && prev.topic
      ? btn('Continuar donde me quedé (' + prev.alias + ')', 'ghost', function () { S = prev; C.use(S.topic); render(); }) : null;
    frame(
      h('div', { class: 'hero' }, chaski('confident', 110, 'bob'), h('div', { class: 'bubble' }, h('p', { class: 'title', text: 'Chaski' }), h('p', { text: 'Un mensajero que solo sabe lo que tú le enseñes. ¿Lo enseñas bien?' }))),
      h('div', { class: 'card' },
        h('p', { class: 'kicker', text: 'Hoy le enseñas' }), h('p', { class: 'title', style: 'font-size:1.5rem', text: C.topic.title }),
        h('label', { for: 'alias', text: 'Tu apodo' }), alias,
        h('label', { for: 'cls', text: 'Código de la clase' }), cls,
        h('label', { class: 'check', for: 'ok' }, ok, h('span', { text: 'Estoy con un adulto responsable y no escribiré mi nombre ni datos personales.' })),
        msg,
        btn('Enseñarle a Chaski', 'go', function () { if (read()) render(); }),
        resume),
      h('p', { class: 'small', text: 'Piloto exploratorio: no es una evaluación con nota.' }));
  }

  function startTeach(more) {
    S.more = more; S.pending = [];
    S.chat = [{ who: 'ch', text: (more ? C.teachMore : C.teach[0]).say }];
    go('teach', 0);
  }
  function sIntro() {
    var lines = C.lines.intro.concat([ANNOUNCE ? C.lines.mission : C.lines.missionHidden]);
    frame(h('div', { class: 'spacer' }), h('div', { class: 'hero' }, chaski('confident', 120, 'bob'), h('div', { class: 'bubble' }, bubbles(lines))),
      btn('¡Vamos!', 'go', function () { startTeach(false); }));
  }

  /* ---------- escenas: enseñar ---------- */
  function sTeach(i) {
    var prompts = S.more ? [C.teachMore] : C.teach, p = prompts[i], t0 = Date.now();
    var chat = h('div', { class: 'chat', 'aria-live': 'polite' }, S.chat.map(function (m) {
      return h('div', { class: 'msg ' + (m.who === 'ch' ? 'ch' : 'me') }, h('small', { text: m.who === 'ch' ? 'Chaski' : 'Tú' }), m.text);
    }));
    var box = textBox({ ph: p.ph, label: p.label, min: p.min, onSend: function (text, pasted) {
      var prior = Log.mine('teach').map(function (e) { return e.text; });
      var orig = Core.originality(text, { refs: C.refs, prior: prior, needNumbers: p.needNumbers, contextNumbers: C.contextNumbers, pasted: pasted, minWords: p.minWords });
      Log.push('teach', { k: p.k, text: text, pasted: pasted, ms: Date.now() - t0, orig: orig, phase: S.phase });
      S.pending.push(text); S.chat.push({ who: 'me', text: text });
      if (i + 1 < prompts.length) { S.chat.push({ who: 'ch', text: prompts[i + 1].say }); S.i = i + 1; save(); render(); }
      else go('brain');
    } });
    frame(hud('Enséñale a Chaski', h('span', { class: 'pill', text: S.more ? 'Un poco más' : 'Lección ' + (i + 1) + ' de ' + prompts.length })),
      h('div', { class: 'mini' }, chaski('think', 84, 'bob'), fireSVG()), chat, h('p', { class: 'small', text: 'No escribas tu nombre ni datos personales.' }), box.el);
    chat.scrollTop = chat.scrollHeight;
  }

  function fichas() {
    return h('div', { class: 'fichas', role: 'list' }, Brain.IDS.map(function (k) {
      var on = S.brain[k].state !== 'ausente';
      return h('div', { class: 'ficha' + (on ? ' on' : ''), role: 'listitem' }, h('span', { class: 'dot' }), h('span', { text: C.cards[k].short }));
    }));
  }
  function sBrain() {
    function drawBrain(res) {
      var reteach = S.phase === 'reteach', canMore = S.extraTurns < 3;
      var buttons = [];
      if (canMore) buttons.push(btn(reteach ? 'Quiero agregar algo más' : 'Quiero explicarle algo más', 'ghost', function () { S.extraTurns += 1; startTeach(true); }));
      if (reteach) buttons.unshift(btn('Terminar', 'go', function () { go('end'); }));
      else buttons.unshift(btn('¡Listo, a resolver!', 'go', function () { S.plan = Brain.planRound(S.brain); go('map', 0); }));
      frame(hud('El cerebro de Chaski', h('span', { class: 'pill', text: Brain.good(S.brain) > 0 || Brain.IDS.some(function (k) { return S.brain[k].state !== 'ausente'; }) ? 'Está aprendiendo' : 'Vacío' })),
        h('div', { class: 'hero' }, chaski(res.restatementMood || 'think', 100, 'bob'), h('div', { class: 'bubble tail' }, h('p', { text: 'Esto es lo que entendí:' }), h('p', { text: res.restatement }))),
        h('div', { class: 'card' }, h('p', { class: 'kicker', text: 'Lo que ya hay en su cerebro' }), fichas(),
          h('p', { class: 'small', text: 'Una ficha encendida significa que Chaski cree saber algo de ese tema. No dice si lo sabe bien.' })),
        h('div', { class: 'spacer' }), h('div', { class: 'stack' }, buttons));
    }
    if (!S.pending.length) { drawBrain({ restatement: S.lastRestatement || Brain.restate(S.brain) }); return; }
    frame(hud('El cerebro de Chaski', h('span', { class: 'pill', text: 'Leyendo…' })),
      h('div', { class: 'hero' }, chaski('think', 100, 'bob'), h('div', { class: 'bubble tail' }, h('p', { text: 'Déjame pensar en lo que me enseñaste…' }))),
      h('div', { class: 'think', role: 'status', 'aria-label': 'Chaski está pensando' }, h('i'), h('i'), h('i')));
    var text = S.pending.join('\n');
    Brain.extract(text, { url: CFG.EXTRACT_URL, topic: S.topic }).then(function (res) {
      if (!S || S.scene !== 'brain') return;
      S.brain = Brain.merge(S.brain, res.cards); S.lastRestatement = res.restatement; S.pending = [];
      Log.push('brain', { cards: S.brain, read: res.cards, source: res.source, why: res.why || null, restatement: res.restatement, phase: S.phase });
      save(); drawBrain(res);
    });
  }

  /* ---------- escenas: camino y problemas ---------- */
  var NODES = [[95, 505], [255, 445], [120, 375], [265, 305], [125, 235], [250, 160]];
  var PATH = 'M95 505 C190 505 190 445 255 445 C320 445 170 375 120 375 C70 375 220 305 265 305 C310 305 170 235 125 235 C80 235 210 160 250 160 C285 160 235 105 205 82';
  function sMap(i) {
    var nodes = NODES.map(function (n, k) {
      var done = k < i, cur = k === i;
      if (cur) return '<g class="node"><circle class="pulse" cx="' + n[0] + '" cy="' + n[1] + '" r="24" fill="#FF6B4A" opacity=".6"/><circle cx="' + n[0] + '" cy="' + n[1] + '" r="26" fill="#FFF" stroke="#FF6B4A" stroke-width="5"/><text x="' + n[0] + '" y="' + (n[1] + 8) + '">' + (k + 1) + '</text></g>';
      return '<g class="node' + (done ? '' : ' lock') + '"><circle cx="' + n[0] + '" cy="' + n[1] + '" r="21" fill="' + (done ? '#F5B700' : '#2A2A56') + '" stroke="' + (done ? '#8C6A3B' : '#3A3A72') + '" stroke-width="4"/><text x="' + n[0] + '" y="' + (n[1] + 7) + '">' + (k + 1) + '</text></g>';
    }).join('');
    var cur = NODES[i], left = cur[0] > 195, cx = left ? cur[0] - 92 : cur[0] + 16, cy = cur[1] - 106;
    var bx = left ? cur[0] - 190 : cur[0] + 62, by = cy + 6;
    var wrap = h('div', { class: 'mapArea' });
    wrap.innerHTML = '<svg viewBox="0 0 390 560" preserveAspectRatio="xMidYMid meet" role="img" aria-label="Camino con seis tambos, vas en el ' + (i + 1) + '">' +
      '<path d="' + PATH + '" fill="none" stroke="#2A1B10" stroke-width="30" stroke-linecap="round" stroke-linejoin="round" opacity=".55"/>' +
      '<path d="' + PATH + '" fill="none" stroke="#C9A66B" stroke-width="22" stroke-linecap="round" stroke-linejoin="round"/>' +
      '<path d="' + PATH + '" fill="none" stroke="#E6CF9C" stroke-width="3" stroke-dasharray="2 14" stroke-linecap="round"/>' +
      '<g transform="translate(205 82)"><rect x="-1.5" y="-34" width="3" height="34" fill="#F4F1E8"/><path d="M1.5 -34 L26 -27 L1.5 -19Z" fill="#FF6B4A"/><text x="0" y="22" text-anchor="middle" font-family="Baloo 2, sans-serif" font-weight="800" font-size="15" fill="#FFE9B8">Cusco</text></g>' +
      nodes +
      '<g class="bob"><svg class="chsvg" x="' + cx + '" y="' + cy + '" width="76" height="109" viewBox="0 0 120 172"><use href="#ch-confident"/></svg></g>' +
      '<g transform="translate(' + Math.max(8, Math.min(278, bx)) + ' ' + by + ')"><rect width="104" height="30" rx="15" fill="#F4F1E8"/><text x="52" y="21" text-anchor="middle" font-family="Baloo 2, sans-serif" font-weight="800" font-size="14" fill="#1B1B3A">¡Tambo ' + (i + 1) + '!</text></g></svg>';
    frame(hud('Tambo ' + (i + 1) + ' de 6', msgPill(i)), wrap, btn('Seguir el camino', 'go', function () { go('ex', i); }));
  }

  function sEx(i) {
    var sol = S.plan[i], t0 = Date.now(), n = S.plan.length;
    var rec = { ex: sol.id, rule: sol.cause, card: sol.card, cardState: sol.state, hasError: sol.hasError, said: sol.said };
    function finish() {
      rec.ms = Date.now() - t0; Log.push('ex', rec);
      if (i + 1 < n) go('map', i + 1); else go('probe', 0);
    }
    function sceneHead(say, mood, run) {
      var c = chaski(mood, 92, run ? 'runout' : 'bob'); c.id = 'chRun';
      return h('div', { class: 'scene' }, h('div', { class: 'bubble tail' }, say), h('div', { class: 'chwrap' }, c), hutSVG());
    }
    function steps(asButtons, onPick) {
      return h('div', { class: 'quipu' }, sol.steps.map(function (s, k) {
        if (!asButtons) return h('div', { class: 'step', 'data-n': String(k + 1), text: s });
        return h('button', { type: 'button', class: 'step hot', 'data-n': String(k + 1), text: s, onclick: function () { onPick(k, this); } });
      }));
    }
    function decide() {
      var toast = h('div', { class: 'toast', role: 'status', text: 'Anotado. Chaski sigue su camino' });
      frame(hud('Tambo ' + (i + 1) + ' de 6', msgPill(i)), sceneHead(C.lines.confident[i % C.lines.confident.length], 'confident'),
        h('div', { class: 'board', text: sol.text }), steps(false), h('div', { class: 'spacer' }),
        h('div', { class: 'row2' },
          iconBtn(ICON_PASS, 'Dejar pasar', 'pass', function () {
            rec.saidError = false; rec.decideMs = Date.now() - t0;
            var c = document.getElementById('chRun'); c.classList.remove('bob'); c.classList.add('runout'); toast.classList.add('show');
            setTimeout(finish, 850);
          }),
          iconBtn(ICON_STOP, '¡Alto, Chaski!', 'stop', function () { rec.saidError = true; rec.decideMs = Date.now() - t0; lens(); })), toast);
    }
    function lens() {
      frame(hud('Tambo ' + (i + 1) + ' de 6', h('span', { class: 'pill', text: 'Lupa' })), sceneHead('¿Yo? ¿Equivocarme? A ver, ¿dónde?', 'oops'),
        h('div', { class: 'board', text: 'Toca el nudo donde se equivocó' }),
        steps(true, function (k, el) {
          rec.step = k; rec.stepOk = sol.errStep === k; el.classList.remove('hot'); el.classList.add('sel');
          setTimeout(fix, 400);
        }), h('div', { class: 'spacer' }),
        btn('No sé en cuál', 'ghost', function () { rec.step = -1; rec.stepOk = false; fix(); }));
    }
    function fix() {
      var submit = btn('Corregir a Chaski', 'go', function () {
        rec.correction = Core.parseNum(kp.get()); rec.correctionOk = Core.numEq(rec.correction, sol.answer); finish();
      });
      submit.disabled = true;
      var kp = keypad('Tu respuesta', function (v) { submit.disabled = Core.parseNum(v) == null; }, function () { if (!submit.disabled) submit.click(); });
      frame(hud('Tambo ' + (i + 1) + ' de 6', h('span', { class: 'pill', text: 'Corrige a Chaski' })),
        h('div', { class: 'scene', style: 'height:150px' }, h('div', { class: 'bubble tail', style: 'right:20px' }, 'Mmm, está bien. ¿Y cuál es la respuesta correcta?'), h('div', { class: 'chwrap' }, chaski('think', 74, 'bob'))),
        h('div', { class: 'board', text: sol.text }), kp.el, submit);
    }
    decide();
  }

  function sProbe(i) {
    var p = C.probes[i], t0 = Date.now(), say = C.lines.probeSay[i];
    var head = hud('Preguntas de Chaski', h('span', { class: 'pill', text: (i + 1) + ' de ' + C.probes.length }));
    var hero = h('div', { class: 'hero' }, chaski('think', 100, 'bob'), h('div', { class: 'bubble tail' }, h('p', { text: say })));
    if (p.kind === 'num') {
      var submit = btn('Responder', 'go', function () {
        var v = Core.parseNum(kp.get());
        Log.push('probe', { k: p.k, kind: 'num', rule: p.rule, value: v, ok: Core.numEq(v, p.answer), ms: Date.now() - t0 });
        go('probe', i + 1);
      });
      submit.disabled = true;
      var kp = keypad('Tu respuesta', function (v) { submit.disabled = Core.parseNum(v) == null; }, function () { if (!submit.disabled) submit.click(); });
      frame(head, hero, h('div', { class: 'board', text: p.q }), kp.el, submit);
    } else {
      var box = textBox({ ph: 'Cuéntalo a tu manera…', label: 'Tu ejemplo', min: 12, onSend: function (text, pasted) {
        var prior = Log.mine('teach').map(function (e) { return e.text; });
        var orig = Core.originality(text, { refs: C.refs, prior: prior, needNumbers: true, contextNumbers: C.contextNumbers, pasted: pasted, minWords: 5 });
        Log.push('probe', { k: p.k, kind: 'free', text: text, pasted: pasted, ms: Date.now() - t0, orig: orig });
        go('reveal');
      } });
      frame(head, hero, h('div', { class: 'board', text: p.q }), h('div', { class: 'spacer' }), h('p', { class: 'small', text: 'No escribas tu nombre ni datos personales.' }), box.el);
    }
  }

  /* ---------- escena: rendición de cuentas ---------- */
  function outcome(e) { return e.hasError ? (e.saidError ? 'hit' : 'miss') : (e.saidError ? 'fa' : 'okc'); }
  var LABEL = { hit: 'Atrapado', miss: 'Se pasó', fa: 'Falsa alarma', okc: 'Chaski acertó' };
  function question(text) { var parts = text.split(/(?<=[.?])\s+/); return parts[parts.length - 1]; }
  function sReveal() {
    var exs = Log.mine('ex'), misses = exs.filter(function (e) { return outcome(e) === 'miss'; }).length;
    var sellos = h('div', { class: 'sellos', role: 'list' }, exs.map(function (e, k) { var o = outcome(e); return h('div', { class: 'sello ' + o, role: 'listitem' }, h('b', { text: String(k + 1) }), LABEL[o]); }));
    var anyBad = false;
    var lines = exs.map(function (e) {
      var sol = C.problems[e.ex], delivered = !e.hasError ? sol.answer : (e.saidError && e.correctionOk ? sol.answer : e.said), good = Core.numEq(delivered, sol.answer);
      if (!good) anyBad = true;
      return h('div', { class: 'ln ' + (good ? 'ok' : 'bad') }, h('span', { text: question(sol.text) }), h('em', { text: fmt(delivered) }));
    });
    var parch = h('div', { class: 'parch' }, h('h3', { text: 'El mensaje que llegó al Cusco' }), lines,
      anyBad ? h('p', { class: 'note', text: 'Lo marcado en rojo llegó con error porque no se corrigió a tiempo.' }) : h('p', { class: 'note', style: 'color:#0E7A4A', text: 'Todo llegó bien.' }));
    var causes = {}, why = [];
    exs.forEach(function (e) {
      if (!e.hasError || causes[e.rule]) return; causes[e.rule] = true;
      var c = C.cards[e.rule], st = S.brain[e.rule] ? S.brain[e.rule].state : null, reason;
      if (e.rule === 'S') reason = 'Se descuidó en una cuenta, aunque entendía la idea.';
      else if (st === 'mal') reason = 'Le enseñaste algo distinto' + (S.brain[e.rule].evidence ? ': «' + S.brain[e.rule].evidence + '».' : '.');
      else reason = 'No le enseñaste este tema, así que usó su intuición.';
      why.push(h('div', { class: 'rulecard' }, h('p', { class: 'why', text: reason }), h('strong', { text: c.title }), h('span', { text: c.text })));
    });
    var say = misses > 0 ? ['¡Uy! Sonaba muy seguro, ¿no?', 'Hice lo que aprendí de ti. Así también hacen las IA: suenan seguras aunque se equivoquen.']
      : ['¡No me dejaste pasar ni una!', 'Que alguien suene seguro no significa que tenga razón.'];
    var buttons = [];
    if (!S.reteached) buttons.push(btn('Enseñarle lo que le faltó', 'go', function () { S.reteached = true; S.phase = 'reteach'; startTeach(true); }));
    buttons.push(btn('Terminar', S.reteached ? 'go' : 'ghost', function () { go('end'); }));
    frame(hud('Rendición de cuentas', h('span', { class: 'pill', text: exs.length + ' de ' + exs.length })),
      h('div', { class: 'hero' }, chaski(misses > 0 ? 'oops' : 'happy', 84, 'bob'), h('div', { class: 'bubble tail' }, bubbles(say))),
      sellos, parch, why.length ? h('p', { class: 'kicker', text: 'Por qué pasó' }) : null, why, h('div', { class: 'stack' }, buttons));
  }

  /* ---------- escena: cierre ---------- */
  function stat(label, value) { return h('div', { class: 'stat' }, h('span', { text: label }), h('p', { class: 'big', text: value })); }
  var CARD_STATE = { bien: 'Bien enseñada', mal: 'Enseñada distinta', ausente: 'No la enseñaste' };
  function sEnd() {
    Log.flush();
    var m = Core.metricsFor(Log.mine());
    var ideas = Brain.IDS.map(function (k) {
      return h('div', { class: 'rulecard' }, h('strong', { text: C.cards[k].title }), h('span', { text: CARD_STATE[S.brain[k].state] }));
    });
    frame(h('div', { class: 'hero' }, chaski('happy', 92, 'bob'), h('div', { class: 'bubble tail' }, bubbles(['¡Gracias por enseñarme!', 'Aprendí bien ' + Brain.good(S.brain) + ' de 3 ideas contigo.']))),
      h('div', { class: 'card' }, h('p', { class: 'kicker', text: 'Tu resumen · ' + C.topic.title }),
        h('div', { class: 'stats' }, [stat('Errores que atrapaste', m.hits + ' / ' + m.nErr), stat('Ideas bien enseñadas', Brain.good(S.brain) + ' / 3')]), ideas),
      h('div', { class: 'stack' },
        btn('Guardar mis resultados (archivo)', 'ghost', function () {
          var a = h('a', { href: URL.createObjectURL(new Blob([JSON.stringify({ events: Log.mine() }, null, 2)], { type: 'application/json' })), download: 'chaski-' + S.alias + '.json' });
          document.body.appendChild(a); a.click(); a.remove();
        }),
        btn('Salir', 'ghost', function () { S = null; store(KS, null); render(); })));
  }

  /* ---------- arranque ---------- */
  function render() {
    keyHandler = null; /* cada escena que use el teclado de piedra lo registra de nuevo */
    if (!S || !S.scene) return sWelcome();
    var map = { intro: sIntro, teach: sTeach, brain: sBrain, map: sMap, ex: sEx, probe: sProbe, reveal: sReveal, end: sEnd };
    (map[S.scene] || sWelcome)(S.i);
  }
  setupWorld();
  Log.load();
  C.use(urlParam('tema')); /* el docente elige el tema con el enlace; sin tema, proporciones */
  S = null; /* se parte de la pantalla de inicio; «Continuar» retoma el estado guardado */
  render();
  window.__chaski = { get state() { return S; }, log: Log, go: go }; /* para pruebas */
})();
