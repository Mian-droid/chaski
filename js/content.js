/**
 * Contenido de Chaski: un paquete por tema de matemática de secundaria.
 *
 * Cada paquete define tres fichas de conocimiento (K1, K2, K3) y, por cada ficha, el error típico que
 * comete Chaski cuando la ficha falta o está mal enseñada. Ningún error se genera al azar: cada
 * problema trae su solución correcta (`ok`), su solución equivocada (`bad`) y, a veces, una solución
 * con un descuido de cálculo (`slip`).
 *
 * Para agregar un tema, ver docs/contenido-de-temas.md.
 *
 * Uso:
 *   ChaskiContent.use('porcentajes');   // activa el tema; luego se leen C.cards, C.problems, C.round...
 */
(function (root) {
  'use strict';

  /**
   * Arma un problema con sus variantes de solución.
   * @param {string} id        Identificador, por ejemplo "p1".
   * @param {string} card      Ficha que necesita para resolverse bien: "K1", "K2" o "K3".
   * @param {string} text      Enunciado.
   * @param {number} answer    Respuesta correcta.
   * @param {string[]} ok      Pasos de la solución correcta.
   * @param {Array} bad        [pasos, respuesta que da Chaski, índice del paso equivocado].
   * @param {Array} [slip]     Opcional: [pasos, respuesta con descuido, índice del paso con la cuenta mal].
   */
  function prob(id, card, text, answer, ok, bad, slip) {
    return {
      id: id, card: card, text: text, answer: answer,
      ok: { steps: ok, said: answer },
      bad: { steps: bad[0], said: bad[1], errStep: bad[2] },
      slip: slip ? { steps: slip[0], said: slip[1], errStep: slip[2] } : undefined
    };
  }
  function probes(list, freeQ) {
    return list.map(function (p) { return { k: p[0], rule: p[1], kind: 'num', q: p[2], answer: p[3] }; })
      .concat([{ k: 'pr4', rule: null, kind: 'free', q: freeQ }]);
  }
  function index(list) { var o = {}; list.forEach(function (p) { o[p.id] = p; }); return o; }

  /* ---------------------------------------------------------------------------------------------
   * Tema 1: Proporciones (directa e inversa)
   * ------------------------------------------------------------------------------------------- */
  var proporciones = {
    meta: { id: 'proporciones', title: 'Proporciones', about: 'proporciones', level: 'Secundaria' },
    cards: {
      K1: { short: 'Multiplicar', title: 'Se multiplica, no se suma',
        text: 'En una proporción directa, las dos cantidades se multiplican (o se dividen) por el mismo número. Sumar la misma cantidad a las dos rompe la proporción. Si 2 cuadernos cuestan 6 soles, 8 cuadernos son 4 veces más, así que cuestan 4 × 6 = 24 soles.',
        belief: { bien: 'cuando una cantidad se multiplica, la otra se multiplica igual', mal: 'a las dos cantidades se les suma lo mismo' } },
      K2: { short: 'Datos parejos', title: 'Cada dato con su pareja',
        text: 'En la regla de tres, los datos que van juntos se escriben en el mismo orden: cuadernos con cuadernos y soles con soles. Si los cruzas, sale un resultado sin sentido. Truco: pregúntate si más cosas deberían costar más. Si 7 lapiceros salen más baratos que 5, algo está mal.',
        belief: { bien: 'los datos que van juntos se escriben en el mismo orden', mal: 'los datos se pueden cruzar al armar la proporción' } },
      K3: { short: 'Sube y baja', title: 'Si una sube y la otra baja, es inversa',
        text: 'Con más obreros se tarda menos. En la proporción inversa se mantiene el producto: obreros × días. Si 4 obreros tardan 6 días, el trabajo total es 24, y 8 obreros tardan 24 ÷ 8 = 3 días.',
        belief: { bien: 'si una cantidad sube, la otra baja y el producto se mantiene', mal: 'si una cantidad sube, la otra también sube' } }
    },
    problems: index([
      prob('p1', 'K1', '2 cuadernos cuestan 6 soles. ¿Cuánto cuestan 8 cuadernos?', 24,
        ['De 2 a 8 cuadernos se multiplica por 4.', 'Entonces el precio también se multiplica por 4.', '4 × 6 = 24 soles.'],
        [['De 2 a 8 cuadernos hay 6 cuadernos más.', 'Entonces el precio también sube 6 soles.', '6 + 6 = 12 soles.'], 12, 1]),
      prob('p2', 'K1', '3 tazas de harina alcanzan para 12 galletas. ¿Cuántas tazas se necesitan para 36 galletas?', 9,
        ['De 12 a 36 galletas se multiplica por 3.', 'Entonces las tazas también se multiplican por 3.', '3 × 3 = 9 tazas.'],
        [['De 12 a 36 galletas hay 24 galletas más.', 'Entonces las tazas también suben 24.', '3 + 24 = 27 tazas.'], 27, 1],
        [['De 12 a 36 galletas se multiplica por 3.', 'Entonces las tazas también se multiplican por 3.', '3 × 3 = 12 tazas.'], 12, 2]),
      prob('p3', 'K3', '4 obreros terminan una obra en 6 días. ¿Cuántos días tardarán 8 obreros trabajando al mismo ritmo?', 3,
        ['De 4 a 8 obreros: se duplican.', 'Con más obreros se tarda menos: el trabajo total es 4 × 6 = 24.', '24 ÷ 8 = 3 días.'],
        [['De 4 a 8 obreros: se duplican.', 'Entonces los días también se duplican.', '6 × 2 = 12 días.'], 12, 1]),
      prob('p4', 'K2', '3 kg de arroz cuestan 12 soles. ¿Cuánto cuestan 5 kg?', 20,
        ['Armo la proporción: 3/12 = 5/x.', 'Multiplico en cruz: 3 · x = 5 · 12 = 60.', 'x = 60 ÷ 3 = 20 soles.'],
        [['Armo la proporción: 3/12 = x/5.', 'Multiplico en cruz: 3 · 5 = 12 · x, o sea 15 = 12x.', 'x = 15 ÷ 12 = 1,25 soles.'], 1.25, 0],
        [['Armo la proporción: 3/12 = 5/x.', 'Multiplico en cruz: 3 · x = 5 · 12 = 60.', 'x = 60 ÷ 3 = 15 soles.'], 15, 2]),
      prob('p5', 'K2', '5 lapiceros cuestan 10 soles. ¿Cuánto cuestan 7 lapiceros?', 14,
        ['Armo la proporción: 5/10 = 7/x.', 'Multiplico en cruz: 5 · x = 7 · 10 = 70.', 'x = 70 ÷ 5 = 14 soles.'],
        [['Armo la proporción: 5/10 = x/7.', 'Multiplico en cruz: 5 · 7 = 10 · x, o sea 35 = 10x.', 'x = 35 ÷ 10 = 3,5 soles.'], 3.5, 0]),
      prob('p6', 'K3', '6 máquinas hacen un pedido en 10 días. ¿En cuántos días lo harán 12 máquinas al mismo ritmo?', 5,
        ['De 6 a 12 máquinas: se duplican.', 'Con más máquinas se tarda menos: el trabajo total es 6 × 10 = 60.', '60 ÷ 12 = 5 días.'],
        [['De 6 a 12 máquinas: se duplican.', 'Entonces los días también se duplican.', '10 × 2 = 20 días.'], 20, 1],
        [['De 6 a 12 máquinas: se duplican.', 'Con más máquinas se tarda menos: el trabajo total es 6 × 10 = 60.', '60 ÷ 12 = 6 días.'], 6, 2])
    ]),
    round: ['p1', 'p4', 'p3', 'p2', 'p5', 'p6'],
    slipOrder: ['p2', 'p6', 'p4'],
    teach: [
      { k: 't1', say: 'Yo no sé qué es una proporción. Explícame con tus palabras.', label: '¿Qué es una proporción?',
        ph: 'Escribe como se lo explicarías a un amigo…', min: 12, minWords: 5, needNumbers: false },
      { k: 't2', say: 'Ahora enséñame a resolver problemas. Dame un ejemplo con números y dime cómo lo haces paso a paso.', label: 'Tu ejemplo, paso a paso',
        ph: 'Por ejemplo: si 1 pan cuesta…', min: 20, minWords: 6, needNumbers: true }
    ],
    probes: probes([
      ['pr1', 'K1', 'Si 2 cuadernos cuestan 6 soles, ¿cuánto cuestan 5 cuadernos?', 15],
      ['pr2', 'K3', 'Si 4 obreros terminan la obra en 6 días, ¿en cuántos días la terminarían 12 obreros?', 2],
      ['pr3', 'K2', 'Si 5 lapiceros cuestan 10 soles, ¿cuánto cuestan 10 lapiceros?', 20]
    ], 'Ahora dímelo con otro ejemplo tuyo, con números distintos a los de antes: ¿cómo se ve una proporción directa?'),
    refs: [
      'una proporcion es la igualdad de dos razones',
      'dos magnitudes son directamente proporcionales cuando al multiplicar una la otra tambien se multiplica',
      'dos magnitudes son inversamente proporcionales cuando al aumentar una la otra disminuye',
      'regla de tres simple directa',
      'el producto de los extremos es igual al producto de los medios'
    ],
    /* Reglas de palabras para leer la explicación cuando no hay modelo (ver brain.js). */
    heuristics: {
      K1: { bien: /(multiplic\w*|dividi\w*|veces|por cada|unitari\w*|constante|(el )?doble.{0,40}doble|(el )?triple.{0,40}triple|mitad.{0,40}mitad)/,
            mal: /\b(sum(a|ar|ando|an|as|o|amos)|se le (suma|agrega|aumenta)|mas lo mismo)\b/ },
      K2: { bien: /(mismo orden|misma columna|pareja\w*|arriba.{0,30}abajo|en cruz|cruz|tabla|correspond\w*|ordenad\w*|van juntos|va con|cada dato)/ },
      K3: { bien: /(inversa\w*|al reves|disminuy\w*|producto se mantiene|(mas|mayor)\b.{0,30}\b(menos|menor)|(menos|menor)\b.{0,30}\b(mas|mayor)|uno sube.{0,20}otro baja|sube.{0,25}baja)/,
            mal: /(inversa|obreros|maquinas|dias).{0,60}(tambien (sube|aumenta|se duplica)|se duplican? tambien)/ }
    }
  };

  /* ---------------------------------------------------------------------------------------------
   * Tema 2: Porcentajes
   * ------------------------------------------------------------------------------------------- */
  var porcentajes = {
    meta: { id: 'porcentajes', title: 'Porcentajes', about: 'porcentajes', level: 'Secundaria' },
    cards: {
      K1: { short: 'Porcentaje', title: 'El porcentaje es una parte del total',
        text: 'El 100% es el total. Para hallar el p% de una cantidad se multiplica por p/100. El 20% de 150 es 150 × 20/100 = 30. Si sale una parte mayor que el total o un número que no tiene sentido, hay que revisar.',
        belief: { bien: 'para hallar un porcentaje de una cantidad la multiplico por el porcentaje entre 100', mal: 'para hallar un porcentaje divido la cantidad entre el porcentaje' } },
      K2: { short: 'Descuento', title: 'Descuento y aumento: primero el porcentaje',
        text: 'El descuento o el aumento es un porcentaje de la cantidad, no un número de soles. Con 20% de descuento sobre 150 soles, el descuento es 30 soles y se paga 150 − 30 = 120. En un aumento, ese valor se suma.',
        belief: { bien: 'en un descuento calculo el porcentaje de la cantidad y se lo resto, y en un aumento se lo sumo', mal: 'en un descuento le resto al precio el número del porcentaje' } },
      K3: { short: 'El total', title: 'Si te dan la parte, busca el total',
        text: 'Si el 20% de algo es 30, el 1% es 30 ÷ 20 y el total (el 100%) es 100 veces eso: 150. No se calcula el porcentaje de la parte que te dan.',
        belief: { bien: 'si conozco el porcentaje y cuánto es, hallo el total dividiendo entre el porcentaje y multiplicando por 100', mal: 'para hallar el total calculo el porcentaje de lo que me dan' } }
    },
    problems: index([
      prob('p1', 'K1', 'En un colegio hay 150 estudiantes y el 20% usa lentes. ¿Cuántos estudiantes usan lentes?', 30,
        ['El total, 150, es el 100%.', 'Para hallar el 20% multiplico el total por 20/100.', '150 × 20/100 = 30 estudiantes.'],
        [['El total, 150, es el 100%.', 'Para hallar el 20% divido el total entre 20.', '150 ÷ 20 = 7,5 estudiantes.'], 7.5, 1]),
      prob('p2', 'K2', 'Unas zapatillas cuestan 150 soles y tienen un descuento del 20%. ¿Cuánto se paga?', 120,
        ['El descuento es el 20% de 150: 150 × 20/100 = 30 soles.', 'Ese descuento se resta del precio.', '150 − 30 = 120 soles.'],
        [['El descuento es del 20%.', 'Entonces al precio le resto 20 soles.', '150 − 20 = 130 soles.'], 130, 1],
        [['El descuento es el 20% de 150: 150 × 20/100 = 30 soles.', 'Ese descuento se resta del precio.', '150 − 30 = 110 soles.'], 110, 2]),
      prob('p3', 'K3', 'El 20% de las entradas de un concierto son 30 entradas. ¿Cuántas entradas hay en total?', 150,
        ['Si el 20% son 30 entradas, el 1% es 30 ÷ 20 = 1,5.', 'El total es el 100%, o sea 100 veces el 1%.', '1,5 × 100 = 150 entradas.'],
        [['Tengo el 20% y quiero el total.', 'Calculo el 20% de 30: 30 × 20/100.', '30 × 20/100 = 6 entradas.'], 6, 1]),
      prob('p4', 'K1', 'De 80 estudiantes, el 25% viaja en bus. ¿Cuántos viajan en bus?', 20,
        ['El total, 80, es el 100%.', 'Para hallar el 25% multiplico el total por 25/100.', '80 × 25/100 = 20 estudiantes.'],
        [['El total, 80, es el 100%.', 'Para hallar el 25% divido el total entre 25.', '80 ÷ 25 = 3,2 estudiantes.'], 3.2, 1],
        [['El total, 80, es el 100%.', 'Para hallar el 25% multiplico el total por 25/100.', '80 × 25/100 = 22 estudiantes.'], 22, 2]),
      prob('p5', 'K2', 'Una laptop cuesta 2000 soles y sube de precio un 10%. ¿Cuál es el nuevo precio?', 2200,
        ['El aumento es el 10% de 2000: 2000 × 10/100 = 200 soles.', 'Ese aumento se suma al precio.', '2000 + 200 = 2200 soles.'],
        [['El aumento es del 10%.', 'Entonces al precio le sumo 10 soles.', '2000 + 10 = 2010 soles.'], 2010, 1]),
      prob('p6', 'K3', 'El 40% de un libro son 60 páginas. ¿Cuántas páginas tiene el libro?', 150,
        ['Si el 40% son 60 páginas, el 10% es 60 ÷ 4 = 15.', 'El total es el 100%, o sea 10 veces el 10%.', '15 × 10 = 150 páginas.'],
        [['Tengo el 40% y quiero el total.', 'Calculo el 40% de 60: 60 × 40/100.', '60 × 40/100 = 24 páginas.'], 24, 1],
        [['Si el 40% son 60 páginas, el 10% es 60 ÷ 4 = 15.', 'El total es el 100%, o sea 10 veces el 10%.', '15 × 10 = 160 páginas.'], 160, 2])
    ]),
    round: ['p1', 'p2', 'p3', 'p4', 'p5', 'p6'],
    slipOrder: ['p2', 'p6', 'p4'],
    teach: [
      { k: 't1', say: 'Yo no sé qué es un porcentaje. Explícame con tus palabras.', label: '¿Qué es un porcentaje?',
        ph: 'Escribe como se lo explicarías a un amigo…', min: 12, minWords: 5, needNumbers: false },
      { k: 't2', say: 'Ahora enséñame a resolver problemas. Dame un ejemplo con números (un descuento, un aumento…) y dime paso a paso cómo lo haces.', label: 'Tu ejemplo, paso a paso',
        ph: 'Por ejemplo: el 10% de 50 es…', min: 20, minWords: 6, needNumbers: true }
    ],
    probes: probes([
      ['pr1', 'K1', '¿Cuánto es el 30% de 250?', 75],
      ['pr2', 'K2', 'Una camisa cuesta 80 soles y tiene un 25% de descuento. ¿Cuánto se paga?', 60],
      ['pr3', 'K3', 'El 30% de un grupo son 24 personas. ¿Cuántas personas hay en total?', 80]
    ], 'Ahora dímelo con otro ejemplo tuyo, con números distintos a los de antes: ¿cómo calcularías un porcentaje de algo?'),
    refs: [
      'el porcentaje es una razon cuyo consecuente es 100',
      'el tanto por ciento es una de las cien partes iguales en que se divide una cantidad',
      'para calcular el porcentaje de una cantidad se multiplica por el porcentaje y se divide entre 100'
    ],
    heuristics: {
      K1: { bien: /(multiplic\w*|por 100|entre 100|\/ ?100|de cada 100|sobre 100|centesim\w*)/,
            mal: /dividi\w*.{0,30}entre (el )?(porcentaje|numero del porcentaje)/ },
      K2: { bien: /((descuento|rebaja).{0,80}(rest\w+|quit\w+|menos))|((aumento|incremento|sube|subida|recargo).{0,80}(sum\w+|agreg\w+|mas))/,
            mal: /((rest\w+|quit\w+|sum\w+) (el )?(numero|porcentaje) (al|del|a la) (precio|cantidad))|(le (rest\w+|sum\w+) \d+ (soles|sol)\b)/ },
      K3: { bien: /((total|todo).{0,80}(dividi\w*|entre).{0,60}(porcentaje|\d+))|regla de tres|(el 1 ?%|uno por ciento)/,
            mal: /(total|todo).{0,60}(calcul\w*|saco|hallo).{0,25}(porcentaje|%) de (lo que|la parte|ese)/ }
    }
  };

  /* ---------------------------------------------------------------------------------------------
   * Tema 3: Ecuaciones de primer grado
   * ------------------------------------------------------------------------------------------- */
  var ecuaciones = {
    meta: { id: 'ecuaciones', title: 'Ecuaciones de primer grado', about: 'ecuaciones', level: 'Secundaria' },
    cards: {
      K1: { short: 'Cambiar de signo', title: 'Lo que suma pasa restando',
        text: 'Cuando un término pasa al otro lado de la igualdad, cambia de signo: lo que suma pasa restando y lo que resta pasa sumando. En x + 8 = 20, el 8 pasa restando: x = 20 − 8 = 12.',
        belief: { bien: 'cuando un número pasa al otro lado de la igualdad, cambia de signo', mal: 'los números pasan al otro lado sin cambiar de signo' } },
      K2: { short: 'Paréntesis', title: 'El paréntesis se reparte',
        text: 'Un número que multiplica a un paréntesis multiplica a todos los términos de adentro. 2(x + 3) = 2x + 6, no 2x + 3.',
        belief: { bien: 'el número que multiplica un paréntesis multiplica a todos los términos de adentro', mal: 'el número que multiplica un paréntesis solo multiplica al primer término' } },
      K3: { short: 'Orden', title: 'Primero suma o resta, después divide',
        text: 'Para despejar la x, primero se pasan los números que suman o restan y al final se divide entre el número que acompaña a la x. En 3x + 6 = 21: 3x = 15 y luego x = 5.',
        belief: { bien: 'primero paso lo que suma o resta y al final divido entre el número de la x', mal: 'divido entre el número de la x solo algunos de los términos' } }
    },
    problems: index([
      prob('p1', 'K1', 'Resuelve: x + 8 = 20. ¿Cuánto vale x?', 12,
        ['Tengo x + 8 = 20.', 'El 8 suma, pasa al otro lado restando.', 'x = 20 − 8 = 12.'],
        [['Tengo x + 8 = 20.', 'El 8 pasa al otro lado sumando.', 'x = 20 + 8 = 28.'], 28, 1]),
      prob('p2', 'K2', 'Resuelve: 2(x + 3) = 14. ¿Cuánto vale x?', 4,
        ['Tengo 2(x + 3) = 14.', 'El 2 multiplica a todo el paréntesis: 2x + 6 = 14.', '2x = 14 − 6 = 8, entonces x = 4.'],
        [['Tengo 2(x + 3) = 14.', 'El 2 multiplica solo a la x: 2x + 3 = 14.', '2x = 14 − 3 = 11, entonces x = 5,5.'], 5.5, 1],
        [['Tengo 2(x + 3) = 14.', 'El 2 multiplica a todo el paréntesis: 2x + 6 = 14.', '2x = 14 − 6 = 9, entonces x = 4,5.'], 4.5, 2]),
      prob('p3', 'K3', 'Resuelve: 3x + 6 = 21. ¿Cuánto vale x?', 5,
        ['Tengo 3x + 6 = 21.', 'El 6 suma, pasa restando: 3x = 21 − 6 = 15.', 'Divido entre 3: x = 15 ÷ 3 = 5.'],
        [['Tengo 3x + 6 = 21.', 'Divido entre 3 solo la x y el 21: x + 6 = 7.', 'Paso el 6 restando: x = 7 − 6 = 1.'], 1, 1]),
      prob('p4', 'K1', 'Resuelve: x − 5 = 9. ¿Cuánto vale x?', 14,
        ['Tengo x − 5 = 9.', 'El 5 resta, pasa al otro lado sumando.', 'x = 9 + 5 = 14.'],
        [['Tengo x − 5 = 9.', 'El 5 pasa al otro lado restando también.', 'x = 9 − 5 = 4.'], 4, 1],
        [['Tengo x − 5 = 9.', 'El 5 resta, pasa al otro lado sumando.', 'x = 9 + 5 = 15.'], 15, 2]),
      prob('p5', 'K2', 'Resuelve: 4(x − 2) = 20. ¿Cuánto vale x?', 7,
        ['Tengo 4(x − 2) = 20.', 'El 4 multiplica a todo el paréntesis: 4x − 8 = 20.', '4x = 20 + 8 = 28, entonces x = 7.'],
        [['Tengo 4(x − 2) = 20.', 'El 4 multiplica solo a la x: 4x − 2 = 20.', '4x = 20 + 2 = 22, entonces x = 5,5.'], 5.5, 1]),
      prob('p6', 'K3', 'Resuelve: 2x + 10 = 30. ¿Cuánto vale x?', 10,
        ['Tengo 2x + 10 = 30.', 'El 10 suma, pasa restando: 2x = 30 − 10 = 20.', 'Divido entre 2: x = 20 ÷ 2 = 10.'],
        [['Tengo 2x + 10 = 30.', 'Divido entre 2 solo la x y el 30: x + 10 = 15.', 'Paso el 10 restando: x = 15 − 10 = 5.'], 5, 1],
        [['Tengo 2x + 10 = 30.', 'El 10 suma, pasa restando: 2x = 30 − 10 = 20.', 'Divido entre 2: x = 20 ÷ 2 = 12.'], 12, 2])
    ]),
    round: ['p1', 'p2', 'p3', 'p4', 'p5', 'p6'],
    slipOrder: ['p2', 'p6', 'p4'],
    teach: [
      { k: 't1', say: 'Yo no sé qué es una ecuación. Explícame con tus palabras.', label: '¿Qué es una ecuación?',
        ph: 'Escribe como se lo explicarías a un amigo…', min: 12, minWords: 5, needNumbers: false },
      { k: 't2', say: 'Ahora enséñame a resolverlas. Dame un ejemplo con números y dime paso a paso cómo lo haces.', label: 'Tu ejemplo, paso a paso',
        ph: 'Por ejemplo: x + 3 = 10…', min: 20, minWords: 6, needNumbers: true }
    ],
    probes: probes([
      ['pr1', 'K1', 'Si x + 6 = 15, ¿cuánto vale x?', 9],
      ['pr2', 'K2', 'Si 3(x + 1) = 18, ¿cuánto vale x?', 5],
      ['pr3', 'K3', 'Si 4x + 8 = 32, ¿cuánto vale x?', 6]
    ], 'Ahora dímelo con otro ejemplo tuyo, con números distintos a los de antes: ¿cómo resolverías una ecuación?'),
    refs: [
      'una ecuacion es una igualdad que contiene una incognita',
      'resolver una ecuacion es hallar el valor de la incognita que cumple la igualdad',
      'transponer terminos es pasar un termino de un miembro al otro cambiando su signo'
    ],
    heuristics: {
      K1: { bien: /(cambia(n)? de signo|pasa(n)? (al otro lado )?(restando|sumando)|signo (contrario|opuesto)|opuesto)/,
            mal: /((pasa|pasan) .{0,25}(sumando|restando) (tambien|igual))|sin cambiar (de )?signo|(mismo|igual) signo/ },
      K2: { bien: /((parentesis|multiplica).{0,50}(todo|todos|cada)|(todo|todos|cada).{0,30}(parentesis|adentro|dentro))/,
            mal: /((solo|unicamente).{0,25}(primer|primero|x\b))|parentesis.{0,60}(solo|unicamente)/ },
      K3: { bien: /((primero.{0,60}(suma|resta|numeros|termino).{0,100}(despues|luego|al final|ultimo).{0,40}divid)|(divid\w*.{0,20}(al final|ultimo)))/ }
    }
  };

  var topics = { proporciones: proporciones, porcentajes: porcentajes, ecuaciones: ecuaciones };

  /* Textos que no dependen del tema. */
  var generic = {
    mission: 'Ojo: cuando resuelva problemas, voy a hacer lo que aprendí de ti. Si me explicaste mal, me voy a equivocar. Tu misión es revisarme.',
    missionHidden: 'Después te muestro cómo resuelvo yo los problemas.',
    confident: ['¡Fácil! Lo resuelvo así:', '¡Esto lo tengo dominado!', 'Mira, es sencillo:', '¡Pan comido!', 'Seguro, seguro. Así se hace:', '¡Listo, listo! Mira:'],
    probeSay: ['Ahora te pregunto yo. ¿Y si cambio el número?', 'Otra más. Cambio los números.', 'Última con números. ¿Y si ahora…?', 'Para terminar, cuéntamelo a tu manera.']
  };

  var content = {
    topics: topics,
    /** Lista de temas para mostrar en el selector del docente. */
    list: Object.keys(topics).map(function (id) { return { id: id, title: topics[id].meta.title }; }),
    teachMore: { k: 'tx', say: 'Cuéntame más. ¿Qué otra cosa quieres enseñarme?', label: 'Lo que quieres agregar',
      ph: 'Explícale algo que le falte o corrígelo…', min: 12, minWords: 4, needNumbers: false },
    /** Los tres identificadores de ficha y el descuido de cálculo ("S"), comunes a todos los temas. */
    slipCard: { short: 'Cuentas', title: 'Revisa también las cuentas',
      text: 'Aunque entienda la idea, cualquiera puede equivocarse en una cuenta. Revisa cada operación, incluso cuando el razonamiento suena bien.' },

    /**
     * Activa un tema: copia sus datos a la raíz (topic, cards, problems, round, teach, probes, refs, heuristics...).
     * Si el identificador no existe, usa "proporciones".
     * @param {string} id
     * @returns {object} el mismo objeto de contenido, ya apuntando al tema.
     */
    use: function (id) {
      var t = topics[id] || topics.proporciones;
      content.topic = t.meta;
      content.cards = Object.assign({}, t.cards, { S: content.slipCard });
      content.problems = t.problems;
      content.round = t.round;
      content.slipOrder = t.slipOrder;
      content.teach = t.teach;
      content.probes = t.probes;
      content.heuristics = t.heuristics;
      var all = [];
      Object.keys(t.problems).forEach(function (k) { all.push(t.problems[k].text); });
      t.probes.forEach(function (p) { all.push(p.q); });
      content.refs = t.refs.concat(all);
      content.contextNumbers = (all.join(' ').match(/\d+(?:[.,]\d+)?/g) || []).map(function (n) { return Number(n.replace(',', '.')); });
      content.lines = Object.assign({}, generic, {
        intro: ['¡Hola! Soy Chaski, el mensajero más veloz de los Andes.',
          'Tengo que llevar un mensaje al Cusco, pero hoy no sé nada de ' + t.meta.about + '.',
          'Solo sé lo que tú me enseñes. ¿Me enseñas?']
      });
      return content;
    }
  };
  content.use('proporciones');

  root.ChaskiContent = content;
  if (typeof module !== 'undefined' && module.exports) module.exports = content;
})(typeof window !== 'undefined' ? window : globalThis);
