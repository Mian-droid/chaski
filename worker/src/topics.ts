/**
 * Definición de cada tema para la lectura con el modelo.
 *
 * Los identificadores y las fichas (K1, K2, K3) deben coincidir con los del contenido del juego
 * (js/content.js). La prueba `consistencia con el contenido del juego` lo verifica.
 * El tema llega desde la página, por eso solo se aceptan los de esta lista: nunca se arma el prompt
 * con texto que mande el cliente.
 */
export const TOPIC_IDS = ["proporciones", "porcentajes", "ecuaciones"] as const;
export type TopicId = (typeof TOPIC_IDS)[number];
export type CardId = "K1" | "K2" | "K3";

export interface TopicDef {
  /** Nombre del tema, en inglés, para el prompt. */
  name: string;
  /** Qué enseña cada ficha y cuándo está bien o mal. */
  cards: Record<CardId, string>;
  /** Reglas extra de este tema. */
  notes: string[];
}

export function isTopic(x: unknown): x is TopicId {
  return typeof x === "string" && (TOPIC_IDS as readonly string[]).includes(x);
}

export const TOPICS: Record<TopicId, TopicDef> = {
  proporciones: {
    name: "direct and inverse proportionality",
    cards: {
      K1: `K1 (multiply, don't add): in direct proportion, when one quantity is multiplied or divided by a number, the other is multiplied or divided by the same number. Equivalent ways to say it: constant ratio, unit rate, "if you buy double you pay double". "bien" if stated. "mal" if it says to add the same amount to both quantities. A negated sentence such as "no se suma, se multiplica" is "bien".`,
      K2: `K2 (matching pairs): when setting up a rule of three or a proportion, matching magnitudes go in the same order (kilos with kilos, soles with soles; same column or same side). "bien" if stated. "mal" if it says the data can be crossed or put in any order.`,
      K3: `K3 (inverse): in inverse proportion, when one quantity goes up the other goes down and their product stays constant (more workers, fewer days). "bien" if stated. "mal" if it says that quantities that should be inverse also go up together (for example "if the workers double, the days double").`,
    },
    notes: ["A worked numeric example that only shows direct scaling counts for K1 only."],
  },
  porcentajes: {
    name: "percentages",
    cards: {
      K1: `K1 (percent of a quantity): the total is 100%, and p% of a quantity N is N × p/100. "bien" if stated, in any wording, or through a worked example that multiplies by p/100 (or "per hundred" reasoning). "mal" if it says to divide the quantity by the percent number, or computes the percent of a quantity in another incorrect way.`,
      K2: `K2 (discounts and increases): a discount or an increase of p% is p% OF the amount; that value is then subtracted (discount) or added (increase). "bien" if stated. "mal" if it subtracts or adds the percent number itself as if it were soles or units (for example "20% off 150 is 150 − 20").`,
      K3: `K3 (finding the total): if p% of the total is a known part X, the total is X × 100 / p (for example find 1% and multiply by 100). "bien" if stated. "mal" if it says to compute p% of the known part, or to add the percent to the part.`,
    },
    notes: ["A worked example that only computes a percent of a number counts for K1 only."],
  },
  ecuaciones: {
    name: "first-degree equations",
    cards: {
      K1: `K1 (changing sign): when a term moves to the other side of the equal sign it changes sign: what adds goes subtracting and what subtracts goes adding. "bien" if stated. "mal" if it says terms keep their sign when they move.`,
      K2: `K2 (distribution): a number multiplying a parenthesis multiplies every term inside it. "bien" if stated. "mal" if it says it multiplies only the first term or only the x.`,
      K3: `K3 (order when isolating x): first move the terms that add or subtract, and last divide by the number that goes with x (the coefficient). "bien" if stated. "mal" if it divides only some of the terms by the coefficient, skipping the others.`,
    },
    notes: ["A worked example that only shows one simple step such as x + 8 = 20 counts for K1 only."],
  },
};
