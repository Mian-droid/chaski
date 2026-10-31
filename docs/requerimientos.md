# Requerimientos de Chaski (versión 0.2)

Piloto exploratorio para la Grieta 02, «Aprender sin pensar», del DSC Hack 2026. Tres temas de matemática de secundaria, elegidos por el docente.

**Estado de cada requerimiento**
- **Probado:** se ejecutó en pruebas automáticas o en el navegador durante el desarrollo.
- **Implementado:** el código existe, pero no se ejecutó de punta a punta.
- **Pendiente:** no existe todavía o depende de algo que el equipo debe hacer.

Probar aquí significa pruebas con datos simulados y un jugador simulado. Ningún requerimiento se probó con estudiantes reales ni con un modelo real.

---

## 1. Requerimientos del reto

| ID | Requerimiento | Estado |
|---|---|---|
| RC-01 | Partir de un problema que ocurre hoy, con dato y fuente verificables. | Pendiente: verificar en Scopus las referencias antes de citarlas |
| RC-02 | Argumentar por qué el problema crece hacia 2036, mostrando qué lo empuja. | Pendiente: va en el pitch, no en el software |
| RC-03 | Estar desplegado y funcionando. | Pendiente: ni el juego ni el servidor están desplegados |
| RC-04 | Haberse probado con al menos una persona que vive el problema. | Pendiente |
| RC-05 | Si se valida con menores: siempre con un adulto responsable presente y sin recoger datos personales. | Implementado (aviso y casilla). La presencia del adulto la garantiza el equipo |
| RC-06 | Evitar los cuatro intentos que el jurado da por insuficientes (chatbot de respuestas, detector de IA, bolsa de trabajo, ChatGPT con otro nombre). | Cumple por diseño: Chaski no responde, hace que el estudiante revise y explique |

---

## 2. Requerimientos funcionales

### 2.1 Estudiante

| ID | Requerimiento | Estado |
|---|---|---|
| RF-E01 | Entrar con un apodo (2 a 16 caracteres) y un código de clase (3 a 10), sin pedir nombre ni datos personales. | Probado |
| RF-E02 | Exigir marcar que está con un adulto responsable y que no escribirá datos personales. | Probado |
| RF-E03 | Jugar el tema que eligió el docente, indicado en el enlace (`?tema=`), y recibir el código de clase ya escrito (`?clase=`). Sin tema, usar proporciones. | Probado |
| RF-E04 | Enseñarle a Chaski en un chat de texto: 2 mensajes guiados y hasta 3 intervenciones extra. Cada mensaje admite hasta 400 caracteres. | Probado |
| RF-E05 | Leer lo que explicó y rellenar tres fichas (una por idea del tema) como bien, mal o ausente, con una cita del texto como evidencia. | Probado con reglas de palabras y con un modelo simulado. Modelo real: pendiente |
| RF-E06 | Mostrar qué entendió Chaski sin nombrar las ideas que no se enseñaron, y qué fichas tienen algo cargado. | Probado |
| RF-E07 | Si la lectura por modelo falla o tarda más de 12 segundos, leer con reglas de palabras del tema, sin interrumpir el juego. | Probado |
| RF-E08 | Chaski resuelve 6 problemas usando solo sus fichas. Con la ficha bien: solución correcta. Con la ficha ausente o mal: el error típico de ese tema. | Probado |
| RF-E09 | Si todas las fichas están bien, Chaski comete un único descuido de cálculo, para que haya al menos un error que revisar. | Probado |
| RF-E10 | Por cada problema, elegir «Dejar pasar» o «¡Alto, Chaski!». | Probado |
| RF-E11 | Si detiene a Chaski, señalar el paso donde está el error, o indicar que no sabe en cuál, y teclear la respuesta correcta. | Probado |
| RF-E12 | No decir si acertó hasta el final de la ronda. | Probado |
| RF-E13 | Hacer 3 preguntas numéricas de seguimiento (con otros números) y 1 pregunta libre (otro ejemplo propio), antes de mostrar las reglas. | Probado |
| RF-E14 | Mostrar la rendición de cuentas: un sello por problema, el mensaje que llegó al Cusco con los errores que no se corrigieron, y por qué se equivocó Chaski (idea no enseñada, idea enseñada distinta, o descuido de cálculo). | Probado |
| RF-E15 | Permitir enseñarle de nuevo una vez, después de la rendición. | Probado |
| RF-E16 | Cerrar con un resumen: errores atrapados e ideas bien enseñadas. | Probado |
| RF-E17 | Retomar una sesión interrumpida con «Continuar donde me quedé». | Probado |
| RF-E18 | Guardar los resultados propios en un archivo JSON. | Implementado |
| RF-E19 | Responder con un teclado numérico en pantalla y también con el teclado físico. | Probado |

