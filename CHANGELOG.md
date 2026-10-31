# Cambios

Formato basado en [Keep a Changelog](https://keepachangelog.com/es-ES/1.1.0/). Las versiones siguen un esquema simple `0.x` mientras sea un piloto.

## [Sin publicar]

### Agregado
- **Chaski habla en burbujas sobre su cabeza** en todas las pantallas, y su boca se mueve los primeros segundos para simular que habla (se apaga con «reducir movimiento»).
- **Las tablillas del cerebro dicen qué explicar:** «Explícale cómo armar y ordenar los datos», con el estado «Ya explicado» o «Sin explicar». «Quiero explicarle algo más» ahora lista las ideas que Chaski aún no sabe.
- **Paisaje más vivo:** el cóndor bate las alas y vuela delante de las montañas, las llamas tienen cuello, orejas y manta, y los árboles son pinos y árboles de copa con ramas.
- **Dictado por voz:** sale siempre; el docente lo apaga con una casilla en el panel (`voz=0` en el enlace). El estudiante toca el micrófono, habla (hasta 60 s) y el texto transcrito se agrega a la tablilla para revisarlo y editarlo antes de enviar. Nueva ruta `/transcribe` (Whisper en Workers AI, enlace `AI`), con topes por IP y por día (`RATE_LIMIT_TRANSCRIBE`, `DAILY_TRANSCRIBE`), filtro de frases inventadas sobre el silencio y fallo amable a texto. El audio no se guarda; los eventos registran `voz`, `editado` y `vozMs`, y el panel muestra «Dictado por voz». `Permissions-Policy` ahora permite el micrófono a la propia página. Pruebas: núcleo 39, empaquetado 20, servidor 58.
- **Datos personales:** si el estudiante escribe un correo, un teléfono o un documento de 8 cifras, el juego no lo envía y le pide quitarlo. El servidor también lo oculta (`[dato oculto]`) antes de mandar el texto a la IA y antes de guardar el evento. Pruebas: núcleo 37, servidor 42.
- **Chaski camina al dejar pasar:** de frente, con piernas y brazos en movimiento, avanza de izquierda a derecha y se desvanece.
- **Página 404** para las direcciones que no existen (antes devolvían el juego con código 200).
- **Panel en vivo:** el panel muestra las partidas de todas las salas, o de una, con el progreso de cada estudiante (dónde va, hace cuánto) y un punto verde si está jugando. Se actualiza solo cada 15 segundos mientras está abierto, pidiendo únicamente lo nuevo. El código de clase es opcional al jugar. El juego envía los eventos cada pocos segundos y no solo al final. Borrar exige elegir la sala. Pruebas del servidor: 40.
- **Gráficos en los problemas** (`js/figures.js`): tabla de valores, barra de porcentaje y balanza, en los tres temas. Muestran los datos del enunciado con la incógnita marcada y llevan descripción para lectores de pantalla. Pruebas de las figuras: 9.
- **Repregunta de Chaski:** si la explicación fue tan vaga que no se entendió nada, Chaski pide una vez que se la expliquen con un ejemplo con números. No repregunta cuando entendió algo mal.
- **Pausa antes de las preguntas de seguimiento:** una pantalla explica qué viene antes de pasar de los problemas a las preguntas.
- **Páginas legales:** política de privacidad, términos de uso, autorización imprimible para madres, padres y tutores, y «Acerca de Chaski» (qué hace la IA y qué no, límites y créditos). El juego avisa en la bienvenida que lo escrito lo lee un servicio de IA y enlaza a ellas; el panel enlaza a la autorización. `CONTACT_EMAIL` fija el correo de contacto al empaquetar. `robots.txt` excluye el panel y las rutas de datos. Pruebas del empaquetado: 18.
- **Límites de uso contra bots:** tope por IP cada 10 minutos para las lecturas con el modelo y los envíos de partidas, y tope diario de lecturas con el modelo. La IP se guarda solo como una huella que caduca. Tabla `rate` en `db/schema.sql`. Pruebas del servidor: 37.
- **Base de datos para los resultados** (Cloudflare D1): ruta `/events` en el mismo proyecto de Pages para guardar los eventos de las partidas, y leerlos y borrarlos desde el panel con una clave. Esquema en `db/schema.sql`. El juego envía en lotes de hasta 100 y reintenta si el servidor no responde.
- El panel docente carga los resultados de la base de datos y permite borrar los datos de una clase.
- **Paisaje a pantalla completa** en celular, tablet y laptop, con Chaski y la tarea en dos columnas centradas en pantallas anchas. Pruebas del dibujo: 6.
- **Panel docente rediseñado:** cabecera con paisaje, enlace con botón de WhatsApp, cifras con su significado, barras con porcentaje, tabla ordenable con el texto de cada estudiante y estado sin datos.
- **Favicon con el personaje** (`brand/`): SVG, `.ico` y el ícono de iOS.
- **Vista previa al compartir** por WhatsApp y redes: título, descripción e imagen de 1200 x 630 con Chaski. `SITE_URL` fija la dirección de la imagen al empaquetar.
- El panel docente lleva favicon y no se indexa.
- Pruebas del empaquetado: 11 en total.
- Pruebas del servidor: clave solo en cabecera, nombre de modelo validado, detalle de errores que no llega al navegador, y la función de Pages (18 en total).
- `js/scenery.js`: el dibujo (fondo, personaje y choza) separado de la lógica del juego.
- `npm run build:site`: arma `dist/` solo con el juego, el panel y las cabeceras, y escribe las direcciones (`EXTRACT_URL`, `ENDPOINT`) ahí y no en el repositorio.
- Cabeceras para Cloudflare Pages (`deploy/_headers`) y guía de despliegue en `docs/despliegue.md`.

### Cambiado
- **Cada pantalla cabe en la ventana sin desplazarse**, desde celulares de 360 x 640 hasta laptops de 1366 x 650; solo la rendición final se desplaza, porque se lee con calma. El alto de Chaski, los espacios y las piezas se ajustan al alto disponible.
- **Las tarjetas de lo que Chaski entendió son más descriptivas:** cada una trae su nombre y una línea neutra de qué trata (por ejemplo, «Sube y baja: qué pasa si una sube y la otra baja»), sin decir si Chaski la sabe bien.
- **La burbuja «Lo que le enseñaste» no tapa el botón:** deja pasar los clics, se cierra con Escape y al escribir.
- **La rendición muestra el enunciado completo** cuando la pregunta sola no basta (en Ecuaciones, «¿Cuánto vale x?» no decía cuál era la ecuación).
- Tras «¡Alto, Chaski!», la frase es neutra y no sugiere si el estudiante acertó. «Enseñarle: …» después de la rendición nombra la idea en la que Chaski se equivocó.
- El panel escribe las señales de originalidad con palabras («Texto pegado», «No relaciona las cantidades») y explica la escala de dependencia (de 0, revisa todo, a 1, confía a ciegas).
- La lectura con el modelo reintenta una vez si falla la conexión o Google responde con un error 5xx, dentro del mismo plazo de 10 segundos. Los fallos de conexión y de Google quedan en el registro del servidor con su tipo (nunca con el texto del estudiante).
- Tope por defecto de envíos de partidas por IP: 1 200 cada 10 minutos (un colegio entero comparte una IP y ahora se envía con más frecuencia).
- La salida de Chaski al dejar pasar un problema ya no cruza la zona de la tarea: se recorta en su columna y se desvanece.
- **La lectura con el modelo corre dentro de Cloudflare Pages** como Pages Function (`functions/extract.ts`): un solo proyecto, sin Worker aparte ni CORS. En el empaquetado, `EXTRACT_URL` acepta una ruta del mismo sitio y, en Pages, `/extract` se usa sola. `zod` pasa a la raíz. El Worker independiente sigue disponible.
- **El servidor lee con Google Gemini** en lugar de Anthropic. Llama a `generateContent` con `fetch`, sin SDK (el paquete bajó de 1,7 MiB a 779 KiB). Secreto `GEMINI_API_KEY`; modelo por defecto `gemini-3.5-flash-lite`. El juego no cambió.
- **Nueva dirección visual: textil andino de día.** Paneles de tela, paisaje en tres momentos del día, y un Chaski con más carácter. Sin morado: contornos y textos en cacao, y cielos de azul a coral y oro.
- **La indicación se lee primero:** va en una placa oscura con letras claras, y las instrucciones de repaso van en tarjetas y no sueltas sobre el paisaje.
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
- Examen de Chaski, examen sin Chaski y día 2. El piloto ya no mide retención.

## [0.1.0] - 2026-10-30

### Agregado
- Primera versión: errores escritos en el guion para proporciones, examen y día 2. Reemplazada por la 0.2.0.
