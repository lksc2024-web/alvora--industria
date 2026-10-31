import type { Direction, LiveShot } from "./LivingPhoto";
import { clamp01, lerp, smoothstep } from "./util";

/*
 * Coreografia das duas seções feitas com fotos vivas. As medidas foram
 * tiradas sobre as próprias fotos (940 × 1672), em fração da largura e da
 * altura, com origem no canto superior esquerdo.
 */

/** Torrefação: 07-tambor. O tambor gira o leito, a cascata desce, a bandeja roda. */
export const ROAST_SHOTS: LiveShot[] = [
  {
    src: "/foto/07-tambor.jpg",
    // a boca do tambor é uma elipse inclinada; o leito sobe pela esquerda e
    // rola para a direita, onde transborda pela borda
    spin: { center: [0.29, 0.17], radius: [0.2, 0.172], tilt: 0.3, speed: 0.42, feather: 0.42 },
    // bandeja de resfriamento em volta do agitador
    churn: { center: [0.66, 0.66], radius: [0.8, 0.17], speed: 0.1, feather: 0.7, below: 0.53 },
    streams: [
      { from: [0.47, 0.24], to: [0.41, 0.53], width: 0.11, speed: 0.058, feather: 0.6, taper: 1.6 },
    ],
    steam: { box: [0.45, 1.0, 0.12, 0.62], speed: 0.035, wiggle: 0.9 },
    heat: 1,
    glow: 0.9,
    period: 1.4,
    particles: "brasa",
    beans: { lip: [0.39, 0.235, 0.5, 0.3], land: [0.5, 0.64], gravity: 0.95, size: 0.064 },
  },
];

export function roastDirection(p: number): Direction {
  const k = smoothstep(0, 1, p);
  return {
    a: 0,
    // começa colado na boca do tambor e desce acompanhando a descarga
    focusA: [lerp(0.3, 0.46, k), lerp(0.22, 0.47, k)],
    zoomA: lerp(1.8, 1.08, k),
    // secagem e amarelamento: o leito começa claro, cor de canela, e escurece
    tone: 1 - smoothstep(0.04, 0.78, p),
    heat: 0.55 + 0.45 * Math.sin(Math.PI * smoothstep(0, 0.95, p)),
    beans: lerp(0.45, 1, smoothstep(0.1, 0.6, p)),
  };
}

/** O café cai na xícara (10), o fio termina, a câmera atravessa a crema (11). */
export const POUR_SHOTS: LiveShot[] = [
  {
    src: "/foto/10-cafe-caindo.jpg",
    alt: "/foto/10-sem-fio.jpg",
    streams: [
      { from: [0.538, 0.0], to: [0.514, 0.47], width: 0.085, speed: 0.07, feather: 0.55, taper: 0.5 },
    ],
    spin: { center: [0.5, 0.47], radius: [0.45, 0.125], speed: 0.24, feather: 0.55 },
    ripple: { center: [0.52, 0.462], radius: [0.3, 0.085], amp: 0.012, freq: 24, speed: 7 },
    steam: { box: [0.04, 0.98, 0.0, 0.34], speed: 0.03, wiggle: 0.9, notch: [0.53, 0.09] },
    glow: 0.35,
    period: 1.5,
    particles: "vapor",
    emitter: [0.5, 0.36],
  },
  {
    src: "/foto/11-xicara.jpg",
    spin: { center: [0.49, 0.52], radius: [0.45, 0.175], speed: 0.2, feather: 0.5 },
    churn: { center: [0.47, 0.53], radius: [0.2, 0.08], speed: 0.22, feather: 0.85 },
    steam: { box: [0.12, 0.88, 0.0, 0.44], speed: 0.035, wiggle: 1 },
    glow: 0.25,
    period: 1.8,
    particles: "vapor",
    emitter: [0.5, 0.36],
  },
];

const easeIn = (x: number) => x * x * x;
const easeOut = (x: number) => 1 - (1 - x) ** 3;

export function pourDirection(p: number): Direction {
  // o fio cai até 0.52; depois a cauda desce como uma gota alongada
  const tail = clamp01((p - 0.5) / 0.17);
  const cut = p < 0.5 ? -1 : -0.14 + 0.68 * tail ** 1.6;
  const push = lerp(1.0, 1.14, smoothstep(0, 0.6, p));

  if (p < 0.7) {
    return { a: 0, focusA: [0.52, 0.42], zoomA: push, cut, ripple: 1 - smoothstep(0.62, 0.75, p) * 0.7 };
  }

  // mergulho na crema da 10 e saída já na crema da 11, que se afasta
  const dive = easeIn(clamp01((p - 0.7) / 0.12));
  const zA = lerp(1.14, 3.1, dive);
  const fA: [number, number] = [lerp(0.52, 0.5, dive), lerp(0.42, 0.47, dive)];
  const back = easeOut(clamp01((p - 0.77) / 0.23));
  const zB = lerp(3.1, 1.04, back);
  const fB: [number, number] = [lerp(0.48, 0.5, back), lerp(0.53, 0.5, back)];
  const mix = smoothstep(0.765, 0.815, p);
  const blur = Math.sin(Math.PI * clamp01((p - 0.73) / 0.13));

  if (mix >= 0.999) return { a: 1, focusA: fB, zoomA: zB, blur: blur > 0.01 ? blur : 0 };
  return { a: 0, b: 1, mix, focusA: fA, zoomA: zA, focusB: fB, zoomB: zB, cut: 0.6, blur, ripple: 0.3 };
}