### 2.2 Docente

| ID | Requerimiento | Estado |
|---|---|---|
| RF-D01 | Elegir entre los tres temas (proporciones, porcentajes, ecuaciones de primer grado) y obtener el enlace para los estudiantes, con la clase ya escrita. | Probado |
| RF-D02 | Copiar el enlace con un botón. | Implementado |
| RF-D03 | Cargar los resultados desde el dispositivo, desde un archivo JSON o desde la hoja de Google. | Archivo: probado. Dispositivo: probado. Hoja: implementado, sin desplegar |
| RF-D04 | Ver los resultados filtrados por tema y por clase. | Probado |
| RF-D05 | Ver el resumen: detección media, falsas alarmas, dependencia media e ideas bien enseñadas. | Probado |
| RF-D06 | Ver qué ideas de Chaski se dejaron pasar con más frecuencia, para retomarlas en clase. | Probado |
| RF-D07 | Ver una tabla por estudiante con detección, falsas alarmas, correcciones, seguimiento, textos débiles, pegados, dependencia e ideas bien. | Probado |
| RF-D08 | Leer las explicaciones de los estudiantes junto con las señales de originalidad. | Probado |
| RF-D09 | Descargar los resultados en CSV. | Implementado |

### 2.3 Sistema y contenido

| ID | Requerimiento | Estado |
|---|---|---|
| RF-S01 | Registrar cada evento (enseñanza, lectura del cerebro, problemas, preguntas) con apodo, clase, tema y hora. | Probado |
| RF-S02 | Guardar los eventos en el dispositivo y, opcionalmente, enviarlos a una hoja de Google mediante un Apps Script. | Dispositivo: probado. Hoja: implementado, sin desplegar |
| RF-S03 | Leer la explicación con un modelo desde un servidor intermedio que guarda la clave como secreto y arma el prompt según el tema. | Implementado. Probado solo con un modelo simulado |
| RF-S04 | Agregar un tema sin tocar la interfaz: un paquete en `js/content.js` y una definición en el servidor. | Implementado. Ver docs/contenido-de-temas.md |
| RF-S05 | Configurar sin tocar el código: dirección del servidor, dirección de la hoja, y si Chaski avisa que puede equivocarse. | Implementado |

---

## 3. Requerimientos pedagógicos y de medición

| ID | Requerimiento | Estado |
|---|---|---|
| RP-01 | Los errores de Chaski deben salir de lo que el estudiante enseñó, no de errores fijos del guion. | Probado |
| RP-02 | Nunca debe enseñarse algo falso por accidente. Por eso la solución la calculan las fichas, y el modelo solo lee. | Probado por diseño y en pruebas |
| RP-03 | Una ficha solo puede quedar bien o mal si hay una cita textual del estudiante que la respalde. Si no, vuelve a ausente. | Probado en el servidor con un cliente simulado |
| RP-04 | Chaski debe sonar siempre seguro, sin dudar, aunque se equivoque. | Probado |
| RP-05 | Medir la detección de errores y las falsas alarmas, y la discriminación (detección menos falsas alarmas). | Probado |
| RP-06 | Medir la calidad de enseñanza: cuántas fichas quedaron bien y cuántas mal. | Probado |
| RP-07 | Estimar si la explicación es propia: texto corto, copiado de frases de libro, repetido, con los mismos números del ejemplo, o pegado. | Probado. Es una señal, no un juicio |
| RP-08 | Calcular un índice de dependencia exploratorio (de 0 a 1). | Probado. Sin validar |
| RP-09 | Poder medir confianza a ciegas: la opción `ANNOUNCE_ERRORS` en `false` evita avisar que Chaski se equivoca. | Implementado |
| RP-10 | Tres temas con las mismas tres ideas por tema y dos problemas por idea. | Probado |

---

## 4. Requerimientos no funcionales

