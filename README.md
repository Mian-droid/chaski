# Chaski

Mensajero-IA que solo sabe lo que el estudiante le enseña. Si le explicas bien, resuelve bien. Si le explicas mal o dejas huecos, se confunde y se equivoca, siempre con total seguridad. El estudiante tiene que revisarlo, atraparlo y corregirlo. Entrena el hábito de verificar y de explicar con palabras propias.

Nació para la Grieta 02, «Aprender sin pensar», del DSC Hack 2026. Es un **piloto exploratorio**: no prueba efecto ni evalúa con nota.

## Temas

El docente elige el tema y comparte un enlace. Hay tres paquetes de matemática de secundaria:

| Tema | Ideas que Chaski puede aprender (o no) |
|---|---|
| Proporciones | multiplicar y no sumar · cada dato con su pareja · si una sube, la otra baja |
| Porcentajes | el porcentaje es una parte del total · descuento y aumento · si te dan la parte, busca el total |
| Ecuaciones de primer grado | lo que suma pasa restando · el paréntesis se reparte · primero suma o resta, después divide |

El grado exacto en que se enseña cada tema lo debe confirmar un docente. Para agregar otro tema, ver [docs/contenido-de-temas.md](docs/contenido-de-temas.md).

## Cómo se juega

1. **Enseñar.** El estudiante le explica el tema a Chaski en un chat. Después puede agregar más.
2. **El cerebro.** Chaski cuenta lo que entendió. Un modelo de lenguaje lee la explicación y rellena tres fichas (una por idea): bien, mal o ausente, con una cita del estudiante como evidencia.
3. **El camino.** Chaski resuelve 6 problemas, uno por tambo del Camino Inca, usando solo sus fichas. Con la ficha bien acierta. Si falta o está mal, comete el error típico de ese tema. Cuando todo está bien enseñado, igual comete un descuido de cálculo, para que haya algo que revisar.
4. **Revisar.** El estudiante elige «Dejar pasar» o «¡Alto, Chaski!». Si lo detiene, toca el nudo del quipu donde está el error y teclea la respuesta correcta. El juego no dice si acertó hasta el final de la ronda.
5. **Preguntas de Chaski.** Tres preguntas numéricas con otros números y una pregunta libre («dímelo con otro ejemplo»).
6. **Rendición de cuentas.** Sellos por problema, el mensaje que llegó al Cusco con los errores que no se corrigieron, y por qué se equivocó Chaski.
7. **Enseñar de nuevo** (opcional, una vez) y **cierre** con el resumen.

## Probarlo en tu computadora

Es una página estática, sin compilación.

```bash
python -m http.server 5190
```

- Juego: `http://localhost:5190/` (o `?tema=porcentajes&clase=3A` para elegir tema y clase).
- Panel docente: `http://localhost:5190/panel.html`.

Sin servidor intermedio configurado, Chaski lee la explicación con reglas de palabras. Funciona, pero entiende menos formas de explicar que el modelo.

## Pruebas

```bash
npm test                  # núcleo (36 pruebas) y servidor (14 pruebas)
npm run test:core         # solo el núcleo
npm run test:worker       # solo el servidor
```

Requiere Node 22 o superior. No hay dependencias en el juego; el servidor usa el SDK de Anthropic y `zod`.

## Despliegue

**Juego y panel:** son solo archivos. Sirven Netlify Drop, GitHub Pages, Cloudflare Pages o Vercel, sin comando de compilación.

**Lectura con el modelo (opcional):** la clave de Anthropic no puede ir en la página. Hay un servidor intermedio en [worker/](worker/README.md). Después de desplegarlo, pon su dirección en `EXTRACT_URL` de `js/config.js`.

**Guardar datos de varios dispositivos (opcional):** un Apps Script que escribe en una hoja de Google. Pasos en [apps-script/README.md](apps-script/README.md). Sin esto, los datos quedan en el navegador de cada estudiante y el panel los lee de ese dispositivo o de un archivo JSON.

## Datos y privacidad

- Solo se piden un **apodo** y un **código de clase**. No se piden nombre ni datos personales.
- Los textos que escribe el estudiante se guardan (en su dispositivo y, si se configura, en la hoja). Cada campo recuerda no escribir datos personales.
- Cuando se usa el modelo, el texto del estudiante se envía a un servicio externo (Anthropic) a través del servidor intermedio.
- Con menores, siempre con un adulto responsable presente. El permiso de tutores y el tiempo de retención de datos los define el equipo con el docente (ver [docs/requerimientos.md](docs/requerimientos.md)).

## Métricas del piloto

| Métrica | Cómo se calcula |
|---|---|
| Detección | errores marcados / errores que Chaski realmente cometió |
| Falsas alarmas | soluciones correctas marcadas como error / soluciones correctas |
| Ideas bien enseñadas | fichas del cerebro final que quedaron «bien» (de 3) |
| Dependencia (exploratorio, 0 a 1) | promedio de: errores no detectados, preguntas de seguimiento falladas y textos con originalidad débil |

Como los errores salen de lo enseñado, cada estudiante tiene una mezcla distinta de errores y de soluciones correctas. La discriminación (detección menos falsas alarmas) sigue siendo comparable.

`ANNOUNCE_ERRORS` en `js/config.js`: en `true`, Chaski avisa que se equivocará si lo enseñan mal. En `false`, no lo dice y se mide confianza a ciegas. Anunciarlo infla la detección.

## Estructura del repositorio

```
index.html, panel.html     Juego y panel docente
css/                       game.css (juego) y panel.css (panel)
js/                        content, core, brain, app, panel, config
tests/                     Pruebas del núcleo (sin dependencias)
worker/                    Servidor intermedio (Cloudflare Worker, TypeScript)
apps-script/               Guardado de eventos en una hoja de Google
mockup/                    Maqueta interactiva del diseño (referencia)
docs/                      Arquitectura, requerimientos y guía de contenido
```

Más detalle en [docs/arquitectura.md](docs/arquitectura.md).

## Límites conocidos

- **El modelo real no se ha probado.** La ruta se probó con un modelo simulado. Falta correr `worker/scripts/live-test.mjs` con una clave real.
- **No se mide retención ni aprendizaje.** No hay examen final ni día 2, y tampoco pretest. El piloto describe cómo enseñan y revisan los estudiantes, no cuánto aprendieron.
- **No hay limitador de uso** en el servidor. Restringe `ALLOWED_ORIGINS` a la dirección de tu juego.
- **La señal de originalidad es heurística** y puede equivocarse con textos cortos o vocabulario muy común.
- **No se validó con estudiantes reales** ni con un docente.
- **No hay sonido** y las animaciones son mínimas.
