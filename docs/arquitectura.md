# Arquitectura

## Vista general

```mermaid
flowchart LR
  E[Estudiante] -->|explica| App[js/app.js<br/>interfaz]
  App -->|texto + tema| Brain[js/brain.js<br/>cerebro]
  Brain -->|POST /extract| W[worker/<br/>servidor intermedio]
  W -->|lee, no resuelve| M[(Modelo de lenguaje)]
  Brain -.->|sin conexión| H[Reglas de palabras<br/>por tema]
  Brain -->|fichas| Solve[solve / planRound<br/>soluciones por fichas]
  Solve --> App
  App -->|eventos| Log[(Dispositivo)]
  Log -.->|opcional| Sheet[(Hoja de Google<br/>apps-script/)]
  Log --> Panel[panel.html<br/>docente]
  Sheet --> Panel
```

El juego es una página estática. No hay servidor propio salvo el opcional que lee la explicación con el modelo.

## Módulos

| Archivo | Responsabilidad | Depende de |
|---|---|---|
| `js/content.js` | Un paquete por tema: fichas, problemas con su solución correcta y su error típico, preguntas de seguimiento, reglas de palabras. `use(id)` activa un tema. | nada |
| `js/core.js` | Funciones puras: leer números, señal de originalidad, métricas por sesión, agrupación por estudiante. | nada |
| `js/brain.js` | Cerebro (fichas), solución por fichas, lectura de la explicación (servidor o reglas). | content, core |
| `js/figures.js` | Gráficos de los problemas, en SVG: tabla de valores, barra de porcentaje y balanza. Reciben la descripción `fig` de cada problema y dibujan solo los datos del enunciado, con la incógnita marcada y sin la respuesta. Cada gráfico lleva su descripción para lectores de pantalla. Solo SVG, sin DOM. | nada |
| `js/scenery.js` | Dibujo: paisaje panorámico en tres momentos del día (amanecer, día, atardecer), Chaski con cinco estados de ánimo y la choza del tambo. Solo SVG, sin lógica de juego. | nada |
| `js/app.js` | Interfaz del juego: escenas, estado, registro de eventos. | content, core, brain, figures, scenery |
| `privacidad.html`, `terminos.html`, `consentimiento.html`, `acerca.html` | Páginas informativas y legales, estáticas, con `css/legal.css`. `js/legal.js` muestra el correo de contacto si está configurado. | config |
| `js/panel.js` | Panel docente: elegir tema y enlace, cargar datos (de todas las salas o de una), actualizarse solo mientras está abierto, cifras, ideas por retomar y tabla de estudiantes con su progreso. | content, core, scenery |
| `js/config.js` | Direcciones y opciones editables. | nada |
| `functions/events.ts` | Pages Function que responde en `/events`: guarda, lee y borra los eventos en la base D1 enlazada como `DB`. Usa `handleEvents()` de `worker/src/events.ts`. | worker/ |
| `functions/extract.ts` | Pages Function que responde en `/extract` y llama a `handle()` de `worker/`. Es el camino por defecto en Cloudflare Pages. | worker/ |
| `functions/transcribe.ts` | Pages Function que responde en `/transcribe`: pasa la voz del estudiante a texto con Whisper (Workers AI). | worker/ |
| `js/voice.js` | Dictado por voz: graba con `MediaRecorder`, envía a `/transcribe` y devuelve el texto. La interfaz del botón vive en `app.js`. | MediaRecorder |
| `worker/` | Servidor intermedio: valida, arma el prompt por tema, llama al modelo, sanea la respuesta. | API de Gemini (`fetch`), zod |
| `apps-script/Code.gs` | Alternativa a la base de datos: recibe eventos y los guarda en una hoja. | nada |

`content.js`, `core.js` y `brain.js` no usan el DOM, por eso se prueban en Node (`tests/core.test.js`).

## Decisiones de diseño

