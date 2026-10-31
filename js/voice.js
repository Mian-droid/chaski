/**
 * Chaski: dictado por voz.
 *
 * El estudiante toca el micrófono, habla y vuelve a tocar. El audio va a /transcribe (Whisper) y el texto
 * cae en la tablilla para que lo revise y lo edite antes de enviar. El audio no se guarda en ningún lado.
 * Si algo falla, la tablilla queda como estaba: la voz solo se suma, nunca bloquea.
 *
 * Expone window.ChaskiVoice. No toca el DOM: la interfaz (botón, estados) vive en app.js.
 */
(function () {
  'use strict';

  var MAX_MS = 60000;      /* tope por grabación */
  var MIN_MS = 700;        /* menos que esto es un toque al botón */
  var MIN_BYTES = 1500;
  var SEND_TIMEOUT = 25000;
  /* El navegador elige el formato: Chrome y Android graban WebM/Opus; Safari, MP4. */
  var MIMES = ['audio/webm;codecs=opus', 'audio/webm', 'audio/mp4', 'audio/ogg;codecs=opus'];

  var MSG = {
    denied: 'No me dejaron usar el micrófono. Puedes escribir tu respuesta, o permitir el micrófono en el navegador.',
    nomic: 'No encuentro un micrófono. Puedes escribir tu respuesta.',
    short: 'Casi no se oyó nada. Toca el micrófono y habla un poco más.',
    empty: 'No te escuché bien. Inténtalo de nuevo o escribe tu respuesta.',
    busy: 'La voz está ocupada ahora. Escribe tu respuesta.',
    fail: 'No pude pasar tu voz a texto. Inténtalo de nuevo o escribe tu respuesta.'
  };

  function supported() {
    return !!(window.MediaRecorder && navigator.mediaDevices && navigator.mediaDevices.getUserMedia && window.fetch);
  }
  function pickMime() {
    for (var i = 0; i < MIMES.length; i++) {
      try { if (MediaRecorder.isTypeSupported(MIMES[i])) return MIMES[i]; } catch (e) { /* sigue con el siguiente */ }
    }
    return '';
  }
  /** Mensaje para el estudiante según cómo falló el micrófono. */
  function micError(e) {
    var n = e && e.name;
    if (n === 'NotAllowedError' || n === 'SecurityError') return MSG.denied;
    if (n === 'NotFoundError' || n === 'OverconstrainedError') return MSG.nomic;
    return MSG.fail;
  }

  /**
   * Crea un grabador para una tablilla.
   * @param {{url: string, onState: function(string, object=), onText: function(string, number)}} o
   *   onState: 'idle' | 'recording' (info.ms) | 'sending' | 'error' (info.message) | 'empty' (info.message).
   *   onText(texto, ms): llegó el texto transcrito y ms es lo que duró la grabación.
   */
  function create(o) {
    var rec = null, stream = null, chunks = [], t0 = 0, tick = null, stopTimer = null, state = 'idle', gone = false;
    var starting = false, capped = false, ctl = null; /* starting: esperando el permiso del micrófono; capped: llegó al tope de tiempo */

    function set(s, info) { state = s; o.onState(s, info || {}); }
    function release() {
      clearInterval(tick); clearTimeout(stopTimer); tick = stopTimer = null;
      if (stream) { stream.getTracks().forEach(function (t) { t.stop(); }); stream = null; }
    }

    function send(blob, ms, wasCapped) {
      set('sending');
      var abort = ctl = new AbortController(), timer = setTimeout(function () { abort.abort(); }, SEND_TIMEOUT);
      fetch(o.url, { method: 'POST', headers: { 'Content-Type': blob.type || 'audio/webm' }, body: blob, signal: abort.signal })
        .then(function (r) {
          if (r.status === 429 || r.status === 501 || r.status === 503) throw new Error('busy');
          if (!r.ok) throw new Error('fail');
          return r.json();
        })
        .then(function (d) {
          if (gone) return;
          var text = d && typeof d.text === 'string' ? d.text.trim() : '';
          if (!text) { set('empty', { message: MSG.empty }); return; }
          set('idle'); o.onText(text, ms, wasCapped);
        })
        .catch(function (e) { if (!gone) set('error', { message: e && e.message === 'busy' ? MSG.busy : MSG.fail }); })
        .then(function () { clearTimeout(timer); });
    }

    function finish() {
      var ms = Date.now() - t0, wasCapped = capped;
      capped = false;
      var blob = new Blob(chunks, { type: (rec && rec.mimeType) || 'audio/webm' });
      release(); rec = null; chunks = [];
      if (gone) return;
      if (ms < MIN_MS || blob.size < MIN_BYTES) { set('empty', { message: MSG.short }); return; }
      send(blob, ms, wasCapped);
    }

    function start() {
      if (state === 'recording' || state === 'sending' || starting) return; /* un segundo toque no abre otro micrófono */
      starting = true;
      /* Cancelar el ruido y subir la voz ayuda en un aula con ruido. */
      navigator.mediaDevices.getUserMedia({ audio: { echoCancellation: true, noiseSuppression: true, autoGainControl: true } }).then(function (s) {
        starting = false;
        if (gone) { s.getTracks().forEach(function (t) { t.stop(); }); return; }
        stream = s; chunks = [];
        var mime = pickMime();
        try { rec = mime ? new MediaRecorder(s, { mimeType: mime }) : new MediaRecorder(s); }
        catch (e) { release(); set('error', { message: MSG.fail }); return; }
        rec.ondataavailable = function (e) { if (e.data && e.data.size) chunks.push(e.data); };
        rec.onstop = finish;
        rec.onerror = function () { release(); rec = null; set('error', { message: MSG.fail }); };
        t0 = Date.now(); rec.start();
        tick = setInterval(function () { o.onState('recording', { ms: Date.now() - t0 }); }, 250);
        stopTimer = setTimeout(function () { capped = true; stop(); }, MAX_MS);
        set('recording', { ms: 0 });
      }).catch(function (e) { starting = false; if (!gone) set('error', { message: micError(e) }); });
    }

    function stop() { if (rec && rec.state === 'recording') rec.stop(); }
    function toggle() { if (state === 'recording') stop(); else start(); }
    /** Se llama al cambiar de escena: suelta el micrófono y descarta lo grabado. */
    function dispose() { gone = true; document.removeEventListener('visibilitychange', onHidden); if (ctl) ctl.abort(); if (rec && rec.state === 'recording') { rec.onstop = null; try { rec.stop(); } catch (e) { /* ya parado */ } } release(); }

    /* Si la página pasa a segundo plano, se deja de grabar: el micrófono no queda abierto. */
    function onHidden() { if (document.hidden) stop(); }
    document.addEventListener('visibilitychange', onHidden);

    return { toggle: toggle, dispose: dispose, state: function () { return state; }, maxMs: MAX_MS };
  }

  window.ChaskiVoice = { supported: supported, create: create, MAX_MS: MAX_MS, messages: MSG };
})();
