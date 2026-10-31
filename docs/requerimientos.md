# Requerimientos de Chaski (versión 0.2)

Piloto exploratorio para la Grieta 02, «Aprender sin pensar», del DSC Hack 2026. Tres temas de matemática de secundaria, elegidos por el docente. Las pruebas automáticas que respaldan estos requerimientos están al final.

---

## 1. Criterios de diseño

| ID | Requerimiento |
|---|---|
| RC-01 | Con menores, jugar siempre con un adulto responsable presente y sin recoger datos personales. El juego pide marcar ambas cosas antes de empezar. |
| RC-02 | Evitar los cuatro intentos que el reto considera insuficientes (chatbot de respuestas, detector de IA, bolsa de trabajo, ChatGPT con otro nombre). Chaski no responde por el estudiante: hace que el estudiante explique y revise. |

---

## 2. Requerimientos funcionales

### 2.1 Estudiante

| ID | Requerimiento |
|---|---|
| RF-E01 | Entrar con un apodo (2 a 16 caracteres) y un código de clase (3 a 10), sin pedir nombre ni datos personales. |
| RF-E02 | Exigir marcar que está con un adulto responsable y que no escribirá datos personales. |
| RF-E03 | Jugar el tema que eligió el docente, indicado en el enlace (`?tema=`), y recibir el código de clase ya escrito (`?clase=`). Sin tema, usar proporciones. |
| RF-E04 | Enseñarle a Chaski respondiendo preguntas en una tablilla de texto, sin historial de chat: 2 lecciones guiadas y hasta 3 intervenciones extra. Cada texto admite hasta 400 caracteres. |
| RF-E05 | Ver una cuerda de nudos con una lección por nudo, y poder tocar un nudo para releer lo que se enseñó. |
| RF-E06 | Leer lo que explicó y rellenar tres fichas (una por idea del tema) como bien, mal o ausente, con una cita del texto como evidencia. |
| RF-E07 | Mostrar qué entendió Chaski sin nombrar las ideas que no se enseñaron, y qué fichas tienen algo cargado. |
| RF-E08 | Si la lectura por modelo falla o tarda más de 12 segundos, leer con reglas de palabras del tema, sin interrumpir el juego. |
| RF-E09 | Chaski resuelve 6 problemas usando solo sus fichas. Con la ficha bien: solución correcta. Con la ficha ausente o mal: el error típico de ese tema. |
| RF-E10 | Si todas las fichas están bien, Chaski comete un único descuido de cálculo, para que haya al menos un error que revisar. |
| RF-E11 | Por cada problema, elegir «Dejar pasar» o «¡Alto, Chaski!». |
| RF-E12 | Si detiene a Chaski, señalar el paso donde está el error, o indicar que no sabe en cuál, y teclear la respuesta correcta. |
| RF-E13 | No decir si acertó hasta el final de la ronda. |
| RF-E14 | Hacer 3 preguntas numéricas de seguimiento (con otros números) y 1 pregunta libre (otro ejemplo propio), antes de mostrar las reglas. |
| RF-E15 | Mostrar la rendición de cuentas: un sello por problema, el mensaje que llegó al Cusco con los errores que no se corrigieron, y por qué se equivocó Chaski (idea no enseñada, idea enseñada distinta, o descuido de cálculo). |
| RF-E16 | Permitir enseñarle de nuevo una vez, después de la rendición. |
| RF-E17 | Cerrar con un resumen: errores atrapados e ideas bien enseñadas. |
| RF-E18 | Retomar una sesión interrumpida con «Continuar donde me quedé». |
| RF-E19 | Guardar los resultados propios en un archivo JSON. |
| RF-E20 | Responder con un teclado numérico en pantalla y también con el teclado físico. |
| RF-E21 | Si la explicación fue tan vaga que Chaski no pudo entender nada, pedir una vez que se la expliquen de otra manera, con un ejemplo con números. No repreguntar cuando Chaski entendió algo mal. |
| RF-E22 | Mostrar un gráfico (tabla, barra de porcentaje o balanza) en los problemas que lo tienen, con los datos del enunciado y la incógnita marcada, sin revelar la respuesta. |
| RF-E23 | Avisar, antes de las preguntas de seguimiento, qué viene y que todavía no se dice cómo le fue a Chaski. |

### 2.2 Docente

