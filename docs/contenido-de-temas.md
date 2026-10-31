# Cómo agregar un tema

Cada tema es un paquete en `js/content.js` más una definición en `worker/src/topics.ts`. No hay que tocar la interfaz.

## Qué necesita un tema

Tres ideas (fichas) que se puedan enseñar bien o mal, y por cada una un error típico que produzca una respuesta equivocada pero plausible. Buenos candidatos son los errores que los docentes reconocen de inmediato (por ejemplo, sumar el 8 sin cambiar de signo en `x + 8 = 20`).

Requisitos de los problemas:
- La respuesta es **un solo número positivo**: el teclado del juego no tiene signo menos y la respuesta se compara numéricamente.
- La respuesta equivocada de Chaski puede ser decimal, grande o absurda; es mejor si la absurdez es una pista para el estudiante (por ejemplo, «7,5 estudiantes»).
- Cada problema necesita una solución correcta y una equivocada con **el mismo número de pasos**, y el error debe estar en un paso concreto.

## 1. Paquete en `js/content.js`

Agrega un objeto como los existentes (`proporciones`, `porcentajes`, `ecuaciones`) y regístralo en `topics`.

```js
var mitema = {
  meta: { id: 'mitema', title: 'Mi tema', about: 'mi tema', level: 'Secundaria' },
  cards: {                          // K1, K2, K3
    K1: { short: 'Corto', title: 'Título de la idea', text: 'Explicación correcta, con un ejemplo.',
          belief: { bien: 'lo que Chaski entendió si se enseña bien', mal: 'lo que entendió si se enseña mal' } },
    // K2, K3 igual
  },
  problems: index([                 // p1 a p6: dos por ficha
    prob('p1', 'K1', 'Enunciado.', 12 /* respuesta */,
      ['Paso 1.', 'Paso 2.', 'Cuenta final.'],                       // solución correcta
      [['Paso 1.', 'Paso 2 con el error típico.', 'Cuenta final.'], 28 /* lo que dice Chaski */, 1 /* paso con el error */],
      [['Paso 1.', 'Paso 2.', 'Cuenta con descuido.'], 13, 2]),      // opcional: descuido de cálculo, siempre en la última cuenta
    // p2 a p6
  ]),
  round: ['p1', 'p2', 'p3', 'p4', 'p5', 'p6'],   // orden de la ronda; conviene alternar fichas
  slipOrder: ['p2', 'p6', 'p4'],                 // problemas con descuido, por prioridad (deben tener la variante `slip`)
  teach: [ /* dos mensajes guiados: definición y ejemplo con números */ ],
  probes: probes([ ['pr1', 'K1', 'Pregunta con otros números.', 9], /* pr2, pr3 */ ], 'Pregunta libre.'),
  refs: [ /* frases de libro, normalizadas, para detectar texto copiado */ ],
  heuristics: { K1: { bien: /regex/, mal: /regex/ }, K2: { bien: /regex/ }, K3: { bien: /regex/ } }
};
```

Notas:
- Las expresiones de `heuristics` se aplican a texto en minúsculas y sin tildes. Sirven de respaldo sin conexión, así que basta con cubrir las formas más comunes de decirlo.
- `slipOrder` debe listar problemas que tengan la variante `slip`; una prueba lo verifica.
- Un problema puede llevar un gráfico con `fig(prob(...), spec)`. `spec` es `{ type: 'table', rows: [['Cuadernos', '2', '8'], ['Soles', '6', '?']] }`, `{ type: 'bar', pct: 20, whole: '150', part: '?', unit: 'estudiantes' }` o `{ type: 'balance', left: 'x + 8', right: '20' }`. Solo debe mostrar datos del enunciado y marcar con `?` lo que se pregunta; una prueba lo verifica.

## 2. Definición en el servidor

En `worker/src/topics.ts`, agrega el identificador a `TOPIC_IDS` y una entrada en `TOPICS` con, para cada ficha, cuándo está «bien» y cuándo «mal». Las fichas deben llamarse igual que en el juego (`K1`, `K2`, `K3`). Una prueba comprueba que ambas listas coincidan.

## 3. Pruebas

En `tests/core.test.js`:
1. Agrega el identificador a la lista `TOPICS` del archivo: se verifican solas la estructura (6 problemas, 2 por ficha) y que cada solución equivocada difiera de la correcta.
2. Agrega una prueba con las **cuentas calculadas de forma independiente** (no copies los números del contenido: recalcúlalos), como las de `[porcentajes] respuestas correctas...`.
3. Agrega una prueba de lectura con reglas con frases de ejemplo para cada ficha.

Después ejecuta `npm test`.

## 4. Revisión pedagógica

Antes de usarlo con estudiantes, pide a un docente que revise el enunciado, los pasos, los errores típicos y el lenguaje. Las pruebas verifican las cuentas, no que el error sea realmente el que cometen los estudiantes.
