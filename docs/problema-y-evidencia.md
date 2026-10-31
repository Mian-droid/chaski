# Problema, evidencia y caso de negocio

Respaldo del README. Aquí está lo que sabemos, de dónde sale y qué falta. Las cifras del reto vienen del documento oficial del DSC Hack 2026 («Educación 2036»). Los estudios vienen de un informe de búsqueda académica (LeapSpace, 31/10/2026) y **no los hemos leído completos ni verificado en Scopus**: se citan como señales, no como pruebas.

## 1. La grieta: «Aprender sin pensar» (Grieta 02)

Reto: elegir una grieta educativa que ya existe en el Perú, argumentar por qué crecerá hacia 2036 y construir una solución de software.

### Qué se sabe hoy

| Dato | Fuente | Cuidado al usarlo |
|---|---|---|
| Matemática, PISA 2025: Perú 382 puntos (391 en 2022, 387 en 2015); la OCDE ronda 463–465 según el medio. Caída de 9 puntos desde 2022 | PISA 2025 (OCDE, publicado 08/09/2026), vía Forbes Perú y La Cámara de Comercio de Lima | Cifras de prensa, no del informe de la OCDE/Minedu. El promedio OCDE difiere entre medios (463 vs 465) |
| Solo 30 % de los estudiantes peruanos de 15 años alcanza el nivel mínimo (Nivel 2) en matemática, 42 % en lectura y 47 % en ciencia. Por debajo del mínimo en matemática: cerca de 70 % (complemento de 30 %; un medio da 69,5 %) | La Cámara de Comercio de Lima, sobre PISA 2025 | El complemento es nuestro cálculo. En 2022 fue 66 % por debajo (34 % en el nivel mínimo o más, nota país OCDE) |
| Por debajo del mínimo en matemática: 76 % en 13 países de América Latina frente a 35 % en la OCDE. Perú, Argentina, Guatemala y Chile bajaron más de 8 puntos desde 2022 | Blog del Banco Mundial sobre PISA 2025 | La tabla por país del blog es una imagen que no leímos |
| Tras consultar a más de 500 personas en 50 países, Brookings concluye que hoy los riesgos de la IA generativa para los estudiantes superan sus beneficios | Burns, Winthrop et al., Brookings (enero 2026), citado en el documento del reto | Lo conocemos solo por el documento del reto, no leímos el informe |
| El 22 % de los docentes de secundaria tiene 55 años o más. De unos 430 mil docentes públicos, más de 87 mil pasaron por capacitación en IA | OCDE, *Education at a Glance 2026*, y GRADE, vía Gestión (19/10/2026); Minedu, vía La República (05/07/2026) | Son de la Grieta 03 del reto. Muestran que el docente no puede cubrir solo el uso de la IA |
| La evidencia peruana sobre IA en educación se concentra en universidades. Sobre secundaria casi no hay: el ejemplo más claro es un piloto de 2025 en un colegio privado de Lima, con limitaciones (no lo leímos completo) | Informe LeapSpace, que cita a Iglesias et al. (2025) | Es una ausencia de evidencia en lo que se buscó, no una prueba de que no exista |
| Estabilidad de internet: 78 % en zonas urbanas frente a 35 % en rurales | Prado Palomino et al. (2025), citado en el informe LeapSpace | Condiciona dónde puede llegar una herramienta con IA |

**Por qué PISA importa a Chaski.** Los tres temas del juego son matemática de secundaria: justo donde el Perú rinde peor y cae. No usamos el puesto en el ranking (Forbes dice 66, La Cámara 68).

**Evidencia peruana en secundaria** (el informe LeapSpace tiene errores, así que solo citamos lo contrastado por otra revisión):

- **Los Olivos (Lima), Revista Conrado 2026:** 288 estudiantes de secundaria (población 1.148), cuestionario de 24 ítems, Rho = 0,782 entre uso de IA y pensamiento crítico. Es **correlacional y autorreportado**: no mide aprendizaje, aunque los autores concluyen que el uso guiado lo «fortalece». Un jurado puede usarlo en contra.
- **Chiclayo, Int. J. of Special Education 2026:** cuasi-experimento en 2.º de secundaria de un colegio público, con herramientas de IA para aprendizaje autónomo. Solo vimos el planteamiento; **verificar los resultados** antes de citarlo.
- **Estrada-Araoz et al. 2024:** encuesta a docentes peruanos de educación básica, con conocimiento solo parcial de la IA.
- **Iglesias et al. 2025** (chatbot en secundaria, Lima): reporta resultados con limitaciones. No lo leímos completo.

