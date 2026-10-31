/**
 * Figuras de los problemas: dibujos vectoriales generados con los datos del problema.
 *
 * Cada problema puede traer una figura (`fig` en js/content.js) que muestra sus datos de otra forma:
 *   - table:   tabla de proporcionalidad, con la celda desconocida resaltada.
 *   - bar:     barra de porcentaje, con la parte y el total.
 *   - balance: balanza para ecuaciones, con cada lado de la igualdad en un platillo.
 *
 * Todo sale de valores fijos del contenido (nunca de texto del estudiante); aun así el texto se escapa.
 * Cada figura lleva su descripción para lectores de pantalla.
 *
 * Uso:  ChaskiFigures.svg({ type: 'table', rows: [['Cuadernos', '2', '8'], ['Soles', '6', '?']] })
 */
(function (root) {
  'use strict';

  function esc(s) { return String(s).replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;'); }
  var UNK = '?';
  function isUnknown(v) { return String(v).trim() === UNK; }
  function text(x, y, cls, s) { return '<text class="' + cls + '" x="' + x + '" y="' + y + '" text-anchor="middle" dominant-baseline="central">' + esc(s) + '</text>'; }
  function wrap(w, h, label, body) {
    return '<svg viewBox="0 0 ' + w + ' ' + h + '" role="img" aria-label="' + esc(label) + '" xmlns="http://www.w3.org/2000/svg">' + body + '</svg>';
  }

  /** Tabla: la primera columna son los nombres de cada magnitud y el resto, sus valores. */
  function table(spec) {
    var rows = spec.rows || [];
    if (rows.length < 2 || !rows[0] || rows[0].length < 3) return '';
    var n = rows[0].length, labelW = 132, cellW = 92, rowH = 46, w = labelW + cellW * (n - 1) + 4, h = rowH * rows.length + 4, body = '', parts = [];
    rows.forEach(function (row, r) {
      var y = 2 + r * rowH;
      body += '<rect class="f-head" x="2" y="' + y + '" width="' + labelW + '" height="' + rowH + '" rx="6"/>' + text(2 + labelW / 2, y + rowH / 2, 'f-l', row[0]);
      var said = [];
      for (var c = 1; c < n; c++) {
        var x = 2 + labelW + (c - 1) * cellW, unk = isUnknown(row[c]);
        body += '<rect class="' + (unk ? 'f-unk' : 'f-cell') + '" x="' + x + '" y="' + y + '" width="' + cellW + '" height="' + rowH + '" rx="6"/>' + text(x + cellW / 2, y + rowH / 2, unk ? 'f-q' : 'f-t', row[c]);
        said.push(unk ? 'desconocido' : row[c]);
      }
      parts.push(row[0] + ': ' + said.join(', '));
    });
    return wrap(w, h, spec.alt || 'Tabla. ' + parts.join('. '), body);
  }

  /** Barra de porcentaje: el total es el 100% y una parte ocupa `pct`. `part` y `whole` pueden ser "?". */
  function bar(spec) {
    var pct = Number(spec.pct);
    if (!(pct > 0 && pct < 100)) return '';
    var x0 = 20, bw = 400, y0 = 46, bh = 38, pw = bw * pct / 100, unit = spec.unit ? ' ' + spec.unit : '';
    var wholeTxt = '100% = ' + spec.whole + (isUnknown(spec.whole) ? '' : unit), partTxt = pct + '% = ' + spec.part + (isUnknown(spec.part) ? '' : unit);
    var body = '<rect class="f-bar" x="' + x0 + '" y="' + y0 + '" width="' + bw + '" height="' + bh + '" rx="8"/>' +
      '<rect class="' + (isUnknown(spec.part) ? 'f-unk' : 'f-part') + '" x="' + x0 + '" y="' + y0 + '" width="' + pw + '" height="' + bh + '" rx="8"/>' +
      '<path class="f-line" d="M' + (x0 + pw) + ' ' + (y0 - 4) + ' V' + (y0 + bh + 4) + '"/>' +
      // llaves: arriba el total, abajo la parte
      '<path class="f-line" d="M' + x0 + ' ' + (y0 - 8) + ' V' + (y0 - 14) + ' H' + (x0 + bw) + ' V' + (y0 - 8) + '"/>' +
      text(x0 + bw / 2, y0 - 28, isUnknown(spec.whole) ? 'f-q' : 'f-t', wholeTxt) +
      '<path class="f-line" d="M' + x0 + ' ' + (y0 + bh + 8) + ' V' + (y0 + bh + 14) + ' H' + (x0 + pw) + ' V' + (y0 + bh + 8) + '"/>' +
      text(x0 + Math.max(pw / 2, 60), y0 + bh + 34, isUnknown(spec.part) ? 'f-q' : 'f-t', partTxt);
    var alt = spec.alt || 'Barra de porcentaje. El total es el 100%' + (isUnknown(spec.whole) ? ' y no se conoce' : ', igual a ' + spec.whole + unit) + '. La parte es el ' + pct + '%' + (isUnknown(spec.part) ? ' y no se conoce.' : ', igual a ' + spec.part + unit + '.');
    return wrap(440, 150, alt, body);
  }

  /** Balanza: cada lado de la igualdad en un platillo. */
  function balance(spec) {
    if (!spec.left || !spec.right) return '';
    function pan(cx, label) {
      return '<path class="f-line" d="M' + cx + ' 52 L' + (cx - 68) + ' 112 M' + cx + ' 52 L' + (cx + 68) + ' 112"/>' +
        '<path class="f-pan" d="M' + (cx - 70) + ' 112 H' + (cx + 70) + ' Q' + (cx + 70) + ' 156 ' + cx + ' 156 Q' + (cx - 70) + ' 156 ' + (cx - 70) + ' 112 Z"/>' +
        text(cx, 132, 'f-t', label);
    }
    var body = '<path class="f-base" d="M170 196 H270 L250 178 H190 Z"/><path class="f-post" d="M220 52 V178"/>' +
      '<path class="f-beam" d="M80 52 H360"/><circle class="f-pivot" cx="220" cy="52" r="9"/>' +
      pan(80, spec.left) + pan(360, spec.right) + text(220, 22, 'f-t', '=');
    return wrap(440, 204, spec.alt || 'Balanza en equilibrio. En un platillo hay ' + spec.left + ' y en el otro, ' + spec.right + '.', body);
  }

  var TYPES = { table: table, bar: bar, balance: balance };

  /**
   * Texto SVG de una figura, o '' si la descripción no sirve.
   * @param {{type: string}} spec
   */
  function svg(spec) {
    if (!spec || !TYPES[spec.type]) return '';
    return TYPES[spec.type](spec);
  }

  var api = { svg: svg, types: Object.keys(TYPES) };
  root.ChaskiFigures = api;
  if (typeof module !== 'undefined' && module.exports) module.exports = api;
})(typeof window !== 'undefined' ? window : globalThis);