| ID | Requerimiento | Estado |
|---|---|---|
| RNF-01 | Funcionar en un celular con navegador moderno, sin instalar nada, como página estática sin compilación. | Probado en vista móvil emulada de 375 × 812. Sin dispositivos reales |
| RNF-02 | Seguir funcionando si no hay conexión con el modelo. | Probado |
| RNF-03 | Esperar la lectura del modelo un máximo de 12 segundos desde el cliente y 20 desde el servidor. | Implementado. No se midió el tiempo real |
| RNF-04 | Leer como máximo 800 caracteres por lectura. El servidor rechaza los textos de menos de 8 o más de 800. | Probado. Dos mensajes largos pueden quedar cortados |
| RNF-05 | Mantener la clave de Anthropic solo en el servidor, como secreto. | Probado por diseño |
| RNF-06 | Aceptar solicitudes únicamente de la página del juego (`ALLOWED_ORIGINS`). | Implementado. Hoy permite cualquier origen |
| RNF-07 | Aceptar solo los temas de una lista cerrada, y no armar nunca el prompt con texto del cliente. | Probado |
| RNF-08 | Tratar el texto del estudiante como datos: se delimita en el mensaje y el modelo debe ignorar instrucciones escondidas. En pantalla se inserta siempre como texto, nunca como HTML. | Probado con un modelo simulado. Con el real: pendiente |
| RNF-09 | Limitar el uso del servidor por origen o dirección para controlar el gasto. | Pendiente |
| RNF-10 | Accesibilidad básica: foco visible, etiquetas en los controles, respeto de la preferencia de reducir movimiento. | Implementado. Sin probar con lector de pantalla |
| RNF-11 | Español de Perú, con soles como moneda. | Implementado. Sin revisión de un docente |
| RNF-12 | Pruebas automáticas del núcleo (36), del empaquetado del sitio (5) y del servidor (14). | Probado: las 55 pasan |
| RNF-14 | Empaquetar el servidor como Cloudflare Worker y arrancarlo en el runtime de Workers. | Probado en local (workerd) con una clave falsa. Sin desplegar |
| RNF-15 | Publicar solo el juego y el panel, sin pruebas, documentos ni servidor. | Probado (`npm run build:site`) |
| RNF-13 | La tipografía del juego se carga de Google Fonts. Sin conexión, usa una fuente del sistema. | Implementado |

---

## 5. Datos, privacidad y ética

| ID | Requerimiento | Estado |
|---|---|---|
| RD-01 | No recoger nombre ni datos personales: solo apodo y código de clase. | Implementado |
| RD-02 | Recordar al estudiante, en cada campo de texto libre, que no escriba datos personales. | Implementado |
| RD-03 | Definir con el docente cómo se informa y se obtiene el permiso de los tutores antes de jugar con menores. | Pendiente |
| RD-04 | Definir cuánto tiempo se guardan los datos y quién puede borrarlos. | Pendiente |
| RD-05 | Aclarar que el texto del estudiante se envía a un servicio externo cuando se usa el modelo. | Pendiente |
| RD-06 | Dejar claro, en el juego y en el pitch, que es un piloto exploratorio y no una evaluación con nota ni una prueba de efecto. | Implementado en el juego |
| RD-07 | No enviar a terceros la dirección con el código de clase (referente hacia Google Fonts). | Probado |

---

## 6. Fuera de alcance en esta versión

- Examen de Chaski, examen sin Chaski y día 2 (se quitaron por decisión del equipo el 30 de octubre de 2026). No se mide retención ni aprendizaje.
- Cuentas de usuario e inicio de sesión.
- Más de tres temas, o que el docente cree temas desde la interfaz.
- Respuestas libres de Chaski o chat abierto con el modelo.
- Voz y sonido.
- Versión por WhatsApp.
- La escala AE-AI de Dai et al. 2026. Hay que obtener sus ítems del artículo, sin inventarlos.

---

## 7. Pendientes ordenados por urgencia

| # | Pendiente | Responde a |
|---|---|---|
| 1 | Desplegar el juego y el panel como páginas estáticas (Cloudflare Pages: ver docs/despliegue.md). | RC-03 |
| 2 | Desplegar el servidor intermedio, guardar la clave como secreto, poner su dirección en `EXTRACT_URL` y limitar `ALLOWED_ORIGINS` a la dirección del juego. | RC-03, RF-S03, RNF-06 |
| 3 | Correr `worker/scripts/live-test.mjs` con una clave real y ajustar el prompt de cada tema si algún caso no coincide. | RF-E05, RNF-08 |
| 4 | Jugar con al menos una persona que viva el problema (estudiante o docente), con un adulto presente, y anotar qué dijo, qué hizo y qué cambió. | RC-04 |
| 5 | Pedir a un docente que revise los tres temas: ideas, problemas, errores típicos, grado en que se enseñan y lenguaje. | RNF-11, RP-10 |
| 6 | Probar en un celular real: continuar sesión, descargar resultados y el panel con datos de varias personas. | RF-E17, RF-E18, RF-D03 |
| 7 | Verificar en Scopus las referencias del documento de apoyo y las que propuso Scopus AI, antes de citarlas. | RC-01 |
| 8 | Definir permiso de tutores, retención de datos y el aviso sobre el servicio externo. | RD-03 a RD-05 |
| 9 | Añadir un limitador de uso al servidor. | RNF-09 |
