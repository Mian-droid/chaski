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
  var SCENE_TIME = { welcome: 'amanecer', intro: 'amanecer', teach: 'dia', brain: 'dia', map: 'dia', ex: 'dia', probeintro: 'dia', probe: 'dia', reveal: 'atardecer', end: 'atardecer' };
  /** Pista breve bajo la pregunta, según la lección. */
  var HINT = { t1: 'Escríbelo como se lo explicarías a un amigo.', t2: 'Usa números y cuéntalo paso a paso.', tx: 'Puedes agregar algo o corregir lo que dijiste.', tc: 'Hazlo con números, paso a paso.' };

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
    events: [], sent: 0, lastSent: 0, timer: null, busy: false,
    load: function () { var d = store(KL); if (d) { this.events = d.events || []; this.sent = d.sent || 0; } },
    save: function () { store(KL, { events: this.events, sent: this.sent }); },
    push: function (type, data) {
      var ev = { ts: Date.now(), type: type, sid: S.sid, alias: S.alias, cls: S.cls, topic: S.topic, day: 1 };
      Object.keys(data || {}).forEach(function (k) { ev[k] = data[k]; });
      this.events.push(ev); this.save();
    },
    mine: function (type) { return this.events.filter(function (e) { return e.sid === S.sid && (!type || e.type === type); }); },
    /** Envía pronto, pero sin pasar de un envío cada 8 segundos: el panel ve avanzar a cada estudiante sin que el servidor reciba un envío por clic. */
    soon: function (force) {
      var self = this, wait = 8000 - (Date.now() - self.lastSent);
      if (force || wait <= 0) { clearTimeout(self.timer); self.timer = null; self.flush(); return; }
      if (!self.timer) self.timer = setTimeout(function () { self.timer = null; self.flush(); }, wait);
    },
    /** Envía los eventos que faltan por enviar, de a 100. Con la base de datos del propio sitio (ENDPOINT "/events") se comprueba la respuesta. */
    flush: function () {
      var self = this;
      if (!CFG.ENDPOINT || self.busy) return;
      var batch = self.events.slice(self.sent, self.sent + 100);
      if (!batch.length) return;
      var same = CFG.ENDPOINT.charAt(0) === '/';
      var opts = { method: 'POST', headers: { 'Content-Type': 'text/plain;charset=utf-8' }, body: JSON.stringify({ events: batch }) };
      if (!same) opts.mode = 'no-cors';
      else if (opts.body.length < 60000) opts.keepalive = true; /* que el envío termine aunque se cierre la pestaña */
      self.busy = true; self.lastSent = Date.now();
      fetch(CFG.ENDPOINT, opts).then(function (r) {
        if (same && r.status >= 500) throw new Error('servidor no disponible'); /* los 4xx no se arreglan reintentando */
        self.sent += batch.length; self.save(); self.busy = false; self.flush();
      }).catch(function () { self.busy = false; /* se reintenta en el siguiente envío */ });
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
    Log.soon(scene === 'reveal' || scene === 'end'); /* el panel docente ve el avance; en los hitos finales se envía de inmediato */
    render();
  }

  /* ---------- piezas de pantalla ---------- */
  var ICON_PASS = '<svg class="ic" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="3" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="M5 6l6 6-6 6M13 6l6 6-6 6"/></svg>';
  var ICON_STOP = '<svg class="ic" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="3" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="M8 3h8l5 5v8l-5 5H8l-5-5V8z"/><path d="M12 8v5M12 16.5v.1"/></svg>';
  var ICON_KNOT = '<svg class="ic" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="3" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="M4 12h8M12 12c0-4 3-6 6-6s3 4 0 6-6 0-6 0 3 2 6 0 3-6 0-6"/></svg>';
  function iconBtn(icon, text, cls, fn) { var b = h('button', { type: 'button', class: 'gbtn ' + cls, onclick: fn }); b.innerHTML = icon; b.appendChild(document.createTextNode(text)); return b; }

  /**
   * Dibuja una escena: pinta el fondo del momento del día y reemplaza el contenido.
   * `spec.hud` es el encabezado; `spec.hero`, lo que va junto a Chaski (columna izquierda en pantallas anchas);
   * `spec.main`, la tarea; `spec.mode` ajusta el reparto: 'solo' (una columna) o 'tall' (contenido largo).
   */
  function frame(spec) {
    Scenery.paint(SCENE_TIME[S && S.scene ? S.scene : 'welcome'] || 'dia');
    var cols = h('div', { class: 'cols' + (spec.mode ? ' ' + spec.mode : '') },
      spec.hero ? h('div', { class: 'hero-col' }, spec.hero) : null,
      h('div', { class: 'panel-col' }, spec.main));
    root.replaceChildren(h('div', { class: 'screen' }, spec.hud || null, cols));
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
    var st = { pasted: false, voiced: false, voiceChanged: false, voiceMs: 0, voiceSnap: '' };
    st.area = h('textarea', { id: 'resp', maxlength: 400, placeholder: opts.ph, 'aria-label': opts.label });
    var count = h('span', { text: '0 / 400' });
    var warn = h('p', { class: 'msgerr', role: 'alert' });
    /** Lo que se registra si dictó: que usó la voz, si cambió el texto después de dictar y cuánto grabó. Sin audio. */
    st.voiceInfo = function () { return st.voiced ? { voz: true, editado: st.voiceChanged || st.area.value !== st.voiceSnap, vozMs: st.voiceMs } : {}; };
    /** El botón de enviar solo sirve con texto suficiente y mientras no se está pasando la voz a texto. */
    st.refreshSend = function () { st.send.disabled = !!st.busy || st.area.value.trim().length < (opts.min || 1); };
    st.send = iconBtn(ICON_KNOT, opts.button || 'Enseñarle', 'go', function () {
      var text = st.area.value.trim(), pd = Core.personalData(text);
      /* Un correo, un teléfono o un documento no se envían a la IA ni se guardan: se pide quitarlos. */
      if (pd) { warn.textContent = 'Parece que escribiste un ' + pd + '. Bórralo: Chaski no necesita datos personales.'; return; }
      opts.onSend(text, st.pasted, st);
      if (st.lock) st.lock(); /* ya se envió: el micrófono se suelta y no graba mientras el texto vuela */
    });
    st.send.disabled = true;
    st.area.addEventListener('paste', function () { st.pasted = true; });
    st.area.addEventListener('input', function () { warn.textContent = ''; count.textContent = st.area.value.length + ' / 400'; st.refreshSend(); });
    var voiceRow = voiceControls(st, warn);
    st.el = h('div', { class: 'tablet' }, h('label', { for: 'resp', text: opts.label }), st.area, voiceRow, h('div', { class: 'foot' }, h('span', { text: 'No escribas tu nombre ni datos personales.' }), count), warn);
    return st;
  }

  /**
   * Dictado por voz en la tablilla (siempre que el navegador pueda grabar; el docente lo apaga con ?voz=0 en el enlace).
   * El estudiante toca el micrófono, habla y vuelve a tocar: el texto se agrega a la tablilla y se puede editar antes de enviar.
   * Devuelve null si la voz no está disponible: entonces la tablilla es la de siempre.
   */
  var ICON_MIC = '<svg class="ic" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.6" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><rect x="9" y="3" width="6" height="11" rx="3"/><path d="M5 11a7 7 0 0 0 14 0M12 18v3"/></svg>';
  var ICON_STOP_SQ = '<svg class="ic" viewBox="0 0 24 24" fill="currentColor" aria-hidden="true"><rect x="6" y="6" width="12" height="12" rx="2"/></svg>';
  function voiceControls(st, warn) {
    var V = window.ChaskiVoice;
    if (!(S && S.voz && CFG.TRANSCRIBE_URL && V && V.supported())) return null;
    var status = h('p', { class: 'voicemsg', role: 'status' });
    var mic = h('button', { type: 'button', class: 'mic' });
    function label(icon, text) { mic.innerHTML = icon; mic.appendChild(document.createTextNode(text)); }
    function clock(ms) { var s = Math.floor(ms / 1000); return Math.floor(s / 60) + ':' + (s % 60 < 10 ? '0' : '') + (s % 60); }
    label(ICON_MIC, 'Hablar');
    mic.setAttribute('aria-label', 'Dictar con la voz');
    var rec = V.create({
      url: CFG.TRANSCRIBE_URL,
      onState: function (state, info) {
        mic.classList.toggle('on', state === 'recording');
        mic.disabled = state === 'sending';
        st.area.disabled = state === 'sending';
        st.busy = state === 'sending'; st.refreshSend();
        if (state === 'recording') { label(ICON_STOP_SQ, 'Listo · ' + clock(info.ms || 0)); mic.setAttribute('aria-label', 'Terminar de grabar'); status.textContent = 'Te escucho. Cuéntalo y toca «Listo».'; warn.textContent = ''; }
        else if (state === 'sending') { label(ICON_MIC, 'Escribiendo…'); status.textContent = 'Chaski está pasando tu voz a texto…'; }
        else { label(ICON_MIC, 'Hablar'); mic.setAttribute('aria-label', 'Dictar con la voz'); status.textContent = info.message || ''; }
      },
      onText: function (text, ms, capped) {
        /* Si ya había dictado y el estudiante tocó el texto antes de este nuevo dictado, cuenta como editado. */
        if (st.voiced && st.area.value !== st.voiceSnap) st.voiceChanged = true;
        var r = Core.appendDictation(st.area.value, text, 400);
        if (r.text === st.area.value) { status.textContent = 'La tablilla está llena y no cabe lo que dijiste. Borra algo y vuelve a hablar.'; return; }
        st.area.value = r.text;
        st.area.dispatchEvent(new Event('input')); /* actualiza el contador y el botón de enviar */
        st.voiced = true; st.voiceMs += ms; st.voiceSnap = st.area.value;
        status.textContent = (capped ? 'Llegaste al máximo de un minuto. ' : '') + (r.cut ? 'Se cortó para que quepa en la tablilla. Revisa el texto.' : 'Revisa el texto: puedes cambiar lo que haga falta antes de enviarlo.');
        st.area.focus(); st.area.setSelectionRange(st.area.value.length, st.area.value.length);
      }
    });
    mic.addEventListener('click', function () { rec.toggle(); });
    st.lock = function () { rec.dispose(); mic.disabled = true; };
    voiceDispose = rec.dispose;
    return h('div', { class: 'voicerow' }, mic, status);
  }
  var voiceDispose = null;

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
    document.addEventListener('keydown', function onKey(e) {
      if (!document.body.contains(pop)) { document.removeEventListener('keydown', onKey); return; }
      if (e.key === 'Escape') pop.hidden = true;
    });
    return { bar: h('div', { class: 'cordbar' }, h('span', { class: 'lbl', text: 'Lo que Chaski sabe' }), els), pop: pop, close: function () { pop.hidden = true; }, knot: function (i) { return els[i]; }, fill: function (i) { els[i].classList.add('on'); } };
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
  /** Enlace a una página informativa; se abre en otra pestaña para no perder la partida. */
  function pageLink(href, text) { return h('a', { href: href, target: '_blank', rel: 'noopener', text: text }); }
  function sWelcome() {
    var alias = h('input', { id: 'alias', class: 'inp', type: 'text', maxlength: 16, placeholder: 'Un apodo (no tu nombre)', autocomplete: 'off' });
    var cls = h('input', { id: 'cls', class: 'inp', type: 'text', maxlength: 10, placeholder: 'Código de la clase (opcional)', autocomplete: 'off' });
    cls.value = urlParam('clase').slice(0, 10).toUpperCase();
    var ok = h('input', { id: 'ok', type: 'checkbox' });
    var msg = h('p', { class: 'msgerr', role: 'alert' });
    var prev = store(KS);
    function read() {
      var a = alias.value.trim(), c = cls.value.trim().toUpperCase();
      if (a.length < 2) { msg.textContent = 'Escribe un apodo de al menos 2 letras.'; return false; }
      if (c && c.length < 3) { msg.textContent = 'El código de la clase tiene 3 letras o números como mínimo. Si no lo tienes, déjalo vacío.'; return false; }
      c = c || 'GENERAL'; /* la sala es solo una etiqueta para agrupar en el panel */
      if (!ok.checked) { msg.textContent = 'Marca la casilla para continuar.'; return false; }
      S = newState(a, c, C.topic.id);
      S.voz = urlParam('voz') !== '0'; /* el dictado sale siempre; el docente lo apaga con ?voz=0 y el estudiante decide si lo usa */
      save(); Log.push('start', { version: CFG.VERSION, model: !!CFG.EXTRACT_URL, voz: S.voz ? undefined : false });
      return true;
    }
    var resume = prev && prev.scene && prev.scene !== 'end' && prev.topic
      ? btn('Continuar donde me quedé (' + prev.alias + ')', 'ghost', function () { S = prev; S.lessons = S.lessons || []; S.voz = urlParam('voz') !== '0'; /* manda el enlace de ahora */ C.use(S.topic); render(); }) : null;
    frame({
      hero: [chaski('happy', 120, 'bob')],
      main: [
        h('div', { class: 'brandrow' }, h('span', { class: 'tag', text: 'Hoy le enseñas: ' + C.topic.title }), h('h1', { class: 'logo', text: 'Chaski' })),
        h('div', { class: 'card' },
          h('p', { class: 'small', text: 'Un mensajero que solo sabe lo que tú le enseñes. ¿Lo enseñas bien?' }),
          h('label', { for: 'alias', text: 'Tu apodo' }), alias,
          h('label', { for: 'cls', text: 'Código de la clase (opcional)' }), cls,
          h('label', { class: 'check', for: 'ok' }, ok, h('span', { text: 'Estoy con un adulto responsable y no escribiré mi nombre ni datos personales.' })),
          h('p', { class: 'small' }, 'Lo que le enseñes a Chaski lo lee un servicio de inteligencia artificial (Google Gemini). Al continuar aceptas los ', pageLink('terminos.html', 'Términos de uso'), ' y la ', pageLink('privacidad.html', 'Política de privacidad'), '.'),
          msg,
          btn('Enseñarle a Chaski', 'go', function () { if (read()) render(); }),
          resume),
        h('p', { class: 'legend', text: 'Piloto exploratorio: no es una evaluación con nota.' }),
        h('p', { class: 'footlinks' }, pageLink('acerca.html', 'Acerca de Chaski'), ' · ', pageLink('privacidad.html', 'Privacidad'), ' · ', pageLink('terminos.html', 'Términos'))]
    });
  }

  function startTeach(more) {
    S.more = more; S.pending = [];
    go('teach', 0);
  }
  function sIntro() {
    var lines = C.lines.intro.concat([ANNOUNCE ? C.lines.mission : C.lines.missionHidden]);
    frame({ hero: [chaski('confident', 124, 'bob')], main: [h('div', { class: 'card' }, bubbles(lines)), btn('¡Vamos!', 'go', function () { startTeach(false); })] });
  }

  /* ---------- escenas: enseñar ---------- */
  /** Chaski plantea la pregunta en una placa de piedra; el estudiante responde en una tablilla; la lección ata un nudo. */
  /** Después de la rendición, la lección extra dice en qué se equivocó Chaski (con el nombre de la idea, sin dar la respuesta). */
  function teachMoreFor() {
    var focus = S.phase === 'reteach' && S.focus ? S.focus : [];
    if (!focus.length) return C.teachMore;
    var names = focus.map(function (k) { return '«' + C.cards[k].short + '»'; }).join(' y ');
    var asks = focus.map(function (k) { return C.cards[k].ask; }).filter(Boolean).join('; ').toLowerCase();
    return { k: C.teachMore.k, say: 'Me equivoqué con ' + names + (asks ? ' (' + asks + ')' : '') + '. ¿Cómo me lo explicas para que lo haga bien?',
      label: C.teachMore.label, ph: 'Explícame con un ejemplo con números…', min: C.teachMore.min, minWords: C.teachMore.minWords, needNumbers: C.teachMore.needNumbers };
  }
  function sTeach(i) {
    var prompts = S.more === 'clarify' ? [C.clarify] : S.more ? [teachMoreFor()] : C.teach, p = prompts[i], t0 = Date.now(), busy = false;
    var cord = cordbar();
    var who = h('div', { class: 'who' }, chaski('listen', 118, 'bob'));
    var box = tablet({ ph: p.ph, label: 'Tu tablilla', min: p.min, onSend: function (text, pasted, st) {
      if (busy) return; busy = true; st.send.disabled = true; st.area.disabled = true; /* se bloquea mientras el texto vuela al nudo */
      var prior = Log.mine('teach').map(function (e) { return e.text; });
      var orig = Core.originality(text, { refs: C.refs, prior: prior, needNumbers: p.needNumbers, contextNumbers: C.contextNumbers, pasted: pasted, minWords: p.minWords });
      var vi = st.voiceInfo();
      Log.push('teach', { k: p.k, text: text, pasted: pasted, voz: vi.voz, editado: vi.editado, vozMs: vi.vozMs, ms: Date.now() - t0, orig: orig, phase: S.phase });
      var idx = S.lessons.length;
      S.pending.push(text); S.lessons.push({ k: p.k, text: text }); save();
      flyTo(st.area, cord.knot(idx), text, function () {
        cord.fill(idx); who.classList.remove('nod'); void who.offsetWidth; who.classList.add('nod');
        setTimeout(function () { if (i + 1 < prompts.length) { S.i = i + 1; save(); render(); } else go('brain'); }, 450);
      });
    } });
    box.area.addEventListener('input', cord.close); /* la burbuja de una lección ya enseñada no debe tapar el botón mientras se escribe */
    var lesson = S.more === 'clarify' ? 'Chaski no entendió' : S.more ? 'Una lección extra' : 'Lección ' + (i + 1) + ' de ' + prompts.length;
    frame({
      hud: hud(C.topic.title + ' · ' + S.cls),
      hero: [who, h('div', { class: 'hint', text: HINT[p.k] || '' })],
      main: [h('div', { class: 'plaque' }, h('div', { class: 'kicker', text: lesson }), h('p', { class: 'q', text: p.say })),
        box.el, box.send, h('div', { class: 'cordwrap' }, cord.pop, cord.bar)]
    });
  }

  function hangTablets() {
    return [h('div', { class: 'beam', 'aria-hidden': 'true' }), h('div', { class: 'hang', role: 'list' }, Brain.IDS.map(function (k) {
      var on = S.brain[k].state !== 'ausente';
      return h('div', { class: 'f' + (on ? ' on' : ''), role: 'listitem' }, h('div', { class: 'tab' }, h('span', { class: 'dot' }), h('b', { text: C.cards[k].short }), h('small', { text: C.cards[k].ask || '' })));
    }))];
  }
  /** El cerebro: Chaski piensa en voz alta (nube) y las ideas que cree saber cuelgan encendidas. */
  function sBrain() {
    function drawBrain(res) {
      var reteach = S.phase === 'reteach', canMore = S.extraTurns < 3;
      /* Chaski repregunta una sola vez, y solo cuando casi no entendió nada. Si el estudiante dijo algo equivocado no repregunta:
         ahí Chaski debe equivocarse para que el estudiante, o su docente, lo note. */
      var vague = !!S.lastVague && !S.clarified && !reteach;
      var buttons = [];
      if (vague) {
        buttons.push(btn('Explicárselo de nuevo', 'go', function () { S.clarified = true; S.lastVague = false; S.phase = 'aclaracion'; startTeach('clarify'); }));
        buttons.push(btn('Seguir así', 'ghost', function () { S.clarified = true; S.lastVague = false; S.plan = Brain.planRound(S.brain); go('map', 0); }));
      } else {
        if (canMore) buttons.push(btn(reteach ? 'Quiero agregar algo más' : 'Quiero explicarle algo más', 'ghost', function () { S.extraTurns += 1; startTeach(true); }));
        if (reteach) buttons.unshift(btn('Terminar', 'go', function () { go('end'); }));
        else buttons.unshift(btn('¡Listo, a resolver!', 'go', function () { S.plan = Brain.planRound(S.brain); go('map', 0); }));
      }
      var learning = Brain.IDS.some(function (k) { return S.brain[k].state !== 'ausente'; });
      frame({
        hud: hud('El cerebro de Chaski', h('span', { class: 'pill', text: learning ? 'Está aprendiendo' : 'Vacío' })),
        hero: [chaski('think', 108, 'bob')],
        main: [h('div', { class: 'thought' }, h('span', { class: 'kicker', text: 'Esto es lo que entendí' }), res.restatement),
          vague ? h('p', { class: 'ask' }, h('b', { text: 'Chaski no entendió. ' }), C.lines.clarify) : null,
          hangTablets(),
          h('p', { class: 'legend', text: 'Una tablilla encendida significa que Chaski cree saber algo. No dice si lo sabe bien.' }),
          h('div', { class: 'stack' }, buttons)]
      });
    }
    if (!S.pending.length) { drawBrain({ restatement: S.lastRestatement || Brain.restate(S.brain) }); return; }
    frame({
      hud: hud('El cerebro de Chaski', h('span', { class: 'pill', text: 'Leyendo…' })),
      hero: [chaski('think', 108, 'bob')],
      main: [h('div', { class: 'thought' }, h('span', { class: 'kicker', text: 'Un momento' }), 'Déjame pensar en lo que me enseñaste…'),
        h('div', { class: 'think', role: 'status', 'aria-label': 'Chaski está pensando' }, h('i'), h('i'), h('i'))]
    });
    var text = S.pending.join('\n');
    Brain.extract(text, { url: CFG.EXTRACT_URL, topic: S.topic }).then(function (res) {
      if (!S || S.scene !== 'brain') return;
      S.brain = Brain.merge(S.brain, res.cards); S.lastRestatement = res.restatement; S.pending = [];
      /* «Casi no entendió» = lo leyó la IA y ninguna de las tres ideas quedó enseñada. Con la lectura por reglas no se repregunta: se equivocaría de más. */
      S.lastVague = res.source === 'modelo' && !S.clarified && S.phase !== 'reteach' && Brain.vague(S.brain);
      Log.push('brain', { cards: S.brain, read: res.cards, source: res.source, why: res.why || null, restatement: res.restatement, phase: S.phase, clarify: S.lastVague });
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
      return '<g class="node' + (done ? '' : ' lock') + '"><circle cx="' + n[0] + '" cy="' + n[1] + '" r="21" fill="' + (done ? '#FFC83D' : '#E7DCC4') + '" stroke="' + (done ? '#3A2412' : '#8E8165') + '" stroke-width="4"/><text x="' + n[0] + '" y="' + (n[1] + 7) + '">' + (k + 1) + '</text></g>';
    }).join('');
    var cur = NODES[i], left = cur[0] > 195, cx = left ? cur[0] - 98 : cur[0] + 14, cy = cur[1] - 114;
    var bx = left ? cur[0] - 190 : cur[0] + 62, by = cy + 8;
    var wrap = h('div', { class: 'mapcard' });
    wrap.innerHTML = '<svg viewBox="0 0 390 560" preserveAspectRatio="xMidYMid meet" role="img" aria-label="Camino con seis tambos, vas en el ' + (i + 1) + '">' +
      '<path d="' + PATH + '" fill="none" stroke="#7A4D26" stroke-width="32" stroke-linecap="round" stroke-linejoin="round" opacity=".45"/>' +
      '<path d="' + PATH + '" fill="none" stroke="#F1DDAE" stroke-width="24" stroke-linecap="round" stroke-linejoin="round"/>' +
      '<path d="' + PATH + '" fill="none" stroke="#C9A66B" stroke-width="3" stroke-dasharray="3 12" stroke-linecap="round"/>' +
      '<g transform="translate(205 82)"><rect x="-1.5" y="-36" width="3.5" height="36" fill="#3A2412"/><path d="M2 -36 L28 -28 L2 -19Z" fill="#C2185B" stroke="#3A2412" stroke-width="2"/><text y="24" text-anchor="middle" font-family="Baloo 2, sans-serif" font-weight="800" font-size="16" fill="#3A2412" stroke="#FFF3D6" stroke-width="4" paint-order="stroke">Cusco</text></g>' +
      nodes +
      '<g class="bob"><svg class="chsvg" x="' + cx + '" y="' + cy + '" width="82" height="117" viewBox="0 0 140 200"><use href="#ch-confident"/></svg></g>' +
      '<g transform="translate(' + Math.max(8, Math.min(282, bx)) + ' ' + by + ')"><rect width="100" height="30" rx="15" fill="#fff" stroke="#3A2412" stroke-width="3"/><text x="50" y="21" text-anchor="middle" font-family="Baloo 2, sans-serif" font-weight="800" font-size="14" fill="#3A2412">¡Tambo ' + (i + 1) + '!</text></g></svg>';
    frame({ hud: hud('Tambo ' + (i + 1) + ' de 6', msgPill(i)), mode: 'solo', main: [wrap, btn('Seguir el camino', 'go', function () { go('ex', i); })] });
  }

  function sEx(i) {
    var sol = S.plan[i], t0 = Date.now(), n = S.plan.length;
    var rec = { ex: sol.id, rule: sol.cause, card: sol.card, cardState: sol.state, hasError: sol.hasError, said: sol.said };
    function finish() {
      rec.ms = Date.now() - t0; Log.push('ex', rec);
      if (i + 1 < n) go('map', i + 1); else go('probeintro');
    }
    /** Lo que va junto a Chaski: él, la choza del tambo y lo que dice. */
    function sceneHead(say, mood) {
      var c = chaski(mood, 104, 'bob'); c.id = 'chRun';
      return [h('div', { class: 'duo' }, c, hutSVG()), h('div', { class: 'bubble', text: say })];
    }
    /** Figura del problema (tabla, barra o balanza), si la tiene. Sale de datos fijos del contenido. */
    function figEl() {
      var svg = sol.fig && window.ChaskiFigures ? window.ChaskiFigures.svg(sol.fig) : '';
      if (!svg) return null;
      var d = h('div', { class: 'fig' });
      d.innerHTML = svg;
      return d;
    }
    function steps(asButtons, onPick) {
      return h('div', { class: 'quipu' }, sol.steps.map(function (s, k) {
        if (!asButtons) return h('div', { class: 'step', 'data-n': String(k + 1), text: s });
        return h('button', { type: 'button', class: 'step hot', 'data-n': String(k + 1), text: s, onclick: function () { onPick(k, this); } });
      }));
    }
    function decide() {
      var toast = h('div', { class: 'toast', role: 'status', text: 'Anotado. Chaski sigue su camino' });
      frame({
        hud: hud('Tambo ' + (i + 1) + ' de 6', msgPill(i)),
        hero: sceneHead(C.lines.confident[i % C.lines.confident.length], 'confident'),
        main: [h('div', { class: 'board', text: sol.text }), figEl(), steps(false),
          h('div', { class: 'row2' },
            iconBtn(ICON_PASS, 'Dejar pasar', 'pass', function () {
              rec.saidError = false; rec.decideMs = Date.now() - t0;
              /* Chaski echa a correr, de espaldas, hacia el horizonte: se achica y se pierde en el camino sin cruzar la tarea. */
              var c = document.getElementById('chRun'), r = Scenery.runner('away');
              r.id = 'chRun'; c.replaceWith(r); toast.classList.add('show');
              setTimeout(finish, 1150);
            }),
            iconBtn(ICON_STOP, '¡Alto, Chaski!', 'stop', function () { rec.saidError = true; rec.decideMs = Date.now() - t0; lens(); })), toast]
      });
    }
    function lens() {
      frame({
        hud: hud('Tambo ' + (i + 1) + ' de 6', h('span', { class: 'pill', text: 'Lupa' })),
        hero: sceneHead('¿Yo? ¿Equivocarme? A ver, ¿dónde?', 'oops'),
        main: [h('div', { class: 'board', text: 'Toca el nudo donde se equivocó' }), figEl(),
          steps(true, function (k, el) {
            rec.step = k; rec.stepOk = sol.errStep === k; el.classList.remove('hot'); el.classList.add('sel');
            setTimeout(fix, 400);
          }),
          btn('No sé en cuál', 'ghost', function () { rec.step = -1; rec.stepOk = false; fix(); })]
      });
    }
    function fix() {
      var submit = btn('Corregir a Chaski', 'go', function () {
        rec.correction = Core.parseNum(kp.get()); rec.correctionOk = Core.numEq(rec.correction, sol.answer); finish();
      });
      submit.disabled = true;
      var kp = keypad('Tu respuesta', function (v) { submit.disabled = Core.parseNum(v) == null; }, function () { if (!submit.disabled) submit.click(); });
      frame({
        hud: hud('Tambo ' + (i + 1) + ' de 6', h('span', { class: 'pill', text: 'Corrige a Chaski' })),
        hero: sceneHead('A ver, entonces dime tú: ¿cuál es la respuesta correcta?', 'think'),
        main: [h('div', { class: 'board', text: sol.text }), kp.el, submit]
      });
    }
    decide();
  }

  /**
   * Pausa entre los seis problemas y las preguntas: explica qué viene y por qué. Antes las preguntas aparecían sin aviso y
   * parecían ser sobre los problemas que el estudiante dejó pasar; son sobre las ideas, para ver si él las entendió.
   */
  function sProbeIntro() {
    frame({
      hud: hud('Fin del camino', h('span', { class: 'pill', text: 'Mensaje entregado' })),
      hero: [chaski('listen', 110, 'bob')],
      main: [h('div', { class: 'card' },
          h('p', { class: 'kicker', text: 'Ahora te toca a ti' }),
          h('p', { class: 'title', text: 'Chaski llegó al Cusco con su mensaje.' }),
          h('p', { text: 'Todavía no te digo cómo le fue: eso lo ves al final.' }),
          h('p', { text: 'Antes, Chaski te hace 4 preguntas para ver si tú entendiste las ideas, no solo si él acertó. Tres son con otros números y la última es para que lo expliques con tu propio ejemplo.' })),
        btn('Ver las preguntas', 'go', function () { go('probe', 0); })]
    });
  }

  function sProbe(i) {
    var p = C.probes[i], t0 = Date.now(), say = C.lines.probeSay[i];
    var head = hud('Preguntas de Chaski', h('span', { class: 'pill', text: (i + 1) + ' de ' + C.probes.length }));
    var hero = [chaski('think', 100, 'bob'), h('div', { class: 'bubble' }, h('p', { text: say }))];
    if (p.kind === 'num') {
      var submit = btn('Responder', 'go', function () {
        var v = Core.parseNum(kp.get());
        Log.push('probe', { k: p.k, kind: 'num', rule: p.rule, value: v, ok: Core.numEq(v, p.answer), ms: Date.now() - t0 });
        go('probe', i + 1);
      });
      submit.disabled = true;
      var kp = keypad('Tu respuesta', function (v) { submit.disabled = Core.parseNum(v) == null; }, function () { if (!submit.disabled) submit.click(); });
      frame({ hud: head, hero: hero, main: [h('div', { class: 'board', text: p.q }), kp.el, submit] });
    } else {
      var box = tablet({ ph: 'Cuéntalo a tu manera…', label: 'Tu ejemplo', min: 12, button: 'Enviar', onSend: function (text, pasted, st) {
        var prior = Log.mine('teach').map(function (e) { return e.text; });
        var orig = Core.originality(text, { refs: C.refs, prior: prior, needNumbers: true, contextNumbers: C.contextNumbers, pasted: pasted, minWords: 5 });
        var vi = st.voiceInfo();
        Log.push('probe', { k: p.k, kind: 'free', text: text, pasted: pasted, voz: vi.voz, editado: vi.editado, vozMs: vi.vozMs, ms: Date.now() - t0, orig: orig });
        go('reveal');
      } });
      frame({ hud: head, hero: hero, main: [h('div', { class: 'board', text: p.q }), box.el, box.send] });
    }
  }

  /* ---------- escena: rendición de cuentas ---------- */
  function outcome(e) { return e.hasError ? (e.saidError ? 'hit' : 'miss') : (e.saidError ? 'fa' : 'okc'); }
  var LABEL = { hit: 'Atrapado', miss: 'Se pasó', fa: 'Falsa alarma', okc: 'Chaski acertó' };
  /** Lo que se muestra de cada problema en la rendición: la pregunta si trae sus datos; si no (p. ej. «¿Cuánto vale x?»), el enunciado completo. */
  function question(text) { var parts = text.split(/(?<=[.?])\s+/), last = parts[parts.length - 1]; return /\d/.test(last) ? last : text; }
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
    var focus = Object.keys(causes).filter(function (k) { return k !== 'S' && C.cards[k]; });
    var label = focus.length ? 'Enseñarle: ' + focus.map(function (k) { return C.cards[k].short; }).join(' y ') : 'Enseñarle lo que le faltó';
    if (!S.reteached) buttons.push(btn(label, 'go', function () { S.reteached = true; S.phase = 'reteach'; S.focus = focus; startTeach(true); }));
    buttons.push(btn('Terminar', S.reteached ? 'go' : 'ghost', function () { go('end'); }));
    frame({
      hud: hud('Rendición de cuentas', h('span', { class: 'pill', text: exs.length + ' de ' + exs.length })),
      mode: 'tall',
      hero: [chaski(misses > 0 ? 'oops' : 'happy', 90, 'bob'), h('div', { class: 'bubble' }, bubbles(say))],
      main: [sellos, parch, why.length ? h('p', { class: 'legend', text: 'Por qué pasó' }) : null, why, h('div', { class: 'stack' }, buttons)]
    });
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
    frame({
      hero: [chaski('happy', 96, 'bob'), h('div', { class: 'bubble' }, bubbles(['¡Gracias por enseñarme!', 'Aprendí bien ' + Brain.good(S.brain) + ' de 3 ideas contigo.']))],
      main: [h('div', { class: 'card' }, h('p', { class: 'kicker', text: 'Tu resumen · ' + C.topic.title }),
          h('div', { class: 'stats' }, [stat('Errores que atrapaste', m.hits + ' / ' + m.nErr), stat('Ideas bien enseñadas', Brain.good(S.brain) + ' / 3')]), ideas),
        h('div', { class: 'stack' },
          btn('Guardar mis resultados (archivo)', 'ghost', function () {
            var a = h('a', { href: URL.createObjectURL(new Blob([JSON.stringify({ events: Log.mine() }, null, 2)], { type: 'application/json' })), download: 'chaski-' + S.alias + '.json' });
            document.body.appendChild(a); a.click(); a.remove();
          }),
          btn('Salir', 'ghost', function () { S = null; store(KS, null); render(); }))]
    });
  }

  /* ---------- arranque ---------- */
  function render() {
    keyHandler = null; /* cada escena que use el teclado de piedra lo registra de nuevo */
    if (voiceDispose) { voiceDispose(); voiceDispose = null; } /* suelta el micrófono al cambiar de escena */
    if (!S || !S.scene) return sWelcome();
    var map = { intro: sIntro, teach: sTeach, brain: sBrain, map: sMap, ex: sEx, probeintro: sProbeIntro, probe: sProbe, reveal: sReveal, end: sEnd };
    (map[S.scene] || sWelcome)(S.i);
  }
  document.addEventListener('visibilitychange', function () { if (document.visibilityState === 'hidden') Log.soon(true); }); /* al cambiar de pestaña o cerrar, se envía lo pendiente */
  Scenery.setup();
  Log.load();
  C.use(urlParam('tema')); /* el docente elige el tema con el enlace; sin tema, proporciones */
  S = null; /* se parte de la pantalla de inicio; «Continuar» retoma el estado guardado */
  render();
  window.__chaski = { get state() { return S; }, log: Log, go: go }; /* para pruebas */
})();