No citar sin leer: Soto et al. 2025 (predictor de bajo logro en matemática) y Tomaylla-Quispe et al. 2026. Castillo-Montalván y Saavedra (2024) y Pereda et al. (2025) son revisiones de literatura, no miden estudiantes peruanos.

**Errores del informe LeapSpace:** presenta Iglesias como «evaluación planificada» (no lo es); la ref. 48 es un artículo sobre oleoductos; varios «obstáculos regionales» salen de estudios universitarios o empresariales; la etiqueta «confianza alta» es de la herramienta, no de la calidad; y no incluye Bastani (PNAS) ni PISA 2025, así que su titular «cautelosamente positivo» está sesgado por el corpus.

**Si el jurado pregunta por la correlación de Los Olivos:** es una correlación de autorreportes y no mide aprendizaje. Los ensayos con medición independiente (Bastani) muestran que la IA sin salvaguardas daña el aprendizaje y con ellas lo mitiga. Chaski es del segundo tipo.

**No tenemos una cifra de uso de IA en escolares peruanos.** No la inventamos. La búsqueda no encontró una; queda como pendiente (INEI, Minedu).

### Qué dice la evidencia sobre el efecto de la IA al estudiar

Todo viene del informe LeapSpace. Son estudios de otros países o de universitarios, por lo que la transferencia a secundaria peruana es una hipótesis.

- Las ganancias de aprendizaje **dependen de cómo se usa**, no de que se use. Dos metaanálisis de estudios experimentales (Han et al. 2025; Deng et al. 2025) y varias revisiones coinciden en que el diseño pedagógico importa más que la herramienta.
- En un estudio con estudiantes de noveno grado, un asistente de escritura con IA mejoró la calidad de los textos y el compromiso en la revisión, pero los autores advierten que el exceso de dependencia puede reducir la expresión creativa y el pensamiento crítico (Wang et al. 2026).
- La frecuencia de uso por sí sola no se relacionó con el pensamiento crítico. El beneficio apareció cuando se usó la IA para reflexionar (Zhang y Liu 2025, universitarios).
- En un programa técnico de secundaria, el uso excesivo puede frenar las habilidades de base (Annuš 2025).
- Estudiantes de secundaria usan la IA con tensiones de autenticidad en la escritura reflexiva (Chan y Lee 2025).
- Con la IA en las tareas aparece un problema de transparencia: uso amplio con declaración inconsistente (Oré Gálvez et al. 2026, universitarios del Perú).

Pendientes de verificar antes de citarlos en el pitch: Bastani et al. (PNAS, casi mil escolares; la práctica con un GPT sin restricciones rindió más en la práctica y menos en el examen sin IA) y Kestin et al. (Harvard, tutor de IA en física). Los conocemos de memoria.

### Por qué crece hacia 2036

1. **El acceso solo aumenta**, pero las tareas y los exámenes siguen diseñados para un mundo sin IA (argumento del reto).
2. **La regulación va detrás de la práctica.** El informe LeapSpace no encontró guías oficiales del sistema escolar peruano sobre IA para secundaria (en lo que buscó). Sin reglas, el uso ocurre sin acompañamiento.
3. **El docente no alcanza.** Con una generación que se jubila y poca formación en IA (datos del reto), la mediación del docente, que es lo que mejor funciona según la evidencia, escala mal.
4. **La brecha de acceso** hace que, mientras los colegios mejor equipados experimentan, otros quedan atrás.

### Lo que entendimos y no es obvio

El problema no es el acceso a la IA ni el plagio. Es la **ilusión de aprender**: la respuesta de la IA es fluida, el estudiante la lee, la entiende y siente que aprendió, como al subrayar. Un detector de textos hechos con IA no lo arregla, porque quien no copió también puede no haber aprendido. Chaski no combate la IA: la usa para pedir al estudiante que **produzca** la explicación y **verifique** a una máquina que se equivoca con seguridad.

El reto lista cuatro intentos que no alcanzan. Cómo nos ubicamos:

