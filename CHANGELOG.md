# Cambios

Formato basado en [Keep a Changelog](https://keepachangelog.com/es-ES/1.1.0/). Las versiones siguen un esquema simple `0.x` mientras sea un piloto.

## [Sin publicar]

### Agregado
- Pruebas del servidor: clave solo en cabecera, nombre de modelo validado, detalle de errores que no llega al navegador (17 en total).
- `js/scenery.js`: el dibujo (fondo, personaje y choza) separado de la lógica del juego.
- `npm run build:site`: arma `dist/` solo con el juego, el panel y las cabeceras, y escribe las direcciones (`EXTRACT_URL`, `ENDPOINT`) ahí y no en el repositorio.
- Cabeceras para Cloudflare Pages (`deploy/_headers`) y guía de despliegue en `docs/despliegue.md`.
- Pruebas del empaquetado (5).

### Cambiado
- **El servidor lee con Google Gemini** en lugar de Anthropic. Llama a `generateContent` con `fetch`, sin SDK (el paquete bajó de 1,7 MiB a 779 KiB). Secreto `GEMINI_API_KEY`; modelo por defecto `gemini-3.5-flash-lite`. El juego no cambió.
- **Nueva dirección visual: textil andino de día.** Paneles de tela, paisaje por capas en tres momentos del día, y un Chaski con más carácter.
- **Enseñar ya no es un chat.** Pregunta en una placa de piedra, respuesta en una tablilla de arcilla, y cada lección ata un nudo en la cuerda de Chaski (se puede releer tocándolo). El cerebro pasa a ser una nube de pensamiento y tres tablillas colgadas.
- Las páginas no mandan el referente (`no-referrer`): el enlace lleva el código de clase y no debe viajar a Google Fonts.

## [0.2.0] - 2026-10-30

### Agregado
- Tres temas de matemática de secundaria (proporciones, porcentajes, ecuaciones de primer grado), cada uno con tres ideas, seis problemas y sus errores típicos.
- El docente elige el tema y comparte un enlace (`?tema=` y `?clase=`) desde el panel.
- Cerebro de fichas: los errores de Chaski salen de lo que el estudiante enseñó. Un modelo lee la explicación y rellena las fichas; las fichas resuelven.
- Servidor intermedio (Cloudflare Worker) que lee la explicación con el modelo, con un prompt por tema y lista cerrada de temas.
- Lectura de respaldo con reglas de palabras por tema, para cuando no hay conexión con el modelo.
- Interfaz de juego: camino con tambos, quipu de pasos, lupa y teclado de piedra.
- Rendición de cuentas con el mensaje que llegó al Cusco y la causa de cada error.
- Posibilidad de enseñarle de nuevo una vez.
- Panel docente con filtro por tema y clase.
- Documentación: arquitectura, guía para agregar temas y requerimientos.

### Quitado
- Examen de Chaski, examen sin Chaski y día 2, por decisión del equipo. Ya no se mide retención.

### Pendiente
- Prueba con un modelo real (`worker/scripts/live-test.mjs`), despliegue y prueba con estudiantes. Ver `docs/requerimientos.md`.

## [0.1.0] - 2026-10-30

### Agregado
- Primera versión: errores escritos en el guion para proporciones, examen y día 2. Reemplazada por la 0.2.0 antes de usarse con estudiantes.
