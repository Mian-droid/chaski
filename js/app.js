/**
 * Chaski: flujo del juego (interfaz).
 *
 * Escenas: welcome -> intro -> teach -> brain -> map/ex (6 problemas) -> probe -> reveal -> (teach -> brain) -> end.
 * El tema se elige por la dirección: index.html?tema=porcentajes&clase=3A (ver docs/contenido-de-temas.md).
 * Lo visual (fondo, personaje, choza) vive en scenery.js. Todo texto del usuario se inserta con textContent,
 * nunca como HTML.
 */
(function () {
  'use strict';

  var C = window.ChaskiContent, Core = window.ChaskiCore, Brain = window.ChaskiBrain, Scenery = window.ChaskiScenery, CFG = window.CHASKI_CONFIG || {};
  var root = document.getElementById('app');
  var ANNOUNCE = CFG.ANNOUNCE_ERRORS !== false;
  var KS = 'chaski.state.v4', KL = 'chaski.log.v1';
  var S = null;
  var keyHandler = null;
  var chaski = Scenery.chaski, hutSVG = Scenery.hut;

  /** Momento del día de cada escena: amanecer al entrar, día para jugar, atardecer en la rendición. */
  var SCENE_TIME = { welcome: 'amanecer', intro: 'amanecer', teach: 'dia', brain: 'dia', map: 'dia', ex: 'dia', probe: 'dia', reveal: 'atardecer', end: 'atardecer' };
  /** Pista breve bajo la pregunta, según la lección. */
  var HINT = { t1: 'Escríbelo como se lo explicarías a un amigo.', t2: 'Usa números y cuéntalo paso a paso.', tx: 'Puedes agregar algo o corregir lo que dijiste.' };

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
  /** Crea un elemento. El texto siempre entra como texto; los eventos se indican como onclick, oninput... */
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
  /** Estado de una partida. Se guarda en el dispositivo para poder retomarla. `lessons` son los nudos de la cuerda. */
  function newState(alias, cls, topic) {
    return { sid: Math.random().toString(36).slice(2, 10), alias: alias, cls: cls, topic: topic, scene: 'intro', i: 0,
      brain: Brain.emptyBrain(), plan: null, lessons: [], pending: [], more: false, phase: 'inicial', extraTurns: 0, reteached: false };
  }
  function save() { store(KS, S); }
  function go(scene, i) {
    S.scene = scene; S.i = i || 0; save();
    if (scene === 'reveal' || scene === 'end') Log.flush(); /* enviar a la hoja en los hitos */
    render();
  }

  /* ---------- piezas de pantalla ---------- */
  var ICON_PASS = '<svg class="ic" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="3" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="M5 6l6 6-6 6M13 6l6 6-6 6"/></svg>';
  var ICON_STOP = '<svg class="ic" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="3" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="M8 3h8l5 5v8l-5 5H8l-5-5V8z"/><path d="M12 8v5M12 16.5v.1"/></svg>';
  var ICON_KNOT = '<svg class="ic" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="3" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="M4 12h8M12 12c0-4 3-6 6-6s3 4 0 6-6 0-6 0 3 2 6 0 3-6 0-6"/></svg>';
  function iconBtn(icon, text, cls, fn) { var b = h('button', { type: 'button', class: 'gbtn ' + cls, onclick: fn }); b.innerHTML = icon; b.appendChild(document.createTextNode(text)); return b; }

  /** Dibuja una escena: pinta el fondo del momento del día y reemplaza el contenido. */
  function frame() {
    Scenery.paint(SCENE_TIME[S && S.scene ? S.scene : 'welcome'] || 'dia');
    var kids = Array.prototype.slice.call(arguments);
    root.replaceChildren(h('div', { class: 'screen' }, kids));
    window.scrollTo(0, 0);
  }
  function knots(n) {
    var k = []; for (var i = 0; i < 6; i++) k.push(h('i', { class: i < n ? 'on' : '' }));
    return h('span', { class: 'knots', 'aria-hidden': 'true' }, k);
  }
  function hud(left, right) { return h('div', { class: 'hud' }, h('span', { class: 'pill', text: left }), right); }
  function msgPill(done) { return h('span', { class: 'pill' }, 'Mensaje al Cusco ', knots(done)); }
  function bubbles(lines) { return lines.map(function (t) { return h('p', { text: t }); }); }

  /**
   * Tablilla de arcilla para escribir (no es un chat: no hay historial de mensajes).
   * Devuelve {el, send, area, pasted()}; el botón `send` se coloca aparte, debajo de la tablilla.
   */
  function tablet(opts) {
    var st = { pasted: false };
    st.area = h('textarea', { id: 'resp', maxlength: 400, placeholder: opts.ph, 'aria-label': opts.label });
    var count = h('span', { text: '0 / 400' });
    st.send = iconBtn(ICON_KNOT, opts.button || 'Enseñarle', 'go', function () { opts.onSend(st.area.value.trim(), st.pasted, st); });
    st.send.disabled = true;
    st.area.addEventListener('paste', function () { st.pasted = true; });
    st.area.addEventListener('input', function () { count.textContent = st.area.value.length + ' / 400'; st.send.disabled = st.area.value.trim().length < (opts.min || 1); });
    st.el = h('div', { class: 'tablet' }, h('label', { for: 'resp', text: opts.label }), st.area, h('div', { class: 'foot' }, h('span', { text: 'No escribas tu nombre ni datos personales.' }), count));
    return st;
  }

  /** Cuerda de nudos: un nudo por lección enseñada. Tocar un nudo muestra lo que se enseñó. */
  function cordbar() {
    var lessons = S.lessons, n = Math.max(3, lessons.length + 1), els = [];
    var popK = h('small'), popT = h('span'), pop = h('div', { class: 'pop', hidden: true }, popK, popT);
    for (var i = 0; i < n; i++) (function (i) {
      var on = i < lessons.length;
      var k = h('button', { type: 'button', class: 'k' + (on ? ' on' : ''), 'aria-label': on ? 'Ver la lección ' + (i + 1) : 'Lección ' + (i + 1) + ' pendiente' });
      k.addEventListener('click', function () {
        if (!k.classList.contains('on') || !lessons[i]) return;
        var same = !pop.hidden && pop.dataset.i === String(i);
        pop.hidden = same; pop.dataset.i = String(i);
        popK.textContent = 'Lo que le enseñaste · lección ' + (i + 1); popT.textContent = lessons[i].text;
      });
      els.push(k);
    })(i);
    return { bar: h('div', { class: 'cordbar' }, h('span', { class: 'lbl', text: 'Lo que Chaski sabe' }), els), pop: pop, knot: function (i) { return els[i]; }, fill: function (i) { els[i].classList.add('on'); } };
  }

  /** El texto escrito vuela de la tablilla al nudo de la cuerda. Sin animación si el usuario pidió menos movimiento. */
  function flyTo(fromEl, toEl, text, done) {
    var reduce = window.matchMedia && window.matchMedia('(prefers-reduced-motion: reduce)').matches;
    if (reduce || !fromEl.animate || !toEl) return done();
    var a = fromEl.getBoundingClientRect(), b = toEl.getBoundingClientRect();
    var chip = h('div', { class: 'fly', text: text.length > 46 ? text.slice(0, 46) + '…' : text }), finished = false;
    chip.style.left = (a.left + 20) + 'px'; chip.style.top = (a.top + 20) + 'px';
    document.body.appendChild(chip);
    var dx = b.left + b.width / 2 - (a.left + 20) - 60, dy = b.top + b.height / 2 - (a.top + 20) - 10;
    function end() { if (finished) return; finished = true; chip.remove(); done(); }
    var anim = chip.animate([
      { transform: 'translate(0,0) scale(1) rotate(0)', opacity: 1 },
      { transform: 'translate(' + dx * 0.5 + 'px,' + (dy * 0.5 - 40) + 'px) scale(.7) rotate(-4deg)', opacity: 1, offset: 0.5 },
      { transform: 'translate(' + dx + 'px,' + dy + 'px) scale(.12) rotate(8deg)', opacity: 0.9 }
    ], { duration: 700, easing: 'cubic-bezier(.5,0,.25,1)' });
    anim.onfinish = end;
    setTimeout(end, 1500); /* por si la pestaña está en segundo plano y la animación se pausa */
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
      ? btn('Continuar donde me quedé (' + prev.alias + ')', 'ghost', function () { S = prev; S.lessons = S.lessons || []; C.use(S.topic); render(); }) : null;
    frame(
      h('div', { class: 'brandrow' }, h('span', { class: 'tag', text: 'Hoy le enseñas: ' + C.topic.title }), h('h1', { class: 'logo', text: 'Chaski' })),
      h('div', { class: 'center', style: 'height:168px;align-items:flex-end' }, chaski('happy', 120, 'bob')),
      h('div', { class: 'card' },
        h('p', { class: 'small', text: 'Un mensajero que solo sabe lo que tú le enseñes. ¿Lo enseñas bien?' }),
        h('label', { for: 'alias', text: 'Tu apodo' }), alias,
        h('label', { for: 'cls', text: 'Código de la clase' }), cls,
        h('label', { class: 'check', for: 'ok' }, ok, h('span', { text: 'Estoy con un adulto responsable y no escribiré mi nombre ni datos personales.' })),
        msg,
        btn('Enseñarle a Chaski', 'go', function () { if (read()) render(); }),
        resume),
      h('p', { class: 'legend', text: 'Piloto exploratorio: no es una evaluación con nota.' }));
  }

  function startTeach(more) {
    S.more = more; S.pending = [];
    go('teach', 0);
  }
  function sIntro() {
    var lines = C.lines.intro.concat([ANNOUNCE ? C.lines.mission : C.lines.missionHidden]);
    frame(h('div', { class: 'spacer' }), h('div', { class: 'hero' }, chaski('confident', 124, 'bob'), h('div', { class: 'bubble tail' }, bubbles(lines))),
      btn('¡Vamos!', 'go', function () { startTeach(false); }));
  }

  /* ---------- escenas: enseñar ---------- */
  /** Chaski plantea la pregunta en una placa de piedra; el estudiante responde en una tablilla; la lección ata un nudo. */
  function sTeach(i) {
    var prompts = S.more ? [C.teachMore] : C.teach, p = prompts[i], t0 = Date.now(), busy = false;
    var cord = cordbar();
    var who = h('div', { class: 'who' }, chaski('listen', 118, 'bob'));
    var box = tablet({ ph: p.ph, label: 'Tu tablilla', min: p.min, onSend: function (text, pasted, st) {
      if (busy) return; busy = true; st.send.disabled = true; st.area.disabled = true; /* se bloquea mientras el texto vuela al nudo */
      var prior = Log.mine('teach').map(function (e) { return e.text; });
      var orig = Core.originality(text, { refs: C.refs, prior: prior, needNumbers: p.needNumbers, contextNumbers: C.contextNumbers, pasted: pasted, minWords: p.minWords });
      Log.push('teach', { k: p.k, text: text, pasted: pasted, ms: Date.now() - t0, orig: orig, phase: S.phase });
      var idx = S.lessons.length;
      S.pending.push(text); S.lessons.push({ k: p.k, text: text }); save();
      flyTo(st.area, cord.knot(idx), text, function () {
        cord.fill(idx); who.classList.remove('nod'); void who.offsetWidth; who.classList.add('nod');
        setTimeout(function () { if (i + 1 < prompts.length) { S.i = i + 1; save(); render(); } else go('brain'); }, 450);
      });
    } });
    frame(cord.bar, cord.pop,
      h('div', { class: 'plaque' }, h('div', { class: 'kicker', text: S.more ? 'Una lección extra' : 'Lección ' + (i + 1) + ' de ' + prompts.length }), h('p', { class: 'q', text: p.say })),
      h('div', { class: 'stageT' }, who, h('div', { class: 'hint', text: HINT[p.k] || '' })),
      box.el, box.send);
  }

  function hangTablets() {
    return [h('div', { class: 'beam', 'aria-hidden': 'true' }), h('div', { class: 'hang', role: 'list' }, Brain.IDS.map(function (k) {
      var on = S.brain[k].state !== 'ausente';
      return h('div', { class: 'f' + (on ? ' on' : ''), role: 'listitem' }, h('div', { class: 'tab' }, h('span', { class: 'dot' }), C.cards[k].short));
    }))];
  }
  /** El cerebro: Chaski piensa en voz alta (nube) y las ideas que cree saber cuelgan encendidas. */
  function sBrain() {
    function drawBrain(res) {
      var reteach = S.phase === 'reteach', canMore = S.extraTurns < 3;
      var buttons = [];
      if (canMore) buttons.push(btn(reteach ? 'Quiero agregar algo más' : 'Quiero explicarle algo más', 'ghost', function () { S.extraTurns += 1; startTeach(true); }));
      if (reteach) buttons.unshift(btn('Terminar', 'go', function () { go('end'); }));
      else buttons.unshift(btn('¡Listo, a resolver!', 'go', function () { S.plan = Brain.planRound(S.brain); go('map', 0); }));
      var learning = Brain.IDS.some(function (k) { return S.brain[k].state !== 'ausente'; });
      frame(hud('El cerebro de Chaski', h('span', { class: 'pill', text: learning ? 'Está aprendiendo' : 'Vacío' })),
        h('div', { class: 'center' }, chaski('think', 108, 'bob')),
        h('div', { class: 'thought' }, h('span', { class: 'kicker', text: 'Esto es lo que entendí' }), res.restatement),
        hangTablets(),
        h('p', { class: 'legend', text: 'Una tablilla encendida significa que Chaski cree saber algo. No dice si lo sabe bien.' }),
        h('div', { class: 'spacer' }), h('div', { class: 'stack' }, buttons));
    }
    if (!S.pending.length) { drawBrain({ restatement: S.lastRestatement || Brain.restate(S.brain) }); return; }
    frame(hud('El cerebro de Chaski', h('span', { class: 'pill', text: 'Leyendo…' })),
      h('div', { class: 'center' }, chaski('think', 108, 'bob')),
      h('div', { class: 'thought' }, h('span', { class: 'kicker', text: 'Un momento' }), 'Déjame pensar en lo que me enseñaste…'),
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
      if (cur) return '<g class="node"><circle class="pulse" cx="' + n[0] + '" cy="' + n[1] + '" r="24" fill="#C2185B" opacity=".6"/><circle cx="' + n[0] + '" cy="' + n[1] + '" r="27" fill="#fff" stroke="#C2185B" stroke-width="5"/><text x="' + n[0] + '" y="' + (n[1] + 8) + '">' + (k + 1) + '</text></g>';
      return '<g class="node' + (done ? '' : ' lock') + '"><circle cx="' + n[0] + '" cy="' + n[1] + '" r="21" fill="' + (done ? '#FFC83D' : '#E7DCC4') + '" stroke="' + (done ? '#3B2A8C' : '#8E8165') + '" stroke-width="4"/><text x="' + n[0] + '" y="' + (n[1] + 7) + '">' + (k + 1) + '</text></g>';
    }).join('');
    var cur = NODES[i], left = cur[0] > 195, cx = left ? cur[0] - 98 : cur[0] + 14, cy = cur[1] - 114;
    var bx = left ? cur[0] - 190 : cur[0] + 62, by = cy + 8;
    var wrap = h('div', { class: 'mapArea' });
    wrap.innerHTML = '<svg viewBox="0 0 390 560" preserveAspectRatio="xMidYMid meet" role="img" aria-label="Camino con seis tambos, vas en el ' + (i + 1) + '">' +
      '<path d="' + PATH + '" fill="none" stroke="#7A4D26" stroke-width="32" stroke-linecap="round" stroke-linejoin="round" opacity=".45"/>' +
      '<path d="' + PATH + '" fill="none" stroke="#F1DDAE" stroke-width="24" stroke-linecap="round" stroke-linejoin="round"/>' +
      '<path d="' + PATH + '" fill="none" stroke="#C9A66B" stroke-width="3" stroke-dasharray="3 12" stroke-linecap="round"/>' +
      '<g transform="translate(205 82)"><rect x="-1.5" y="-36" width="3.5" height="36" fill="#2B1B3D"/><path d="M2 -36 L28 -28 L2 -19Z" fill="#C2185B" stroke="#2B1B3D" stroke-width="2"/><text y="24" text-anchor="middle" font-family="Baloo 2, sans-serif" font-weight="800" font-size="16" fill="#2B1B3D" stroke="#FFF3D6" stroke-width="4" paint-order="stroke">Cusco</text></g>' +
      nodes +
      '<g class="bob"><svg class="chsvg" x="' + cx + '" y="' + cy + '" width="82" height="117" viewBox="0 0 140 200"><use href="#ch-confident"/></svg></g>' +
      '<g transform="translate(' + Math.max(8, Math.min(282, bx)) + ' ' + by + ')"><rect width="100" height="30" rx="15" fill="#fff" stroke="#3B2A8C" stroke-width="3"/><text x="50" y="21" text-anchor="middle" font-family="Baloo 2, sans-serif" font-weight="800" font-size="14" fill="#3B2A8C">¡Tambo ' + (i + 1) + '!</text></g></svg>';
    frame(hud('Tambo ' + (i + 1) + ' de 6', msgPill(i)), wrap, btn('Seguir el camino', 'go', function () { go('ex', i); }));
  }

  function sEx(i) {
    var sol = S.plan[i], t0 = Date.now(), n = S.plan.length;
    var rec = { ex: sol.id, rule: sol.cause, card: sol.card, cardState: sol.state, hasError: sol.hasError, said: sol.said };
    function finish() {
      rec.ms = Date.now() - t0; Log.push('ex', rec);
      if (i + 1 < n) go('map', i + 1); else go('probe', 0);
    }
    function sceneHead(say, mood, height) {
      var c = chaski(mood, 104, 'bob'); c.id = 'chRun';
      var scene = h('div', { class: 'scene' }, h('div', { class: 'sign', text: say }), h('div', { class: 'chwrap' }, c), hutSVG());
      if (height) scene.style.height = height + 'px';
      return scene;
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
        sceneHead('Mmm, está bien. ¿Y cuál es la respuesta correcta?', 'think', 170),
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
      var box = tablet({ ph: 'Cuéntalo a tu manera…', label: 'Tu ejemplo', min: 12, button: 'Enviar', onSend: function (text, pasted) {
        var prior = Log.mine('teach').map(function (e) { return e.text; });
        var orig = Core.originality(text, { refs: C.refs, prior: prior, needNumbers: true, contextNumbers: C.contextNumbers, pasted: pasted, minWords: 5 });
        Log.push('probe', { k: p.k, kind: 'free', text: text, pasted: pasted, ms: Date.now() - t0, orig: orig });
        go('reveal');
      } });
      frame(head, hero, h('div', { class: 'board', text: p.q }), h('div', { class: 'spacer' }), box.el, box.send);
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
      h('div', { class: 'hero' }, chaski(misses > 0 ? 'oops' : 'happy', 90, 'bob'), h('div', { class: 'bubble tail' }, bubbles(say))),
      sellos, parch, why.length ? h('p', { class: 'legend', text: 'Por qué pasó' }) : null, why, h('div', { class: 'stack' }, buttons));
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
    frame(h('div', { class: 'hero' }, chaski('happy', 96, 'bob'), h('div', { class: 'bubble tail' }, bubbles(['¡Gracias por enseñarme!', 'Aprendí bien ' + Brain.good(S.brain) + ' de 3 ideas contigo.']))),
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
  Scenery.setup();
  Log.load();
  C.use(urlParam('tema')); /* el docente elige el tema con el enlace; sin tema, proporciones */
  S = null; /* se parte de la pantalla de inicio; «Continuar» retoma el estado guardado */
  render();
  window.__chaski = { get state() { return S; }, log: Log, go: go }; /* para pruebas */
})();
