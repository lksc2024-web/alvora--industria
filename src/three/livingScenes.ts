import type { Direction, LiveShot } from "./LivingPhoto";
import { clamp01, lerp, smoothstep } from "./util";

/*
 * Coreografia da descida feita com fotos vivas. As medidas foram
 * tiradas sobre as próprias fotos (940 × 1672), em fração da largura e da
 * altura, com origem no canto superior esquerdo.
 */

/** Torrefação: 07-tambor. O tambor gira o leito, a cascata desce, a bandeja roda. */
const TAMBOR: LiveShot = {
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
    beans: { lip: [0.39, 0.235, 0.5, 0.3], land: [0.5, 0.64], gravity: 0.95, size: 0.1 },
};

/** O café cai na xícara (10), o fio termina, a câmera atravessa a crema (11). */
const XICARA_FIO: LiveShot = {
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
};

const XICARA_SERVIDA: LiveShot = {
    src: "/foto/11-xicara.jpg",
    spin: { center: [0.49, 0.52], radius: [0.45, 0.175], speed: 0.2, feather: 0.5 },
    churn: { center: [0.47, 0.53], radius: [0.2, 0.08], speed: 0.22, feather: 0.85 },
    steam: { box: [0.12, 0.88, 0.0, 0.44], speed: 0.035, wiggle: 1 },
    glow: 0.25,
    period: 1.8,
    particles: "vapor",
    emitter: [0.5, 0.36],
};

const easeIn = (x: number) => x * x * x;
const easeOut = (x: number) => 1 - (1 - x) ** 3;


/** Moagem: 08. O grão se desfaz e o pó se espalha a partir dele. */
const MOAGEM: LiveShot = {
  src: "/foto/08-moagem.jpg",
  burst: { center: [0.5, 0.38], radius: [0.55, 0.32], speed: 0.05 },
  steam: { box: [0.0, 1.0, 0.0, 1.0], speed: 0.008, wiggle: 2 },
  glow: 0.5,
  period: 1.6,
  particles: "po",
  emitter: [0.5, 0.38],
};

/** Preparo: 09. A água cai no pó, a superfície borbulha e gira, o vapor sobe. */
const PREPARO: LiveShot = {
  src: "/foto/09-preparo.jpg",
  streams: [{ from: [0.485, 0.0], to: [0.405, 0.41], width: 0.03, speed: 0.07, feather: 0.6, taper: 0.8 }],
  spin: { center: [0.48, 0.42], radius: [0.46, 0.1], speed: 0.16, feather: 0.6 },
  ripple: { center: [0.405, 0.41], radius: [0.22, 0.05], amp: 0.01, freq: 26, speed: 6 },
  steam: { box: [0.08, 0.98, 0.0, 0.26], speed: 0.03, wiggle: 0.9, notch: [0.46, 0.05] },
  glow: 0.3,
  period: 1.5,
  particles: "vapor",
  emitter: [0.5, 0.2],
};

/**
 * A descida inteira, de cima para baixo: tambor, moagem, preparo, o fio na
 * xícara. A última foto (a xícara servida) não entra na pilha: a câmera chega
 * nela mergulhando na crema da anterior.
 */
export const DESCENT_SHOTS: LiveShot[] = [TAMBOR, MOAGEM, PREPARO, XICARA_FIO, XICARA_SERVIDA];

/*
 * Linha do tempo da seção inteira (0..1 da rolagem).
 * Ato 1: a cena 3D com os recortes (cereja → semente → grão cru → início da
 * torra). Depois o grão cai, a câmera desce com ele e as fotos vivas sobem.
 */
export const ACT1_END = 0.33;
export const FALL_END = 0.41;
/** progresso da jornada 3D (0..1 dela) até onde ela vai */
export const ACT1_JOURNEY = 0.56;

export const act1Progress = (P: number) => Math.min(1, P / ACT1_END) * ACT1_JOURNEY;
export const fallProgress = (P: number) => clamp01((P - ACT1_END) / (FALL_END - ACT1_END));

type V3 = [number, number, number];
// [P, y da pilha, x, zoom]
const TOWER_KEYS: [number, number, number, number][] = [
  [ACT1_END, -0.62, 0.31, 1.8],
  [FALL_END, 0.37, 0.31, 1.8],
  [0.47, 0.42, 0.34, 1.6],
  [0.56, 0.64, 0.43, 1.18],
  [0.61, 1.0, 0.47, 1.2],
  [0.65, 1.4, 0.5, 1.22],
  [0.7, 1.55, 0.5, 1.25],
  [0.74, 2.0, 0.48, 1.22],
  [0.77, 2.36, 0.47, 1.22],
  [0.81, 2.5, 0.47, 1.22],
  [0.845, 3.0, 0.5, 1.2],
  [0.87, 3.53, 0.52, 1.2],
];
export const STACK_END = 0.87;

