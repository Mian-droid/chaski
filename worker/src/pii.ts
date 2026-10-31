/**
 * Datos personales que no deben salir hacia la IA ni guardarse: correos, teléfonos y documentos de 8 cifras.
 * El juego ya los frena antes de enviar; esto cubre a quien llame al servidor directamente.
 * Es una red de seguridad contra descuidos, no una garantía.
 */
const PATTERNS: RegExp[] = [
  /[\w.+-]+@[\w-]+(?:\.[\w-]+)+/g,
  /(?<!\d)(?:\+?51[\s.-]?)?9\d{2}[\s.-]?\d{3}[\s.-]?\d{3}(?!\d)/g,
  /(?<!\d)\d{8}(?!\d)/g,
];

export const HIDDEN = "[dato oculto]";

export function redact(text: string): string {
  return PATTERNS.reduce((t, re) => t.replace(re, HIDDEN), text);
}
