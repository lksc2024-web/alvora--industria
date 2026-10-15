import * as THREE from "three";

export const clamp01 = (v: number) => (v < 0 ? 0 : v > 1 ? 1 : v);

export const lerp = (a: number, b: number, t: number) => a + (b - a) * t;

export const smoothstep = (edge0: number, edge1: number, x: number) => {
  const t = clamp01((x - edge0) / (edge1 - edge0 || 1e-6));
  return t * t * (3 - 2 * t);
};

/** Interpolação exponencial estável independente do frame rate. */
export const damp = (current: number, target: number, lambda: number, dt: number) =>
  current + (target - current) * (1 - Math.exp(-lambda * dt));

/** Janela suave: 1 dentro do intervalo, 0 fora, com bordas macias. */
export const window01 = (
  x: number,
  start: number,
  end: number,
  fade = 0.05,
) => smoothstep(start - fade, start + fade, x) * (1 - smoothstep(end - fade, end + fade, x));

/**
 * Converte o progresso global em um índice fracionário sobre âncoras.
 * É o que permite misturar dois "layouts" vizinhos sem corte.
 */
export function rampIndex(p: number, anchors: number[]) {
  if (p <= anchors[0]) return 0;
  const last = anchors.length - 1;
  if (p >= anchors[last]) return last;
  for (let i = 0; i < last; i++) {
    const a = anchors[i];
    const b = anchors[i + 1];
    if (p <= b) {
      const t = (p - a) / (b - a || 1e-6);
      return i + t * t * (3 - 2 * t);
    }
  }
  return last;
}

export type Keyframe<T> = { at: number; value: T };

/** Interpolação de keyframes numéricos. */
export function sampleNumber(frames: Keyframe<number>[], p: number) {
  if (p <= frames[0].at) return frames[0].value;
  const last = frames.length - 1;
  if (p >= frames[last].at) return frames[last].value;
  for (let i = 0; i < last; i++) {
    if (p <= frames[i + 1].at) {
      const a = frames[i];
      const b = frames[i + 1];
      const t = (p - a.at) / (b.at - a.at || 1e-6);
      return lerp(a.value, b.value, t * t * (3 - 2 * t));
    }
  }
  return frames[last].value;
}

/** Interpolação de keyframes de posição, escrevendo em um alvo reutilizado. */
export function sampleVec3(
  frames: Keyframe<[number, number, number]>[],
  p: number,
  out: THREE.Vector3,
) {
  if (p <= frames[0].at) return out.set(...frames[0].value);
  const last = frames.length - 1;
  if (p >= frames[last].at) return out.set(...frames[last].value);
  for (let i = 0; i < last; i++) {
    if (p <= frames[i + 1].at) {
      const a = frames[i];
      const b = frames[i + 1];
      const raw = (p - a.at) / (b.at - a.at || 1e-6);
      const t = raw * raw * (3 - 2 * raw);
      return out.set(
        lerp(a.value[0], b.value[0], t),
        lerp(a.value[1], b.value[1], t),
        lerp(a.value[2], b.value[2], t),
      );
    }
  }
  return out.set(...frames[last].value);
}

/**
 * Fator de enquadramento por proporção de tela.
 * Em retrato o campo horizontal encolhe muito; sem afastar a câmera o objeto
 * principal vaza do quadro. Multiplica a distância da câmera ao alvo.
 */
export function fitFactor(width: number, height: number) {
  const aspect = width / Math.max(1, height);
  // O enquadramento é desenhado para ~1,55:1. Em proporções mais estreitas a
  // largura visível cai na mesma medida, então a distância cresce com 1/aspect.
  return Math.min(2.45, Math.max(1, 1.55 / Math.max(0.35, aspect)));
}

/** PRNG determinístico: a cena precisa ser idêntica a cada carregamento. */
export function makeRandom(seed = 1) {
  let s = seed >>> 0 || 1;
  return () => {
    s ^= s << 13;
    s ^= s >>> 17;
    s ^= s << 5;
    return ((s >>> 0) % 100000) / 100000;
  };
}
