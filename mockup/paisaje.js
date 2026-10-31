/* Maqueta: paisaje en panorámica para llenar cualquier pantalla (celular, tablet, laptop).
   Se dibuja 1200 x 800. El centro de 390 de ancho es la composición del celular; los lados agregan montañas,
   andenes, llamas y árboles que solo se ven en pantallas anchas. Con "slice" y anclado abajo, cada pantalla
   ve lo que le cabe, sin franjas vacías. Si la maqueta se aprueba, esto reemplaza a world() de js/scenery.js. */
(function (root) {
  'use strict';
  var INK = '#3A2412', W = 1200, H = 800, OX = 405;

  /* Paleta sin violeta: el cielo va de azul a coral y oro, y las montañas se tiñen de cielo, no de morado. */
  var PAL = {
    amanecer: { sky: ['#1B4A86', '#5C8FC0', '#F4A27A', '#FFD79A'], sun: { x: 120, y: 410, r: 30, c: '#FFE6A8', glow: '#FF9E6B' }, far: '#7C90BC', farShade: '#5B6F9E', mid: '#5F8497', midShade: '#466A7C', haze: '#FFC9A0', gr: ['#9DB863', '#86A859', '#6D9348'], wall: '#DCC9A3', earth: ['#D69A63', '#A8582A'], cloud: '#FFD9BF', cloud2: '#FF9F8A', tint: '#FFA06B', tintA: 0.14, snow: '#FFEBDD', river: '#F7C99B', rays: true },
    dia: { sky: ['#2FA4DE', '#7FD0EC', '#C8EEF0', '#FFF1C8'], sun: { x: 318, y: 250, r: 32, c: '#FFC83D', glow: '#FFFFFF' }, far: '#8CA8D6', farShade: '#6D88BC', mid: '#68A0B8', midShade: '#4C809B', haze: '#EAF8F6', gr: ['#9BCB66', '#82B957', '#6BA64A'], wall: '#CBBF9E', earth: ['#D79B5A', '#B5602A'], cloud: '#FFFFFF', cloud2: '#E3F4FA', tint: '#FFF3C0', tintA: 0.08, snow: '#FFFFFF', river: '#7FD3F0', rays: true },
    atardecer: { sky: ['#27467E', '#D4686A', '#FF9A56', '#FFD27A'], sun: { x: 292, y: 414, r: 36, c: '#FFE69A', glow: '#FF8A5B' }, far: '#8F6B80', farShade: '#6F4F66', mid: '#8B5B5E', midShade: '#6B4247', haze: '#FFB27D', gr: ['#9AA84C', '#849742', '#6B7E37'], wall: '#D8BC8E', earth: ['#C8743C', '#8E4720'], cloud: '#FFB68A', cloud2: '#FF8A7A', tint: '#FF7A4D', tintA: 0.18, snow: '#FFD9C2', river: '#FFB27D', rays: false }
  };

  function fixed(i) { return Math.abs((Math.sin(i * 12.9898) * 43758.5453) % 1); }

  /* Cordillera con picos generados de forma fija a lo ancho del panorama. */
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
      return '<rect x="' + hx + '" y="' + hy + '" width="' + w + '" height="' + h + '" fill="' + wall + '" stroke="' + INK + '" stroke-width="1.6"/><path d="M' + (hx - 4) + ' ' + hy + ' L' + (hx + w / 2) + ' ' + (hy - h * 0.8) + ' L' + (hx + w + 4) + ' ' + hy + 'Z" fill="' + roof + '" stroke="' + INK + '" stroke-width="1.6"/><path d="M' + (hx + w / 2 - 4) + ' ' + (hy + h) + ' L' + (hx + w / 2 - 2.4) + ' ' + (hy + h * 0.35) + ' L' + (hx + w / 2 + 2.4) + ' ' + (hy + h * 0.35) + ' L' + (hx + w / 2 + 4) + ' ' + (hy + h) + 'Z" fill="#3B2A4D"/>';
    }
    return '<g transform="translate(' + x + ' ' + y + ') scale(' + sc + ')"><path d="M-6 96 Q60 40 150 48 T190 90 V110 H-6Z" fill="' + p.gr[0] + '"/>' +
      '<path d="M4 88 Q70 58 150 62" fill="none" stroke="' + wall + '" stroke-width="5"/><path d="M10 100 Q80 72 176 82" fill="none" stroke="' + wall + '" stroke-width="5"/><path d="M0 112 Q90 88 190 100" fill="none" stroke="' + wall + '" stroke-width="5"/>' +
      house(34, 48, 26, 16) + house(74, 40, 34, 22) + house(122, 46, 24, 15) + house(98, 70, 22, 13) + '</g>';
  }
  /* Anden: franja ondulada que cruza todo el panorama. */
  function band(y0, amp) {
    var d = 'M0 ' + y0, i;
    d += ' Q100 ' + (y0 - amp) + ' 200 ' + (y0 - amp * 0.4);
    for (i = 1; i < 6; i++) d += ' T' + (200 + i * 200) + ' ' + (y0 + (i % 2 ? -amp * 0.8 : amp * 0.2));
    return d;
  }

  /**
   * Paisaje completo. opts.viewBox recorta una franja (para un encabezado); sin opciones llena la pantalla.
   * @param {'amanecer'|'dia'|'atardecer'} t
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

  root.Paisaje = { PAL: PAL, world: world };
})(window);