**El modelo solo lee; las fichas resuelven.** Un modelo que debe «olvidar» lo que sabe tiende a resolver bien aunque el estudiante haya enseñado mal. El modelo devuelve para cada ficha un estado (bien, mal, ausente) y una cita textual. Si la cita no aparece en lo que escribió el estudiante, la ficha vuelve a ausente. Las soluciones las calculan las fichas de forma determinista: cada error se atribuye a lo que se enseñó, y nunca se enseña algo falso por accidente.

**Los errores no se generan, se eligen.** Cada problema trae su solución correcta, su solución equivocada y, a veces, una con un descuido de cálculo. Ver [contenido-de-temas.md](contenido-de-temas.md).

**Siempre hay un descuido.** Si el estudiante enseña todo bien, Chaski comete un único error de cálculo en un problema con la ficha bien. Así todos practican verificar.

**Sin aviso durante la ronda.** El juego no dice si el estudiante acertó hasta el final, para que la medición sea limpia.

**Respaldo sin conexión.** Si el servidor falla, tarda más de 12 segundos o responde algo inválido, `brain.js` lee con las reglas de palabras del tema. El juego nunca se detiene por el modelo.

**El tema se elige por enlace.** `index.html?tema=porcentajes&clase=3A`. No hay cuentas ni base de datos propia. El panel docente genera el enlace.

**Sin exámenes ni día 2.** El piloto no incluye el examen de Chaski, el examen sin Chaski ni el día 2. Consecuencia: no se mide retención ni aprendizaje, solo cómo enseñan y revisan los estudiantes.

**Servidor con lista cerrada de temas.** El tema llega desde la página, por eso el servidor solo acepta los de `worker/src/topics.ts` y nunca arma el prompt con texto del cliente. Una prueba verifica que esa lista coincida con la del juego.

## Interfaz

- **Dirección visual:** textil andino de día. Paneles de tela con borde tejido, colores de tejidos andinos sobre una paleta de tierra (contornos y textos en cacao), y un paisaje de andenes con nieve, ciudadelas, río, cóndor, llamas y pasto que se mueve.
- **Paisaje a pantalla completa.** Es un panorama de 1200 x 800 anclado abajo. En el celular se ve el centro; en tablet y laptop se ven también las montañas, ciudadelas y llamas de los lados. No hay franjas vacías en ningún tamaño.
- **Reparto en pantallas anchas.** Cada escena se arma con `frame({ hud, hero, main })`. En el celular todo va en una columna. Desde 880 px de ancho, Chaski (`hero`) queda a la izquierda y la tarea (`main`) a la derecha, y todo el bloque va centrado en la pantalla. El camino usa una sola columna y la rendición de cuentas, que es larga, deja a Chaski fijo mientras se desplaza.
- **Chaski habla en una burbuja sobre su cabeza.** Todo lo que dice (la pregunta, lo que entendió, los problemas, la rendición) sale en una burbuja (`say()` en `app.js`) con la colita hacia abajo, en celular y en pantallas anchas. Con la clase `talk`, Chaski se dibuja entero (no con `<use>`) y su boca se mueve unos 3 segundos; con menos movimiento pedido, no se anima. La tarea (tablilla de arcilla, botón, cuerda de nudos) queda en la columna principal.
- **Enseñar no es un chat.** Cada pregunta de Chaski va en su burbuja; el estudiante responde en una tablilla de arcilla; al enviar, el texto vuela y ata un nudo en la cuerda «Lo que Chaski sabe». El estado guarda las lecciones (`lessons`), no una conversación. Mientras el texto vuela, el campo queda bloqueado.
- **Momento del día por escena:** amanecer al entrar (bienvenida e introducción), día para jugar y atardecer en la rendición y el cierre. Se define en `SCENE_TIME` de `app.js`.
- **Menos movimiento:** con la preferencia del sistema de reducir movimiento se apagan las animaciones del fondo y el vuelo del texto.
- **Panel docente:** misma identidad, en claro y sobrio. Cabecera con el paisaje, a la izquierda el enlace (con botón de WhatsApp) y la carga de datos, a la derecha cifras con su significado, ideas por retomar con su porcentaje escrito y una tabla ordenable que en el celular se vuelve tarjetas. Las etiquetas de dependencia llevan texto además de color.
- Las primeras exploraciones de diseño (A: noche, B: textil andino de día) están en `mockup/`.