const ease = (x: number) => x * x * (3 - 2 * x);

export function towerView(P: number): V3 {
  const k = TOWER_KEYS;
  if (P <= k[0][0]) return [k[0][1], k[0][2], k[0][3]];
  for (let i = 0; i < k.length - 1; i++) {
    const a = k[i];
    const b = k[i + 1];
    if (P <= b[0]) {
      const t = ease((P - a[0]) / (b[0] - a[0]));
      return [lerp(a[1], b[1], t), lerp(a[2], b[2], t), lerp(a[3], b[3], t)];
    }
  }
  const l = k[k.length - 1];
  return [l[1], l[2], l[3]];
}

/** Onde um ponto da pilha (x, y em fotos) aparece na tela: 0..1, origem em cima à esquerda. */
export function towerToScreen(px: number, py: number, P: number, w: number, h: number): [number, number] {
  const [y, x, z] = towerView(P);
  const IA = 940 / 1672;
  const aspect = w / Math.max(1, h);
  const zz = Math.max(1, z);
  const hh = 0.5 / zz;
  const xx = Math.min(1 - hh, Math.max(hh, x));
  // coordenada na foto sem zoom (0..1, y para baixo)
  const cx = 0.5 + (px - xx) * zz;
  const cy = 0.5 + (py - y) * zz;
  if (aspect > 0.95) {
    const ph = aspect > 1.9 ? 0.86 : 0.9;
    const pw = (ph * IA) / aspect;
    const panelX = aspect < 1.3 ? 0.7 : 0.66;
    return [panelX - pw / 2 + cx * pw, 0.5 - ph / 2 + cy * ph];
  }
  // tela cheia: a foto cobre a tela
  if (aspect > IA) return [cx, 0.5 + (cy - 0.5) * (aspect / IA)];
  return [0.5 + (cx - 0.5) * (IA / aspect), cy];
}

/** Largura da foto na tela, em fração da altura da tela (zoom incluso). */
export function towerPhotoWidth(P: number, w: number, h: number) {
  const [, , z] = towerView(P);
  const IA = 940 / 1672;
  const aspect = w / Math.max(1, h);
  if (aspect > 0.95) return (aspect > 1.9 ? 0.86 : 0.9) * IA * Math.max(1, z);
  return Math.max(IA, aspect) * Math.max(1, z);
}

export function descentDirection(P: number): Direction {
  // ainda na cena 3D: a pilha fica acima da tela, invisível
  if (P < STACK_END) {
    const [y, x, zoom] = towerView(P);
    // a torra acontece dentro do tambor: o leito começa claro e escurece
    const tone = 1 - smoothstep(FALL_END - 0.02, 0.56, P);
    return {
      a: 0,
      stack: { y, x, zoom, count: 4 },
      tone,
      heat: 0.6 + 0.4 * Math.sin(Math.PI * smoothstep(ACT1_END, 0.6, P)),
      beans: lerp(0.5, 1, smoothstep(ACT1_END, 0.5, P)),
      cut: -1,
    };
  }

  // o fio na xícara: 0..1 deste trecho
  const q = clamp01((P - STACK_END) / (1 - STACK_END));
  const tail = clamp01((q - 0.22) / 0.28);
  const cut = q < 0.22 ? -1 : -0.14 + 0.68 * tail ** 1.6;
  const push = lerp(1.2, 1.28, smoothstep(0, 0.45, q));
  const base: [number, number] = [0.52, 0.53];
  if (q < 0.52) return { a: 3, focusA: base, zoomA: push, cut, ripple: 1 - smoothstep(0.4, 0.6, q) * 0.7 };

  // mergulho na crema da 10 e saída já na crema da 11, que se afasta
  const dive = easeIn(clamp01((q - 0.52) / 0.2));
  const zA = lerp(1.28, 3.1, dive);
  const fA: [number, number] = [lerp(0.52, 0.5, dive), lerp(0.53, 0.47, dive)];
  const back = easeOut(clamp01((q - 0.64) / 0.36));
  const zB = lerp(3.1, 1.04, back);
  const fB: [number, number] = [lerp(0.48, 0.5, back), lerp(0.53, 0.5, back)];
  const mix = smoothstep(0.625, 0.7, q);
  const blur = Math.sin(Math.PI * clamp01((q - 0.56) / 0.2));
  if (mix >= 0.999) return { a: 4, focusA: fB, zoomA: zB, blur: blur > 0.01 ? blur : 0 };
  return { a: 3, b: 4, mix, focusA: fA, zoomA: zA, focusB: fB, zoomB: zB, cut: 0.6, blur, ripple: 0.3 };
}