| ID | Requerimiento |
|---|---|
| RF-D01 | Elegir entre los tres temas (proporciones, porcentajes, ecuaciones de primer grado) y obtener el enlace para los estudiantes, con la clase ya escrita. |
| RF-D02 | Copiar el enlace con un botón. |
| RF-D03 | Cargar los resultados desde el dispositivo, desde un archivo JSON o desde la base de datos del sitio (o la hoja de Google). |
| RF-D04 | Ver los resultados filtrados por tema y por clase. |
| RF-D05 | Ver el resumen: detección media, falsas alarmas, dependencia media e ideas bien enseñadas. |
| RF-D06 | Ver qué ideas de Chaski se dejaron pasar con más frecuencia, para retomarlas en clase. |
| RF-D07 | Ver una tabla por estudiante con detección, falsas alarmas, correcciones, seguimiento, textos débiles, pegados, dependencia e ideas bien. |
| RF-D08 | Leer las explicaciones de los estudiantes junto con las señales de originalidad. |
| RF-D09 | Descargar los resultados en CSV. |
| RF-D10 | Borrar del servidor los datos de una sala desde el panel. |
| RF-D11 | Ver las partidas de todas las salas, o de una, con el progreso de cada estudiante y si Chaski le repreguntó, y que el panel se actualice solo mientras está abierto. El código de clase es opcional al jugar. |

### 2.3 Sistema y contenido

| ID | Requerimiento |
|---|---|
| RF-S01 | Registrar cada evento (enseñanza, lectura del cerebro, problemas, preguntas) con apodo, clase, tema y hora. |
| RF-S02 | Guardar los eventos en el dispositivo y, opcionalmente, enviarlos a la base de datos del sitio (Cloudflare D1, ruta `/events`) o a una hoja de Google mediante un Apps Script. |
| RF-S03 | Leer la explicación con un modelo desde un servidor intermedio que guarda la clave como secreto y arma el prompt según el tema. |
| RF-S04 | Agregar un tema sin tocar la interfaz: un paquete en `js/content.js` y una definición en el servidor (ver [contenido-de-temas.md](contenido-de-temas.md)). |
| RF-S05 | Configurar sin tocar el código: dirección del servidor, dirección de la hoja, y si Chaski avisa que puede equivocarse. |

---

## 3. Requerimientos pedagógicos y de medición

| ID | Requerimiento |
|---|---|
| RP-01 | Los errores de Chaski salen de lo que el estudiante enseñó, no de errores fijos del guion. |
| RP-02 | Nunca debe enseñarse algo falso por accidente. Por eso la solución la calculan las fichas, y el modelo solo lee. |
| RP-03 | Una ficha solo puede quedar bien o mal si hay una cita textual del estudiante que la respalde. Si no, vuelve a ausente. |
| RP-04 | Chaski suena siempre seguro, sin dudar, aunque se equivoque. |
| RP-05 | Medir la detección de errores, las falsas alarmas y la discriminación (detección menos falsas alarmas). |
| RP-06 | Medir la calidad de enseñanza: cuántas fichas quedaron bien y cuántas mal. |
| RP-07 | Estimar si la explicación es propia: texto corto, copiado de frases de libro, repetido, con los mismos números del ejemplo, o pegado. Es una señal, no un juicio. |
| RP-08 | Calcular un índice de dependencia exploratorio (de 0 a 1). |
| RP-09 | Poder medir confianza a ciegas: la opción `ANNOUNCE_ERRORS` en `false` evita avisar que Chaski se equivoca. |
| RP-10 | Tres temas con las mismas tres ideas por tema y dos problemas por idea. |

---

## 4. Requerimientos no funcionales