## Flujo de escenas

```
welcome -> intro -> teach (2 mensajes) -> brain -> map -> ex (x6) -> probeintro -> probe (x4) -> reveal -> end
                          ^    |                                                                       |
                          |    +-- teach (aclarar, una vez) -> brain                                   |
                          +------------------- teach (una vez) -> brain ------------------------------+
```

El estado se guarda en el dispositivo en cada cambio de escena, para poder retomar con «Continuar donde me quedé».

**Pausa antes de las preguntas.** Al terminar los seis problemas, `probeintro` explica qué sigue (las preguntas de seguimiento) y que todavía no se dice cómo le fue a Chaski. Así el cambio de actividad no llega sin aviso.

**Repregunta de Chaski.** Si la lectura con el modelo deja las tres fichas en «ausente» (la explicación fue demasiado vaga para entender nada), Chaski pide una vez que se lo expliquen de otra manera, con un ejemplo con números. Nunca repregunta cuando algo quedó «mal»: ahí debe equivocarse para que se note. No ocurre con la lectura por reglas. La segunda explicación se lee igual y no vuelve a repreguntar; el evento `brain` lo registra con `clarify`.

**Gráficos en los problemas.** Cada problema puede llevar un campo `fig` (ver `docs/contenido-de-temas.md`). Se dibuja sobre la solución de Chaski, de modo que leer el gráfico forma parte de revisar el trabajo. El gráfico no depende de si la solución es correcta o equivocada.

## Eventos

Cada evento lleva `ts`, `type`, `sid` (partida), `alias`, `cls` (clase), `topic` y `day` (siempre 1, se conserva por compatibilidad).

| `type` | Cuándo | Campos principales |
|---|---|---|
| `start` | Empieza una partida | `version`, `model` |
| `teach` | El estudiante envía una explicación | `k`, `text`, `pasted`, `ms`, `orig` (señal de originalidad), `phase` |
| `brain` | Se lee una explicación | `cards` (cerebro resultante), `read` (lo que se leyó), `source` (`modelo` o `reglas`), `why`, `restatement`, `clarify` (verdadero si Chaski pidió explicarlo de nuevo) |
| `ex` | Se resuelve un problema | `ex`, `rule` (causa del error: `K1`..`K3`, `S` o null), `hasError`, `saidError`, `step`, `stepOk`, `correction`, `correctionOk`, `ms` |
| `probe` | Pregunta de seguimiento | `k`, `kind` (`num` o `free`), `ok`, `text`, `orig`, `pasted` |

Las métricas se calculan en `core.js` (`metricsFor`, `groupStudents`). Los eventos sin `topic` se tratan como `proporciones`.

## Datos y escalabilidad

