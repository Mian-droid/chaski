/* Páginas legales: muestra el correo de contacto si está configurado (CONTACT_EMAIL en js/config.js).
   Sin correo, queda el texto de cada página, que remite al docente o a la institución que aplica el piloto. */
(function () {
  'use strict';
  /* En la hoja impresa de autorización, indica en qué sitio están la política y los términos. */
  Array.prototype.forEach.call(document.querySelectorAll('[data-site]'), function (el) { if (location.host) el.textContent = location.host; });
  var email = (window.CHASKI_CONFIG || {}).CONTACT_EMAIL;
  if (!email) return;
  Array.prototype.forEach.call(document.querySelectorAll('[data-contact]'), function (el) {
    var a = document.createElement('a');
    a.href = 'mailto:' + email;
    a.textContent = email;
    el.replaceChildren(a);
  });
})();
