/**
 * Chaski: guardado de eventos en una hoja de Google.
 *
 * POST  cuerpo {"events": [...]}  -> agrega una fila por evento en la hoja "eventos".
 * GET   ?cls=CLASE&key=KEY        -> devuelve {"events": [...]} de esa clase. Exige la clave KEY.
 *
 * Pasos de despliegue y advertencias de privacidad: ver README.md en esta carpeta.
 */

/** Nombre de la hoja donde se guardan los eventos. */
var SHEET = 'eventos';
/** Clave para leer los datos desde el panel docente. CÁMBIALA antes de desplegar. */
var KEY = 'cambia-esta-clave';

/** Devuelve la hoja de eventos; la crea con su encabezado si no existe. */
function sheet_() {
  var ss = SpreadsheetApp.getActiveSpreadsheet();
  var sh = ss.getSheetByName(SHEET) || ss.insertSheet(SHEET);
  if (sh.getLastRow() === 0) sh.appendRow(['ts', 'clase', 'apodo', 'tema', 'sid', 'tipo', 'json']);
  return sh;
}

/** Recibe los eventos del juego. Cualquiera con la dirección puede enviar; para leer hace falta KEY. */
function doPost(e) {
  var body = JSON.parse(e.postData.contents);
  var rows = (body.events || []).map(function (ev) {
    return [ev.ts, String(ev.cls || '').toUpperCase(), ev.alias, ev.topic || '', ev.sid, ev.type, JSON.stringify(ev)];
  });
  if (rows.length) {
    var sh = sheet_();
    sh.getRange(sh.getLastRow() + 1, 1, rows.length, 7).setValues(rows);
  }
  return ContentService.createTextOutput('ok');
}

/** Devuelve los eventos de una clase como JSON. Sin la clave correcta responde un error. */
function doGet(e) {
  var out = ContentService.createTextOutput().setMimeType(ContentService.MimeType.JSON);
  if ((e.parameter.key || '') !== KEY) return out.setContent(JSON.stringify({ error: 'clave incorrecta' }));
  var cls = String(e.parameter.cls || '').toUpperCase();
  var data = sheet_().getDataRange().getValues();
  var events = [];
  for (var i = 1; i < data.length; i++) {
    if (!cls || String(data[i][1]).toUpperCase() === cls) {
      try { events.push(JSON.parse(data[i][6])); } catch (err) { /* fila dañada: se omite */ }
    }
  }
  return out.setContent(JSON.stringify({ events: events }));
}
