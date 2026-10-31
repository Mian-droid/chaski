# Cambios

Formato basado en [Keep a Changelog](https://keepachangelog.com/es-ES/1.1.0/). Las versiones siguen un esquema simple `0.x` mientras sea un piloto.

## [Sin publicar]

### Agregado
- `npm run build:site`: arma `dist/` solo con el juego, el panel y las cabeceras, y escribe las direcciones (`EXTRACT_URL`, `ENDPOINT`) ahí y no en el repositorio.
- Cabeceras para Cloudflare Pages (`deploy/_headers`) y guía de despliegue en `docs/despliegue.md`.
- Pruebas del empaquetado (5).

### Cambiado
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
