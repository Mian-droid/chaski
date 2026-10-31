# Guardar los datos en una hoja de Google

Opcional. Sin esto, los datos de cada estudiante quedan en su navegador y el panel docente los lee de ese dispositivo o de un archivo JSON.

`Code.gs` recibe los eventos del juego y los guarda en una hoja. El panel docente los lee de ahí.

## Pasos

1. Crea una hoja de cálculo de Google.
2. Extensiones, Apps Script. Pega el contenido de `Code.gs`.
3. Cambia `KEY` por una clave tuya. Es la que escribirás en el panel docente para leer los datos.
4. Implementar, Nueva implementación, tipo Aplicación web. Ejecutar como tú; acceso para cualquiera.
5. Copia la dirección que termina en `/exec` y ponla en `ENDPOINT` de `../js/config.js`.

## Columnas de la hoja `eventos`

`ts`, `clase`, `apodo`, `tema`, `sid`, `tipo`, `json` (el evento completo). Cada fila es un evento; ver los tipos en [../docs/arquitectura.md](../docs/arquitectura.md).

## Privacidad y seguridad

- La hoja guarda también los textos que escriben los estudiantes. Pídeles que no escriban datos personales (el juego lo recuerda).
- Quien tenga la dirección `/exec` puede **enviar** eventos. Para **leerlos** hace falta la clave `KEY`.
- No es un sistema de cuentas. Si los datos son sensibles, restringe el acceso a la hoja y borra los datos cuando termine el piloto.
- Con menores, siempre con un adulto responsable presente.

## No probado

Este script se escribió y se revisó su sintaxis, pero **no se desplegó ni se probó** con una hoja real.
