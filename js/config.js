/* Configuración de Chaski. Se puede editar sin tocar el resto del código. */
window.CHASKI_CONFIG = {
  /* Dirección del servidor intermedio que lee la explicación con el modelo (ver worker/).
     Ejemplo: "https://chaski-lector.tu-cuenta.workers.dev/extract". Vacío = lee con reglas de palabras. */
  EXTRACT_URL: "",
  /* Dónde se guardan los datos de las partidas: "/events" (la base de datos del propio sitio, ver docs/despliegue.md)
     o la URL de un Apps Script que escribe en una hoja de Google. Vacío = solo en el dispositivo. */
  ENDPOINT: "",
  /* true: Chaski avisa que se equivocará si lo enseñas mal (se juega a revisarlo).
     false: no lo avisa y mide cuánto confía el estudiante a ciegas. */
  /* Correo de contacto que muestran las páginas de privacidad y términos. Se fija al empaquetar con CONTACT_EMAIL. */
  CONTACT_EMAIL: "",
  ANNOUNCE_ERRORS: true,
  VERSION: "0.2"
};