- **Registro de eventos que solo se agrega.** Una tabla `events` (ver [`db/schema.sql`](../db/schema.sql)) con una fila por evento, el evento completo en JSON y un índice por clase, tema y hora. Un identificador por evento evita guardarlo dos veces si el juego reintenta un envío.
- **Columnas de `events`:** `eid` (identificador único del evento: partida, hora, tipo y lección o problema), `ts` (hora en milisegundos), `cls` (código de clase en mayúsculas), `alias` (apodo, nunca el nombre), `topic` (tema), `sid` (partida), `type` (`start`, `teach`, `brain`, `ex` o `probe`) y `data` (el evento completo, en JSON).
- **Pocas escrituras.** El juego envía los eventos en lotes de hasta 100, como máximo cada 8 segundos y siempre al llegar a la rendición y al cierre, de modo que el panel ve el avance sin una escritura por clic. Una partida genera de 16 a 20 eventos y, contando la tabla y sus dos índices, unas 70 filas escritas.
- **Una sola puerta a la base.** Solo `worker/src/events.ts` conoce la base de datos, detrás de una interfaz mínima (`prepare`, `bind`, `run`, `all`, `batch`). Las pruebas la reemplazan por una base en memoria.
- **Sin datos personales.** `worker/src/pii.ts` oculta correos, teléfonos y documentos de 8 cifras del texto que va a la IA y de los campos `text` y `restatement` que se guardan; el juego ya los frena antes de enviar (`ChaskiCore.personalData`). Es una red de seguridad contra descuidos, no una garantía.
- **Lectura acotada e incremental.** El panel pide los eventos de todas las salas o de una sola (`cls`, opcional) y el servidor devuelve como máximo 20 000 filas, con `last` (el último identificador) y `more`. Mientras está abierto, el panel pide cada 15 segundos solo lo nuevo (`since`). Las salas son una etiqueta visual: sin código, la partida va a la sala `GENERAL`. Borrar exige indicar la sala.
- **Capacidad.** Con los límites del plan gratuito de Cloudflare D1 (100 000 filas escritas por día y 500 MB por base), una base soporta del orden de 1 400 partidas por día y entre 10 000 y 30 000 partidas guardadas, según el tamaño de los textos. Las cifras salen de la documentación de D1 y de las dimensiones de un evento, no de una prueba de carga.
- **Cómo crece.** Primero, el plan de pago de D1 (10 GB por base y 50 millones de escrituras al mes incluidas). Después, una base por colegio o por clase, con réplicas de lectura. Si hicieran falta cuentas de docentes, permisos por colegio o consultas entre colegios, el registro de eventos se exporta con un `SELECT` y se importa a Postgres (por ejemplo Supabase) reescribiendo solo `events.ts`.

## Protección contra abuso

- **Por IP.** Cada IP tiene un máximo de lecturas con el modelo y de envíos de partidas en ventanas de 10 minutos. El contador es una fila de la tabla `rate` que se actualiza con una sola sentencia (`INSERT ... ON CONFLICT ... RETURNING`), sin carreras entre solicitudes simultáneas.
- **Diario.** Un tope de lecturas con el modelo por día, sumando todas las IP, protege la cuota de Gemini aunque el ataque venga de muchas direcciones.
- **Privacidad.** La IP se guarda solo como una huella corta (los primeros 8 bytes de un SHA-256) con fecha de caducidad; los contadores vencidos se borran solos.
- **Falla hacia abrir.** Si la base no está o falla, no se limita nada: un error del límite no debe dejar a una clase sin juego.
- **Qué no cubre.** No distingue personas de bots ni frena un ataque distribuido grande. Para eso están las reglas de Cloudflare y Turnstile (ver [despliegue.md](despliegue.md)).

## Pruebas

| Qué | Dónde | Cuántas |
|---|---|---|
| Contenido de los tres temas (cuentas verificadas de forma independiente), cerebro, lectura con reglas y con servidor simulado, originalidad, métricas | `tests/core.test.js` | 37 |
| Figuras de los problemas: cada gráfico muestra datos del enunciado, marca una sola incógnita y no revela la respuesta; detección de explicaciones demasiado vagas | `tests/figures.test.js` | 9 |
| Dibujo: el paisaje panorámico y los símbolos de Chaski | `tests/scenery.test.js` | 7 |
| Empaquetado del sitio: qué se publica, direcciones, referente, favicon, vista previa al compartir y páginas legales | `tests/build-site.test.js` | 19 |
| Servidor y funciones de Pages: lectura con el modelo (formato, temas, CORS, clave en cabecera, errores de Gemini, instrucciones escondidas, consistencia con el juego) y base de datos (validación, duplicados, clave del panel, lectura de todas las salas o de una y de lo nuevo, borrado, límites) | `worker/test/*.test.ts` | 58 |

No hay pruebas automáticas de la interfaz.
