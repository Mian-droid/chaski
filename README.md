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

El docente decide en qué grado usa cada tema. Para agregar otro tema, ver [docs/contenido-de-temas.md](docs/contenido-de-temas.md).

## Cómo se juega

1. **Enseñar.** Chaski plantea la pregunta en una placa de piedra y el estudiante responde en una tablilla de arcilla. No es un chat: al enviar, el texto vuela y ata un nudo en la cuerda de Chaski. Tocar un nudo muestra lo que se enseñó. Después puede agregar más lecciones.
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
npm test                  # núcleo (36), dibujo (6), empaquetado del sitio (12) y servidor (29)
npm run test:core         # solo el núcleo
npm run test:scenery      # solo el dibujo (6)
npm run test:site         # solo el empaquetado del sitio (12)
npm run test:worker       # solo el servidor (29)
```

Requiere Node 22 o superior. No hay dependencias en el juego; la lectura con el modelo usa solo `zod` (declarado en la raíz para que Cloudflare lo instale) y llama a la API de Gemini con `fetch`.

## Despliegue

Guía paso a paso para Cloudflare: [docs/despliegue.md](docs/despliegue.md).

**Todo en un proyecto de Cloudflare Pages.** El juego y el panel son archivos estáticos (`npm run build:site` arma `dist/`) y la lectura con el modelo es una Pages Function en [functions/](functions/extract.ts) que responde en `/extract`, en el mismo sitio. No hay Worker aparte, ni CORS, ni direcciones que copiar: solo se agrega el secreto `GEMINI_API_KEY` en el proyecto. El mismo código corre también como [Worker independiente](worker/README.md).

**Guardar datos de varios dispositivos (opcional):** la base de datos D1 del propio proyecto de Pages, en [functions/events.ts](functions/events.ts), con el esquema en [db/schema.sql](db/schema.sql). Pasos en [docs/despliegue.md](docs/despliegue.md#5-guardar-los-datos-de-los-estudiantes-opcional). Sin esto, los datos quedan en el navegador de cada estudiante y el panel los lee de ese dispositivo o de un archivo JSON. También se puede usar un Apps Script que escribe en una hoja de Google ([apps-script/](apps-script/README.md)).

## Datos y privacidad

- Solo se piden un **apodo** y un **código de clase**. No se piden nombre ni datos personales.
- Los textos que escribe el estudiante se guardan (en su dispositivo y, si se configura, en la base de datos o en la hoja). Cada campo recuerda no escribir datos personales. El docente puede borrar de la base los datos de su clase desde el panel.
- Cuando se usa el modelo, el texto del estudiante se envía a un servicio externo (Google Gemini) a través del servidor intermedio. Los términos de la API de Gemini restringen su uso en clientes dirigidos a menores de 18 años; para aplicarlo con menores, el juego funciona sin modelo, con reglas de palabras (ver [docs/despliegue.md](docs/despliegue.md#privacidad-y-datos)).
- Con menores, siempre con un adulto responsable presente. El permiso de tutores y el tiempo de conservación de los datos corresponden a la institución o al docente que aplique el piloto (ver [docs/requerimientos.md](docs/requerimientos.md)).

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
js/                        content, core, brain, scenery (paisaje y personaje), app, panel, config
tests/                     Pruebas del núcleo (sin dependencias)
worker/                    Lector con el modelo: lógica y pruebas (TypeScript), desplegable como Worker
functions/                 Pages Functions /extract (lectura con el modelo) y /events (base de datos): usan el código de worker/
db/                        Esquema SQL de la base de datos (Cloudflare D1)
apps-script/               Alternativa: guardado de eventos en una hoja de Google
scripts/, deploy/          Empaquetado del sitio y cabeceras para Cloudflare Pages
brand/                     Favicon e imagen para compartir por WhatsApp (ver brand/README.md)
mockup/                    Primeras exploraciones de diseño (A: noche, B: textil andino de día)
docs/                      Arquitectura, requerimientos y guía de contenido
```

Más detalle en [docs/arquitectura.md](docs/arquitectura.md).

## Alcance y límites

- **Piloto exploratorio.** Describe cómo enseñan y revisan los estudiantes. No hay examen final, día 2 ni pretest, así que no mide retención ni aprendizaje.
- **La señal de originalidad es heurística** y puede equivocarse con textos cortos o vocabulario muy común.
- **El índice de dependencia es exploratorio**, sin una escala validada.
- **El servidor no limita el uso por usuario.** El acceso se restringe por origen (`ALLOWED_ORIGINS`).
- **Los dibujos son vectoriales hechos en código**, no ilustraciones profesionales, y el juego no tiene sonido.
