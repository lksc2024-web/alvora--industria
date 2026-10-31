import type { Shot } from "./PhotoStage";

const f = (nome: string) => ({ src: `/foto/${nome}.jpg`, depth: `/foto/${nome}-prof.jpg` });

/** Abertura: a cereja no galho, com o sol nascendo atrás. */
export const HERO_SHOTS: Shot[] = [
  { ...f("01-fruto-na-planta"), focus: [0.42, 0.55], zoom: [1.0, 1.14], parallax: 1.4, wind: 1, particles: "poeira" },
];

/** As oito etapas da jornada, na ordem de `journey` em site.ts. */
export const JOURNEY_SHOTS: Shot[] = [
  { ...f("02-o-fruto"), focus: [0.5, 0.52], zoom: [1.0, 1.12], parallax: 1.5, wind: 0.6, particles: "poeira" },
  { ...f("03-colheita"), focus: [0.55, 0.45], zoom: [1.0, 1.1], parallax: 1.3, wind: 0.5, particles: "poeira" },
  { ...f("04-secagem"), focus: [0.7, 0.55], zoom: [1.0, 1.1], parallax: 1.2, particles: "poeira" },
  { ...f("05-grao-cru"), focus: [0.5, 0.3], zoom: [1.0, 1.14], parallax: 1.5, particles: "poeira" },
  { ...f("06-torra"), focus: [0.52, 0.4], zoom: [1.0, 1.12], parallax: 1.5, glow: 1, heat: 0.4, particles: "brasa" },
  { ...f("08-moagem"), focus: [0.5, 0.4], zoom: [1.0, 1.12], parallax: 1.4, particles: "po", emitter: [0.5, 0.4] },
  {
    ...f("09-preparo"),
    focus: [0.45, 0.4],
    zoom: [1.0, 1.1],
    parallax: 1.1,
    flow: [0.39, 0.53, 0.0, 0.42],
    particles: "vapor",
    emitter: [0.45, 0.28],
  },
  {
    ...f("10-cafe-caindo"),
    focus: [0.5, 0.45],
    zoom: [1.0, 1.08],
    parallax: 1.1,
    flow: [0.45, 0.57, 0.0, 0.45],
    swirl: [0.52, 0.45, 0.22, 0.9],
    particles: "vapor",
    emitter: [0.55, 0.3],
  },
];

/** Torrefação: o tambor despejando, com o ar quente tremendo e brasas. */
export const ROAST_SHOTS: Shot[] = [
  { ...f("07-tambor"), focus: [0.45, 0.45], zoom: [1.0, 1.16], parallax: 1.2, heat: 1, glow: 0.8, particles: "brasa", grade: [0.9, 1] },
];

/** O café cai na xícara e a crema se fecha em espiral. */
export const POUR_SHOTS: Shot[] = [
  {
    ...f("10-cafe-caindo"),
    focus: [0.5, 0.45],
    zoom: [1.0, 1.06],
    parallax: 1.1,
    flow: [0.45, 0.57, 0.0, 0.45],
    swirl: [0.52, 0.45, 0.22, 1.1],
    particles: "vapor",
    emitter: [0.55, 0.3],
  },
  {
    ...f("11-xicara"),
    focus: [0.47, 0.5],
    zoom: [1.0, 1.08],
    parallax: 1.1,
    swirl: [0.47, 0.52, 0.42, 1.4],
    particles: "vapor",
    emitter: [0.5, 0.33],
  },
];