| Intento que «no alcanza» | Chaski |
|---|---|
| Chatbot que da respuestas | No responde. El estudiante enseña y revisa |
| Detector de textos hechos con IA | No acusa. Marca señales (pegado, texto copiado) y las muestra al docente como señal, no como juicio |
| Bolsa de trabajo | No aplica |
| ChatGPT con otro nombre y otro color | El modelo solo **lee** la explicación. Quien resuelve son fichas deterministas, y el error es el que produce lo que el estudiante enseñó |

## 2. Fundamento pedagógico

- **Aprender enseñando (efecto protégé) y autoexplicación.** Se aprende más al preparar una explicación para otro. Referente académico: Betty's Brain (Biswas et al.), agentes enseñables. *Por verificar en Scopus antes de citar.*
- **Práctica de recuerdo e ilusiones de competencia.** Releer o ver la solución da sensación de saber sin que sea cierto; explicar sin mirar lo destapa. La evidencia sólida está en las técnicas (práctica de recuerdo, repetición espaciada; revisión de Dunlosky et al. 2013, *por verificar*), no en cursos concretos.
- **Referente de producto: Boots Interview (Boot.dev).** El tutor-mascota cambia de rol: en vez de explicar, pregunta, y el estudiante debe producir la respuesta antes de recibir ayuda. De ahí tomamos que **producir antes de ayudar** es lo contrario de una IA genérica. Chaski va más allá: el estudiante no responde preguntas de un tutor, sino que **enseña** y revisa a un alumno que se equivoca con seguridad. Lección de la página pública: [boot.dev](https://www.boot.dev/lessons/dcafd50a-c53f-4a1a-8677-faf551ce4568) (la pregunta exacta no se ve sin iniciar sesión).

## 3. Usuario, cliente y propuesta de valor

| Quién | Qué obtiene |
|---|---|
| **Usuario:** estudiante de secundaria (más adelante, universitario) | Aprende de forma activa; gana confianza al lograr explicar y detectar errores |
| **Cliente (hipótesis):** colegio | Evidencia de qué entienden y qué ideas se dejan pasar, en un panel por clase |
| **Quién decide la compra** | **Sin definir.** Puede ser dirección o coordinación académica. Falta hablar con docentes y directivos |

Por qué secundaria: los hábitos de estudio aún se forman y el uso de IA para tareas crece rápido. El contenido actual es matemática de secundaria (proporciones, porcentajes, ecuaciones de primer grado), con soles y contextos peruanos. El grado exacto de cada tema debe confirmarlo un docente.

## 4. Adaptación al contexto peruano

- Página web liviana, pensada para celular, sin instalar nada ni crear cuentas (apodo y código de clase).
- Si falla el modelo o no hay conexión con él, Chaski lee con reglas de palabras y el juego sigue. Los datos se guardan en el dispositivo y, si hay conexión, se envían a la base.
- Con conectividad débil sigue haciendo falta cargar la página una vez. **No** es una aplicación sin conexión; no lo prometemos.
- Contenido en español del Perú, con soles. Identidad propia: Chaski, el mensajero inca, y el paisaje andino.

## 5. El problema del «puente» con otro chatbot

El estudiante puede pasar la pregunta de Chaski a otro chatbot y pegar la respuesta. No se puede impedir del todo (basta un segundo dispositivo). El objetivo es que **hacerlo no sirva**.

**Qué hay hoy**
- Lo que enseña cada texto se limita a 400 caracteres.
- Se detecta el pegado y se registra, pero **no se bloquea**.
- Una señal de originalidad (heurística) marca textos cortos, frases copiadas de libro, repetidos o con los números del ejemplo. Es una señal, no un juicio.
- Las preguntas de seguimiento usan números nuevos y una pregunta libre («dímelo con otro ejemplo»).
- El error de Chaski sale de lo que se enseñó: si lo enseñado vino de otro chatbot y es correcto, Chaski acierta y el estudiante igual tiene que revisar (siempre hay un descuido de cálculo para atrapar).
- El juego no dice si acertó hasta el final.

**Qué falta** (hoja de ruta): turnos con tiempo limitado, repreguntas impredecibles, explicación por voz, uso en clase con supervisión del docente y un grupo de piloto que **sí** pueda usar un chatbot para medir el efecto del puente en vez de suponerlo.

## 6. Caso de negocio (hipótesis)

Nada de esto está validado. Es el plan que queremos poner a prueba.

- **B2B (principal):** licencia anual por colegio, con el panel docente incluido.
- **B2C (futuro):** gratuito con funciones de pago para el estudiante.
- **Hipótesis a validar:** el colegio paga si ve evidencia de que sus estudiantes entienden más y verifican mejor. Es la hipótesis más débil y la primera por probar con docentes y directivos.
- **Costos:** el sitio corre en el plan gratuito de Cloudflare Pages. La lectura con el modelo (Gemini, modelo ligero) cuesta del orden de centavos o menos por lectura: **estimado, no medido**. Hay topes de uso por IP y por día para acotar el gasto.
- **Sostenibilidad:** al ser una página estática y un solo servidor liviano, el costo de operar un piloto es bajo. Los temas nuevos se agregan con un archivo de contenido ([contenido-de-temas.md](contenido-de-temas.md)), sin tocar el código del juego.

## 7. Validación

**Estado:** este repositorio no registra pruebas con usuarios reales. El registro formal de pruebas de uso va en la carpeta de evidencias que entrega la organización del DSC Hack, no aquí.

**Qué mide el piloto hoy:** detección de errores, falsas alarmas, ideas bien enseñadas, originalidad de lo escrito y respuestas a preguntas nuevas (ver [Métricas](../README.md#métricas-del-piloto)). **No mide aprendizaje ni retención:** el 30 de octubre el equipo quitó el examen sin Chaski y el día 2.

**Hallazgo de uso: explicar solo con texto es una barrera.** Una persona que probó el piloto señaló que la mayor complicación fue explicar únicamente con texto: toma más tiempo y puede generar malentendidos entre el estudiante y la IA. Sugirió permitir también una explicación gráfica de lo que se quiere enseñar. Es una observación informal de un caso, sin registro ni medición; la tomamos como hipótesis por probar, no como resultado.

- **Por qué importa.** Si el estudiante no logra decir lo que sabe, Chaski lee una idea distinta o ninguna, y el error que se le atribuye no es del concepto sino del medio. Eso ensucia la métrica de «ideas bien enseñadas». El riesgo es mayor en matemática (proporciones, porcentajes, ecuaciones), donde muchos estudiantes piensan en esquemas antes que en frases, y con estudiantes que escriben poco o con dificultad.
- **Propuesta.** Agregar, junto a la tablilla de texto, un modo de explicar con un esquema. Dos variantes por comparar:
  - *Esquema con piezas del tema* (barra dividida en partes, tabla de proporción, balanza para ecuaciones): el estudiante arma y rotula. Se convierte de forma determinista en texto estructurado, y las fichas se rellenan como hoy, con una cita que sale de lo producido. Conserva «el modelo solo lee; las fichas resuelven», no envía imágenes y evita datos personales.
  - *Dibujo libre* (lienzo): más expresivo, pero exige que un modelo con visión lea la imagen. Eso cambia la privacidad (se envía una imagen de un menor a un servicio externo), el costo y la fiabilidad, y no hay forma de exigir una cita verificable.
- **Se mantiene.** El estudiante sigue produciendo antes de recibir ayuda. El gráfico complementa al texto, no lo reemplaza: se puede combinar, y la señal de originalidad debe adaptarse (un esquema no se «pega» como un texto).
- **Cómo saber si funciona.** Comparar texto solo contra texto más esquema, con las mismas métricas (ideas bien enseñadas, detección, tiempo hasta terminar de enseñar) y observación cualitativa de malentendidos. Ver el diseño de validación de abajo.

**Diseño propuesto para una validación mayor**
- Tres grupos: (A) estudia con un asistente que da respuestas, (B) enseña a Chaski, (C) usa Chaski con acceso libre a un chatbot.
- Mismo test sin ayuda al día siguiente y a los 7 días. Métrica principal: retención, no satisfacción.
- Con grupos de 2 o 3 estudiantes solo hay lectura cualitativa («primeras señales»), no conclusiones estadísticas.
- Con menores: siempre con un adulto responsable presente y sin datos personales.

## 8. Hoja de ruta

1. Probar con estudiantes y docentes reales y ajustar fichas, problemas y lenguaje.
2. Probar la lectura con el modelo de punta a punta (`worker/scripts/live-test.mjs`) y medir su costo y tiempo reales.
3. **Chaski curioso:** que haga preguntas de alumno («¿y si el número fuera más grande?») y repregunte de forma dinámica.
4. **Chaski olvida:** a los 3 o 7 días olvida el concepto y el estudiante debe volver a enseñarlo. Suma repetición espaciada y da al panel una medida de retención.
5. **Explicación gráfica:** esquemas con piezas del tema (y, después, dibujo libre) como alternativa o complemento del texto. Ver [Hallazgo de uso](#7-validación).
6. Explicación por voz y sonido.
7. Más temas y otras áreas, alineados al Currículo Nacional.
8. Panel como mapa de comprensión: qué idea no domina el grupo (el panel ya muestra las ideas que más se dejan pasar).

## 9. Pendientes

- [ ] Cifra de uso de IA en escolares peruanos, con fuente (INEI, Minedu). Si no existe, decirlo.
- [ ] Verificar en Scopus: efecto protégé, autoexplicación, Betty's Brain, Dunlosky et al. (2013), Bastani et al., Kestin et al., el informe de Brookings y las cifras PISA 2025 contra el informe de la OCDE/Minedu (UMC).
- [ ] Hablar con docentes y directivos sobre quién compra y cuánto pagaría.
- [ ] Definir con un docente el grado de cada tema y revisar fichas y lenguaje.
- [ ] Confirmar con más estudiantes y docentes que el texto solo es una barrera, y qué formas de explicar prefieren (esquema, dibujo, voz).
- [ ] Decidir esquema con piezas o dibujo libre, y qué implica para privacidad (imágenes de menores), costo y lectura con el modelo.
- [ ] Definir permiso de tutores y tiempo de conservación de los datos con la institución que aplique el piloto.

## Fuentes

- Documento de apoyo del reto DSC Hack 2026, «Educación 2036: las grietas que ya se ven».
- PISA 2025: [Forbes Perú (08/09/2026)](https://forbes.pe/actualidad/2026-09-08/el-peru-retrocede-una-decada-en-el-indice-pisa-al-registrar-niveles-similares-a-2015/); [La Cámara de Comercio de Lima](https://lacamara.pe/pronunciamiento-pisa-2025-una-alerta-que-el-peru-no-puede-ignorar/); [Banco Mundial](https://blogs.worldbank.org/es/latinamerica/pisa-2025-la-secundaria-es-donde-se-juega-el-futuro-de-esta-generacion). PISA 2022: [nota país Perú, OCDE](https://www.oecd.org/en/publications/pisa-2022-results-volume-i-and-ii-country-notes_ed6fbcc5-en/peru_3e71791c-en.html).
- Citadas en el documento del reto: Burns, Winthrop et al., «A New Direction for Students in an AI World», Brookings (enero 2026). OCDE, *Education at a Glance 2026*, y GRADE, vía Gestión (19/10/2026). Minedu, vía La República (05/07/2026).
- Informe de búsqueda LeapSpace (31/10/2026). De ahí salen los siguientes, con los DOI tal como aparecen en el informe:
  - Iglesias et al. (2025), chatbot generativo en secundaria, ICALTER: <https://doi.org/10.1109/ICALTER69698.2025.11355110>
  - Prado Palomino et al. (2025), brecha digital en el Perú: <https://doi.org/10.52080/rvgluz.30.especial14.37>
  - Wang et al. (2026), asistentes literarios de IA en noveno grado: <https://doi.org/10.1016/j.caeo.2026.100339>
  - Zhang y Liu (2025), pensamiento crítico: <https://doi.org/10.3390/educsci15080977>
  - Annuš (2025), programación en secundaria técnica: <https://doi.org/10.3390/educsci15091152>
  - Chan y Lee (2025), escritura reflexiva en secundaria: <https://doi.org/10.1016/j.compedu.2025.105399>
  - Han et al. (2025): <https://doi.org/10.1016/j.edurev.2025.100714> · Deng et al. (2025): <https://doi.org/10.1016/j.compedu.2024.105224>
  - Oré Gálvez et al. (2026): <https://doi.org/10.3390/su18125923>
  - Susanibar-Ramirez et al. (2026), cuestionario de uso de IA de docentes de matemática de secundaria en el Perú: <https://doi.org/10.3389/feduc.2025.1680330>
- Boot.dev, «Boots Interview»: <https://www.boot.dev/lessons/dcafd50a-c53f-4a1a-8677-faf551ce4568>
