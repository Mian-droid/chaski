/**
 * Escenografía de Chaski: el paisaje (amanecer, día, atardecer), el personaje y la choza.
 *
 * Solo dibujo vectorial: no hay lógica de juego. Todo se genera como texto SVG a partir de
 * valores fijos del código (nunca de texto del usuario), por eso es seguro asignarlo a innerHTML.
 *
 * El paisaje es un panorama de 1200 x 800. El centro de 390 de ancho es la composición del celular;
 * los lados agregan montañas, andenes, llamas y árboles que solo se ven en pantallas anchas. Con
 * `preserveAspectRatio="slice"` y anclado abajo, cada pantalla ve lo que le cabe, sin franjas vacías.
 *
 * Uso:
 *   ChaskiScenery.setup();            // una vez: crea el fondo y los símbolos del personaje
 *   ChaskiScenery.paint('dia');       // cambia el momento del día ('amanecer' | 'dia' | 'atardecer')
 *   ChaskiScenery.chaski('happy', 120, 'bob');   // elemento SVG de Chaski
 *   ChaskiScenery.symbols();          // solo los símbolos (para páginas sin fondo, como el panel docente)
 */
(function (root) {
  'use strict';

  var INK = '#3A2412', W = 1200, H = 800, OX = 405;

  /** Colores de cada momento del día. El cielo va de azul a coral y oro; las montañas toman el color del cielo. */
  var PAL = {
    amanecer: { sky: ['#1B4A86', '#5C8FC0', '#F4A27A', '#FFD79A'], sun: { x: 120, y: 410, r: 30, c: '#FFE6A8', glow: '#FF9E6B' }, far: '#7C90BC', farShade: '#5B6F9E', mid: '#5F8497', midShade: '#466A7C', haze: '#FFC9A0', gr: ['#9DB863', '#86A859', '#6D9348'], wall: '#DCC9A3', earth: ['#D69A63', '#A8582A'], cloud: '#FFD9BF', cloud2: '#FF9F8A', tint: '#FFA06B', tintA: 0.14, snow: '#FFEBDD', river: '#F7C99B', rays: true },
    dia: { sky: ['#2FA4DE', '#7FD0EC', '#C8EEF0', '#FFF1C8'], sun: { x: 318, y: 250, r: 32, c: '#FFC83D', glow: '#FFFFFF' }, far: '#8CA8D6', farShade: '#6D88BC', mid: '#68A0B8', midShade: '#4C809B', haze: '#EAF8F6', gr: ['#9BCB66', '#82B957', '#6BA64A'], wall: '#CBBF9E', earth: ['#D79B5A', '#B5602A'], cloud: '#FFFFFF', cloud2: '#E3F4FA', tint: '#FFF3C0', tintA: 0.08, snow: '#FFFFFF', river: '#7FD3F0', rays: true },
    atardecer: { sky: ['#27467E', '#D4686A', '#FF9A56', '#FFD27A'], sun: { x: 292, y: 414, r: 36, c: '#FFE69A', glow: '#FF8A5B' }, far: '#8F6B80', farShade: '#6F4F66', mid: '#8B5B5E', midShade: '#6B4247', haze: '#FFB27D', gr: ['#9AA84C', '#849742', '#6B7E37'], wall: '#D8BC8E', earth: ['#C8743C', '#8E4720'], cloud: '#FFB68A', cloud2: '#FF8A7A', tint: '#FF7A4D', tintA: 0.18, snow: '#FFD9C2', river: '#FFB27D', rays: false }
  };

  /* ---------- fondo ---------- */

  /** Número pseudoaleatorio fijo para un índice: el paisaje es siempre el mismo. */
  function fixed(i) { return Math.abs((Math.sin(i * 12.9898) * 43758.5453) % 1); }

  /** Cumbres y valles de una cordillera a lo ancho del panorama, siempre iguales para una misma semilla. */
  function peaks(seed, step, lo, hi, vlo, vhi) {
    var pts = [], n = Math.ceil(W / step) + 1;
    for (var i = 0; i <= n; i++) {
      var x = Math.min(W, Math.round(i * step + (fixed(i + seed) - 0.5) * step * 0.4));
      var y = i % 2 ? Math.round(lo + fixed(i * 3 + seed) * (hi - lo)) : Math.round(vlo + fixed(i * 5 + seed) * (vhi - vlo));
      pts.push([i === 0 ? 0 : x, y]);
    }
    pts[pts.length - 1][0] = W;
    return pts;
  }
  /** Cordillera: polígono con las caras en sombra y nieve en los picos más altos. */
  function ridge(pts, base, fill, shade, snow, snowBelow) {
    var d = 'M0 ' + base + ' L' + pts.map(function (p) { return p[0] + ' ' + p[1]; }).join(' L') + ' L' + W + ' ' + base + 'Z';
    var out = '<path d="' + d + '" fill="' + fill + '"/>';
    for (var i = 1; i < pts.length - 1; i++) {
      var a = pts[i - 1], p = pts[i], b = pts[i + 1];
      if (p[1] < a[1] && p[1] < b[1]) {
        out += '<path d="M' + p[0] + ' ' + p[1] + ' L' + b[0] + ' ' + b[1] + ' L' + (p[0] + (b[0] - p[0]) * 0.3) + ' ' + (b[1] + 6) + 'Z" fill="' + shade + '" opacity=".55"/>';
        if (snow && p[1] < snowBelow) out += '<path d="M' + p[0] + ' ' + p[1] + ' L' + (p[0] - 15) + ' ' + (p[1] + 27) + ' L' + (p[0] - 7) + ' ' + (p[1] + 21) + ' L' + (p[0] - 2) + ' ' + (p[1] + 32) + ' L' + (p[0] + 6) + ' ' + (p[1] + 20) + ' L' + (p[0] + 15) + ' ' + (p[1] + 29) + 'Z" fill="' + snow + '"/>';
      }
    }
    return out;
  }
  function llama(x, y, s, blanket, flip) {
    var st = 'stroke="' + INK + '" stroke-width="2.4" stroke-linejoin="round"';
    var t = flip ? 'translate(' + (x + 50 * s) + ' ' + y + ') scale(' + (-s) + ' ' + s + ')' : 'translate(' + x + ' ' + y + ') scale(' + s + ')';
    return '<g transform="' + t + '"><ellipse cx="20" cy="26" rx="22" ry="13" fill="#F4E8D2" ' + st + '/><rect x="34" y="-2" width="10" height="28" rx="5" fill="#F4E8D2" ' + st + '/><ellipse cx="44" cy="-3" rx="10" ry="7.5" fill="#F4E8D2" ' + st + '/><path d="M40 -9 l-2 -9 l6 7z M47 -9 l2 -9 l4 8z" fill="#F4E8D2" ' + st + '/><circle cx="47" cy="-4" r="1.6" fill="' + INK + '"/><rect x="6" y="34" width="5" height="17" rx="2.5" fill="#EADBBE" ' + st + '/><rect x="14" y="36" width="5" height="15" rx="2.5" fill="#EADBBE" ' + st + '/><rect x="26" y="36" width="5" height="15" rx="2.5" fill="#EADBBE" ' + st + '/><rect x="33" y="34" width="5" height="17" rx="2.5" fill="#EADBBE" ' + st + '/><rect x="8" y="14" width="26" height="11" rx="3" fill="' + blanket + '" ' + st + '/><path d="M8 19.5 H34" stroke="#FFC83D" stroke-width="3"/></g>';
  }
  function tree(x, y, s, leaf) {
    var st = 'stroke="' + INK + '" stroke-width="2.4" stroke-linejoin="round" stroke-linecap="round"';
    return '<g transform="translate(' + x + ' ' + y + ') scale(' + s + ')"><path d="M0 0 C-2 -20 6 -30 2 -52" fill="none" stroke="#7A3F1C" stroke-width="10" stroke-linecap="round"/><path d="M2 -34 C14 -40 20 -48 22 -58" fill="none" stroke="#7A3F1C" stroke-width="6" stroke-linecap="round"/><circle cx="0" cy="-66" r="22" fill="' + leaf + '" ' + st + '/><circle cx="24" cy="-62" r="15" fill="' + leaf + '" ' + st + '/><circle cx="-20" cy="-58" r="14" fill="' + leaf + '" ' + st + '/><circle cx="-4" cy="-72" r="9" fill="#FFFFFF" opacity=".16"/></g>';
  }
  function citadel(p, x, y, sc) {
    var wall = p.wall, roof = '#D9A441';
    function house(hx, hy, w, h) {
      return '<rect x="' + hx + '" y="' + hy + '" width="' + w + '" height="' + h + '" fill="' + wall + '" stroke="' + INK + '" stroke-width="1.6"/><path d="M' + (hx - 4) + ' ' + hy + ' L' + (hx + w / 2) + ' ' + (hy - h * 0.8) + ' L' + (hx + w + 4) + ' ' + hy + 'Z" fill="' + roof + '" stroke="' + INK + '" stroke-width="1.6"/><path d="M' + (hx + w / 2 - 4) + ' ' + (hy + h) + ' L' + (hx + w / 2 - 2.4) + ' ' + (hy + h * 0.35) + ' L' + (hx + w / 2 + 2.4) + ' ' + (hy + h * 0.35) + ' L' + (hx + w / 2 + 4) + ' ' + (hy + h) + 'Z" fill="' + INK + '"/>';
    }
    return '<g transform="translate(' + x + ' ' + y + ') scale(' + sc + ')"><path d="M-6 96 Q60 40 150 48 T190 90 V110 H-6Z" fill="' + p.gr[0] + '"/>' +
      '<path d="M4 88 Q70 58 150 62" fill="none" stroke="' + wall + '" stroke-width="5"/><path d="M10 100 Q80 72 176 82" fill="none" stroke="' + wall + '" stroke-width="5"/><path d="M0 112 Q90 88 190 100" fill="none" stroke="' + wall + '" stroke-width="5"/>' +
      house(34, 48, 26, 16) + house(74, 40, 34, 22) + house(122, 46, 24, 15) + house(98, 70, 22, 13) + '</g>';
  }
  /** Andén: franja ondulada que cruza todo el panorama. */
  function band(y0, amp) {
    var d = 'M0 ' + y0 + ' Q100 ' + (y0 - amp) + ' 200 ' + (y0 - amp * 0.4);
    for (var i = 1; i < 6; i++) d += ' T' + (200 + i * 200) + ' ' + (y0 + (i % 2 ? -amp * 0.8 : amp * 0.2));
    return d;
  }

  /**
   * Dibuja el paisaje completo.
   * @param {'amanecer'|'dia'|'atardecer'} t Momento del día.
   * @param {{viewBox?: string, par?: string}} [opts] `viewBox` recorta una franja (por ejemplo, para un encabezado);
   *   sin opciones el paisaje llena la pantalla.
   * @returns {string} Texto SVG.
   */
  function world(t, opts) {
    opts = opts || {};
    var p = PAL[t] || PAL.dia, s;
    s = '<svg viewBox="' + (opts.viewBox || '0 0 ' + W + ' ' + H) + '" preserveAspectRatio="' + (opts.par || 'xMidYMax slice') + '" xmlns="http://www.w3.org/2000/svg">';
    s += '<defs><linearGradient id="w-sky" x1="0" y1="0" x2="0" y2="1"><stop offset="0" stop-color="' + p.sky[0] + '"/><stop offset=".3" stop-color="' + p.sky[1] + '"/><stop offset=".52" stop-color="' + p.sky[2] + '"/><stop offset=".62" stop-color="' + p.sky[3] + '"/></linearGradient>' +
      '<radialGradient id="w-glow"><stop offset="0" stop-color="' + p.sun.glow + '" stop-opacity=".9"/><stop offset="1" stop-color="' + p.sun.glow + '" stop-opacity="0"/></radialGradient>' +
      '<linearGradient id="w-haze" x1="0" y1="0" x2="0" y2="1"><stop offset="0" stop-color="' + p.haze + '" stop-opacity="0"/><stop offset="1" stop-color="' + p.haze + '" stop-opacity=".85"/></linearGradient>' +
      '<linearGradient id="w-earth" x1="0" y1="0" x2="0" y2="1"><stop offset="0" stop-color="' + p.earth[0] + '"/><stop offset="1" stop-color="' + p.earth[1] + '"/></linearGradient>' +
      '<linearGradient id="w-vig" x1="0" y1="0" x2="0" y2="1"><stop offset="0" stop-color="#2A1A0C" stop-opacity="0"/><stop offset="1" stop-color="#2A1A0C" stop-opacity=".34"/></linearGradient>' +
      '<radialGradient id="w-edge" cx=".5" cy=".6" r=".75"><stop offset=".6" stop-color="#2A1A0C" stop-opacity="0"/><stop offset="1" stop-color="#2A1A0C" stop-opacity=".28"/></radialGradient></defs>';
    s += '<rect width="' + W + '" height="' + H + '" fill="url(#w-sky)"/>';
    var sx = OX + p.sun.x;
    s += '<circle cx="' + sx + '" cy="' + p.sun.y + '" r="220" fill="url(#w-glow)" opacity=".75"/>';
    if (p.rays) { s += '<g opacity=".11" fill="#FFFFFF">'; for (var r = 0; r < 8; r++) s += '<path d="M' + sx + ' ' + p.sun.y + ' L' + (sx - 700 + r * 200) + ' 700 L' + (sx - 600 + r * 200) + ' 700Z"/>'; s += '</g>'; }
    s += '<circle cx="' + sx + '" cy="' + p.sun.y + '" r="' + p.sun.r + '" fill="' + p.sun.c + '"/>';
    s += '<g class="w-cl1" fill="' + p.cloud + '" opacity=".95"><ellipse cx="' + (OX + 64) + '" cy="150" rx="40" ry="13"/><ellipse cx="' + (OX + 92) + '" cy="140" rx="28" ry="13"/><ellipse cx="' + (OX + 40) + '" cy="158" rx="26" ry="9"/></g>';
    s += '<g class="w-cl2" fill="' + p.cloud2 + '" opacity=".9"><ellipse cx="' + (OX + 236) + '" cy="300" rx="40" ry="11"/><ellipse cx="' + (OX + 262) + '" cy="291" rx="24" ry="10"/><ellipse cx="' + (OX + 206) + '" cy="305" rx="22" ry="8"/></g>';
    s += '<g class="w-cl3" fill="' + p.cloud + '" opacity=".72"><ellipse cx="' + (OX + 340) + '" cy="360" rx="30" ry="8"/><ellipse cx="' + (OX + 360) + '" cy="354" rx="18" ry="7"/></g>';
    s += '<g class="w-cl2" fill="' + p.cloud + '" opacity=".9"><ellipse cx="170" cy="220" rx="56" ry="15"/><ellipse cx="206" cy="208" rx="34" ry="14"/><ellipse cx="132" cy="228" rx="32" ry="10"/></g>';
    s += '<g class="w-cl1" fill="' + p.cloud2 + '" opacity=".85"><ellipse cx="1010" cy="190" rx="52" ry="14"/><ellipse cx="1040" cy="180" rx="30" ry="13"/><ellipse cx="978" cy="198" rx="28" ry="9"/></g>';
    s += '<g class="w-cl3" fill="' + p.cloud + '" opacity=".7"><ellipse cx="1120" cy="300" rx="44" ry="11"/><ellipse cx="1146" cy="292" rx="24" ry="9"/></g>';
    s += '<g class="w-cl3" fill="' + p.cloud2 + '" opacity=".6"><ellipse cx="60" cy="330" rx="40" ry="9"/><ellipse cx="84" cy="324" rx="22" ry="8"/></g>';
    s += '<g class="w-condor" fill="' + INK + '"><path d="M-44 0 Q-22 -16 0 -3 Q22 -16 44 0 Q22 -7 0 7 Q-22 -7 -44 0Z"/><path d="M-44 0 l-6 3 M-38 -3 l-6 1 M44 0 l6 3 M38 -3 l6 1" stroke="' + INK + '" stroke-width="2" stroke-linecap="round"/></g>';
    s += ridge(peaks(2, 74, 300, 392, 404, 448), 500, p.far, p.farShade, p.snow, 352);
    s += '<rect x="0" y="360" width="' + W + '" height="140" fill="url(#w-haze)" opacity=".75"/>';
    s += ridge(peaks(11, 96, 392, 428, 440, 470), 540, p.mid, p.midShade, null, 0);
    s += '<rect x="0" y="400" width="' + W + '" height="140" fill="url(#w-haze)" opacity=".6"/>';
    s += '<g class="det">' + citadel(p, 150, 428, 0.7) + citadel(p, OX + 206, 424, 0.95) + citadel(p, 960, 430, 0.8) + '</g>';
    var rv = 'M' + (OX + 236) + ' 520 Q' + (OX + 196) + ' 534 ' + (OX + 222) + ' 556 T' + (OX + 168) + ' 598 T' + (OX + 214) + ' 646 T' + (OX + 120) + ' 706';
    s += '<path d="' + rv + '" fill="none" stroke="' + p.river + '" stroke-width="11" stroke-linecap="round"/><path d="' + rv + '" fill="none" stroke="#FFFFFF" stroke-width="2.5" stroke-linecap="round" stroke-dasharray="4 12" opacity=".7"/>';
    [[524, 22, 590, 540], [590, 26, 660, 606], [656, 22, 730, 674]].forEach(function (b, i) {
      var top = band(b[0], b[1]);
      s += '<path d="' + top + ' V' + b[2] + ' H0Z" fill="' + p.gr[i] + '"/>';
      for (var row = 0; row < 22; row++) s += '<path d="M' + (8 + row * 56) + ' ' + b[3] + ' l34 -2" stroke="' + INK + '" stroke-opacity=".12" stroke-width="3" stroke-linecap="round"/>';
      s += '<path d="' + top + '" fill="none" stroke="' + p.wall + '" stroke-width="6"/><path d="' + top + '" fill="none" stroke="' + INK + '" stroke-opacity=".25" stroke-width="2" stroke-dasharray="7 6"/>';
    });
    s += '<g class="det">';
    for (var f = 0; f < 70; f++) s += '<circle cx="' + (14 + fixed(f + 3) * (W - 28)).toFixed(0) + '" cy="' + (540 + fixed(f + 9) * 170).toFixed(0) + '" r="2.4" fill="' + (f % 3 === 0 ? '#C2185B' : f % 3 === 1 ? '#FFC83D' : '#FFFFFF') + '" opacity=".9"/>';
    s += llama(OX + 40, 534, 0.62, '#C2185B') + llama(OX + 70, 540, 0.5, '#1593A8', true) + llama(OX + 318, 604, 0.7, '#E39A2D');
    s += llama(120, 556, 0.6, '#E39A2D') + llama(188, 566, 0.5, '#C2185B', true) + llama(930, 548, 0.62, '#1593A8') + llama(1000, 556, 0.5, '#C2185B', true) + llama(1080, 626, 0.78, '#E39A2D') + llama(70, 640, 0.8, '#1593A8', true);
    s += tree(OX + 352, 556, 0.5, p.gr[2]) + tree(OX + 34, 690, 0.8, p.gr[2]) + tree(90, 600, 0.7, p.gr[2]) + tree(270, 690, 0.75, p.gr[1]) + tree(870, 580, 0.55, p.gr[2]) + tree(1130, 690, 0.9, p.gr[2]) + tree(1010, 700, 0.6, p.gr[1]);
    s += '</g>';
    s += '<rect y="722" width="' + W + '" height="90" fill="url(#w-earth)"/>';
    for (var g = 0; g < 56; g++) s += '<ellipse cx="' + (14 + g * 22 + fixed(g) * 10).toFixed(0) + '" cy="' + (752 + fixed(g + 5) * 38).toFixed(0) + '" rx="' + (5 + fixed(g + 2) * 6).toFixed(0) + '" ry="3.4" fill="' + INK + '" opacity=".18"/>';
    s += '<g class="w-sway" fill="' + p.gr[2] + '" stroke="' + INK + '" stroke-width="1.6" stroke-linejoin="round">';
    for (var k = 0; k < 42; k++) s += '<path d="M' + (8 + k * 29) + ' 724 q-2 -14 -7 -22 q8 6 9 14 q2 -12 8 -18 q-3 12 -3 26Z"/>';
    s += '</g><rect width="' + W + '" height="' + H + '" fill="' + p.tint + '" opacity="' + p.tintA + '"/><rect y="520" width="' + W + '" height="280" fill="url(#w-vig)"/><rect width="' + W + '" height="' + H + '" fill="url(#w-edge)"/></svg>';
    return s;
  }

  /* ---------- personaje ---------- */

  function eyes(mood) {
    var base = function (cx, cy, r) { return '<circle cx="' + cx + '" cy="' + cy + '" r="' + r + '" fill="#FFC83D"/><circle cx="' + (cx - 2) + '" cy="' + (cy - 2.4) + '" r="' + (r * 0.32) + '" fill="#fff"/>'; };
    if (mood === 'happy') return '<path d="M50 84q8-12 16 0M74 84q8-12 16 0" stroke="#FFC83D" stroke-width="5" fill="none" stroke-linecap="round"/>';
    if (mood === 'oops') return base(58, 82, 9) + base(82, 82, 9) + '<circle cx="58" cy="82" r="3.2" fill="' + INK + '"/><circle cx="82" cy="82" r="3.2" fill="' + INK + '"/>';
    if (mood === 'think') return base(58, 82, 7) + '<circle cx="82" cy="79" r="4.5" fill="#FFC83D"/>';
    if (mood === 'listen') return base(58, 78, 7.5) + base(82, 78, 7.5);
    return base(58, 82, 7) + base(82, 82, 7);
  }
  function mouth(mood) {
    var s = 'stroke="#FFC83D" stroke-width="5" fill="none" stroke-linecap="round"';
    if (mood === 'happy') return '<path d="M56 96q14 14 28 0" ' + s + '/>';
    if (mood === 'oops') return '<circle cx="70" cy="99" r="5" fill="#FFC83D"/>';
    if (mood === 'think') return '<path d="M60 99h20" ' + s + '/>';
    if (mood === 'listen') return '<path d="M62 98q8 6 16 0" ' + s + '/>';
    return '<path d="M58 97q12 10 24 0" ' + s + '/>';
  }
  /**
   * El dibujo de Chaski. Con `run` se le ve de espaldas, con sus piernas y brazos en grupos propios para animar la carrera:
   * sin cara, con el pelo y la trenza, y sin la correa ni la bolsa del frente.
   */
  function figure(mood, run) {
    var st = 'stroke="' + INK + '" stroke-width="3" stroke-linejoin="round"', st2 = 'stroke="' + INK + '" stroke-width="2" stroke-linejoin="round"';
    var legL = '<rect x="51" y="158" width="14" height="32" rx="6" fill="#F3E3C3" ' + st + '/><ellipse cx="55" cy="191" rx="14" ry="6.5" fill="#8A3A1E" ' + st + '/>';
    var legR = '<rect x="75" y="158" width="14" height="32" rx="6" fill="#F3E3C3" ' + st + '/><ellipse cx="85" cy="191" rx="14" ry="6.5" fill="#8A3A1E" ' + st + '/>';
    var armL = '<rect x="18" y="124" width="16" height="36" rx="8" fill="#C2185B" ' + st + '/><circle cx="26" cy="163" r="8" fill="#F3E3C3" ' + st + '/>';
    var armR = '<rect x="106" y="124" width="16" height="36" rx="8" fill="#C2185B" ' + st + '/><circle cx="114" cy="163" r="8" fill="#F3E3C3" ' + st + '/>' +
      '<path d="M114 168v22" stroke="#C9A66B" stroke-width="3"/><circle cx="114" cy="176" r="3.2" fill="#FFC83D" stroke="' + INK + '" stroke-width="1.5"/><circle cx="114" cy="186" r="3.2" fill="#1593A8" stroke="' + INK + '" stroke-width="1.5"/>';
    var face = run
      ? '<rect x="32" y="56" width="76" height="62" rx="26" fill="' + INK + '"/><path d="M70 112q-7 22 0 38" stroke="' + INK + '" stroke-width="9" stroke-linecap="round" fill="none"/><circle cx="70" cy="152" r="5" fill="#C2185B" ' + st2 + '/>'
      : '<rect x="40" y="62" width="60" height="46" rx="16" fill="' + INK + '"/><circle cx="48" cy="98" r="5" fill="#FF7AA8" opacity=".7"/><circle cx="92" cy="98" r="5" fill="#FF7AA8" opacity=".7"/>' + eyes(mood) + mouth(mood);
    var front = run ? '' : '<path d="M40 120 L100 160" stroke="#E39A2D" stroke-width="5"/><rect x="88" y="150" width="24" height="22" rx="6" fill="#E39A2D" ' + st + '/><path d="M88 160h24" stroke="#C2185B" stroke-width="3"/>';
    var out = '<ellipse cx="70" cy="195" rx="36" ry="5" fill="rgba(58,36,18,.2)"/>' +
      (run ? '<g class="rl rl1">' + legL + '</g><g class="rl rl2">' + legR + '</g><g class="rb">' : legL + legR) +
      (run ? '<g class="ra ra1">' + armL + '</g><g class="ra ra2">' + armR + '</g>' : armL + armR) +
      '<path d="M36 118 H104 L120 170 H20Z" fill="#C2185B" ' + st + '/>' +
      '<path d="M31 138 H109 L112 148 H28Z" fill="#FFC83D"/><path d="M26 154 H114 L117 162 H23Z" fill="#1593A8"/><path d="M27 143l7-4 7 4 7-4 7 4 7-4 7 4 7-4 7 4 7-4 7 4 7-4 7 4" stroke="#0B5A69" stroke-width="2" fill="none"/>' +
      '<path d="M36 118 H104 L120 170 H20Z" fill="none" ' + st + '/>' + front +
      '<rect x="30" y="44" width="80" height="76" rx="28" fill="#F3E3C3" ' + st + '/>' + face +
      '<rect x="14" y="56" width="18" height="42" rx="9" fill="#1593A8" ' + st + '/><rect x="108" y="56" width="18" height="42" rx="9" fill="#1593A8" ' + st + '/><circle cx="23" cy="102" r="5" fill="#C2185B" ' + st2 + '/><circle cx="117" cy="102" r="5" fill="#C2185B" ' + st2 + '/>' +
      '<path d="M28 62C28 12 112 12 112 62Z" fill="#1593A8" ' + st + '/><rect x="28" y="48" width="84" height="14" rx="5" fill="#FFC83D" ' + st + '/><path d="M32 55l6-5 6 5 6-5 6 5 6-5 6 5 6-5 6 5 6-5 6 5 6-5 6 5" stroke="#C2185B" stroke-width="2.6" fill="none"/>' +
      '<circle cx="70" cy="17" r="9" fill="#C2185B" ' + st + '/>' + (run ? '</g>' : '');
    return out;
  }
  /** Símbolo SVG de Chaski con un estado de ánimo: confident, happy, oops, think o listen. */
  function symbol(mood) {
    return '<symbol id="ch-' + mood + '" viewBox="0 0 140 200">' + figure(mood, false) + '</symbol>';
  }
  /** Chaski corriendo, visto de espaldas, como SVG propio (no un símbolo) para poder animar piernas y brazos. */
  function runnerSvg(cls) {
    return '<svg class="chsvg runner ' + (cls || '') + '" viewBox="0 0 140 200" aria-hidden="true">' + figure('run', true) + '</svg>';
  }

  /** Elemento SVG de Chaski. `w` es el ancho en píxeles; el alto se calcula (proporción 140 x 200). */
  function chaski(mood, w, cls) {
    var d = document.createElement('div');
    d.innerHTML = '<svg class="chsvg ' + (cls || '') + '" width="' + w + '" height="' + Math.round(w * 200 / 140) + '" viewBox="0 0 140 200" aria-hidden="true"><use href="#ch-' + mood + '"/></svg>';
    return d.firstChild;
  }
  /** La choza de un tambo (estación del camino). */
  function hut() {
    var d = document.createElement('div');
    d.innerHTML = '<svg class="hut" width="104" height="104" viewBox="0 0 104 104" aria-hidden="true"><path d="M6 54 L52 12 L98 54Z" fill="#D9A441" stroke="' + INK + '" stroke-width="3"/><path d="M14 46 H90 M24 36 H80 M34 26 H70" stroke="#B5802B" stroke-width="3"/><rect x="16" y="54" width="72" height="46" fill="#CFC3A8" stroke="' + INK + '" stroke-width="3"/><path d="M16 68 H88 M16 84 H88 M40 54 V68 M64 68 V84 M34 84 V100" stroke="#8E8165" stroke-width="2" fill="none"/><path d="M42 100 V74 Q52 64 62 74 V100Z" fill="' + INK + '"/></svg>';
    return d.firstChild;
  }

  /* ---------- montaje ---------- */

  var painted = null;
  /** Inserta los símbolos de Chaski en la página (una sola vez). */
  function symbols() {
    if (document.getElementById('ch-happy')) return;
    var defs = document.createElement('div');
    defs.innerHTML = '<svg width="0" height="0" style="position:absolute" aria-hidden="true"><defs>' + ['confident', 'happy', 'oops', 'think', 'listen'].map(symbol).join('') + '</defs></svg>';
    document.body.insertBefore(defs.firstChild, document.body.firstChild);
  }
  /** Crea el contenedor del fondo y los símbolos de Chaski. Llamar una vez al iniciar. */
  function setup() {
    symbols();
    var w = document.createElement('div'); w.className = 'world'; w.id = 'world'; w.setAttribute('aria-hidden', 'true');
    document.body.insertBefore(w, document.body.firstChild);
  }
  /** Cambia el paisaje al momento del día indicado. No redibuja si ya es ese. */
  function paint(time) {
    if (time === painted) return;
    painted = time;
    var el = document.getElementById('world');
    if (el) el.innerHTML = world(time);
  }

  /** Elemento de Chaski corriendo. */
  function runner(cls) {
    var d = document.createElement('div');
    d.innerHTML = runnerSvg(cls);
    return d.firstChild;
  }

  var api = { PAL: PAL, world: world, runnerSvg: runnerSvg, runner: runner, symbol: symbol, symbols: symbols, chaski: chaski, hut: hut, setup: setup, paint: paint };
  root.ChaskiScenery = api;
  if (typeof module !== 'undefined' && module.exports) module.exports = api;
})(typeof window !== 'undefined' ? window : globalThis);