| ID | Requerimiento |
|---|---|
| RNF-01 | Funcionar en un celular con navegador moderno, sin instalar nada, como página estática sin compilación. |
| RNF-02 | Verse bien en celular, tablet y laptop: el paisaje llena la pantalla y, en pantallas anchas, Chaski y la tarea se reparten en dos columnas centradas. |
| RNF-03 | Seguir funcionando si no hay conexión con el modelo. |
| RNF-04 | Esperar la lectura del modelo un máximo de 12 segundos desde el cliente y 10 desde el servidor. |
| RNF-05 | Leer como máximo 800 caracteres por lectura. El servidor rechaza los textos de menos de 8 o más de 800. |
| RNF-06 | Mantener la clave de Gemini solo en el servidor, como secreto y en una cabecera (nunca en la dirección). |
| RNF-07 | Aceptar solicitudes únicamente de la página del juego (`ALLOWED_ORIGINS`). |
| RNF-08 | Aceptar solo los temas de una lista cerrada, y no armar nunca el prompt con texto del cliente. |
| RNF-09 | Tratar el texto del estudiante como datos: se delimita en el mensaje y el modelo debe ignorar instrucciones escondidas. En pantalla se inserta siempre como texto, nunca como HTML. |
| RNF-10 | Accesibilidad básica: foco visible, etiquetas en los controles, respeto de la preferencia de reducir movimiento. |
| RNF-11 | Español de Perú, con soles como moneda. |
| RNF-12 | La tipografía del juego (Baloo 2 y Patrick Hand) se carga de Google Fonts. Sin conexión, usa una fuente del sistema. |
| RNF-13 | El fondo animado y el vuelo del texto respetan la preferencia de reducir movimiento. |
| RNF-14 | La lectura con el modelo corre como Cloudflare Pages Function (`functions/extract.ts`) o como Worker independiente, con el mismo código. |
| RNF-15 | Publicar solo el juego y el panel, sin pruebas, documentos ni servidor (`npm run build:site`). |
| RNF-16 | Leer y borrar datos de la base exige una clave (`PANEL_KEY`, en la cabecera `X-Panel-Key`, nunca en la dirección). Guardar solo se acepta de la página del juego, con un máximo de 100 eventos por envío, y cada evento se valida. |
| RNF-18 | Limitar el uso por IP (lecturas con el modelo y envíos de partidas) y el total diario de lecturas con el modelo, guardando solo una huella de la IP, y responder 429 sin romper el juego. |
| RNF-17 | Registrar los eventos en lotes y sin duplicados, con un índice por clase, y acotar la lectura a una clase por consulta. |

---

## 5. Datos, privacidad y ética

| ID | Requerimiento |
|---|---|
| RD-01 | No recoger nombre ni datos personales: solo apodo y código de clase. |
| RD-02 | Recordar al estudiante, en cada campo de texto libre, que no escriba datos personales. |
| RD-03 | Dejar claro, en el juego, que es un piloto exploratorio y no una evaluación con nota ni una prueba de efecto. |
| RD-04 | No enviar a terceros la dirección con el código de clase (referente hacia Google Fonts). |
| RD-05 | Avisar en el juego, antes de empezar, que lo escrito lo lee un servicio de inteligencia artificial, y enlazar a la política de privacidad y a los términos. |
| RD-06 | Publicar una política de privacidad (qué datos, para qué, con quién, cuánto tiempo, derechos y contacto), unos términos de uso y una autorización imprimible para madres, padres y tutores. |
| RD-07 | Excluir del buscador el panel docente y las rutas de datos (`robots.txt`). |

El permiso de los tutores y el tiempo de conservación de los datos corresponden a la institución o al docente que aplique el piloto; la autorización imprimible y el borrado por clase desde el panel facilitan ambos. Cuando se usa el modelo, el texto del estudiante se envía al servicio de Gemini; ver [despliegue.md](despliegue.md#privacidad-y-datos).

---

## 6. Fuera de alcance en esta versión

- Examen de Chaski, examen sin Chaski y día 2: el piloto describe cómo enseñan y revisan los estudiantes, y no mide retención ni aprendizaje.
- Cuentas de usuario e inicio de sesión.
- Más de tres temas, o que el docente cree temas desde la interfaz.
- Respuestas libres de Chaski o chat abierto con el modelo.
- Voz y sonido.
- Versión por WhatsApp.
- Escalas de medición validadas: el índice de dependencia es exploratorio.
- Limitador de uso por usuario en el servidor (el acceso se restringe por origen).

---

## 7. Pruebas automáticas

| Qué | Dónde | Pruebas |
|---|---|---|
| Contenido de los tres temas con cuentas verificadas de forma independiente, cerebro, lectura con reglas y con servidor simulado, originalidad y métricas | `tests/core.test.js` | 36 |
| Figuras de los problemas y detección de explicaciones vagas | `tests/figures.test.js` | 9 |
| Dibujo: el paisaje panorámico y los símbolos de Chaski | `tests/scenery.test.js` | 6 |
| Empaquetado del sitio: qué se publica, direcciones, referente, favicon, vista previa al compartir y páginas legales | `tests/build-site.test.js` | 18 |
| Servidor y funciones de Pages: lectura con el modelo y base de datos (validación, duplicados, clave del panel, lectura de todas las salas y de lo nuevo, borrado, topes de uso) | `worker/test/*.test.ts` | 39 |

`npm test` las corre todas.
