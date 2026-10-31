import * as THREE from "three";

/**
 * Texturas tiradas das fotos realistas (public/foto e public/textura).
 * Carregadas uma vez e compartilhadas entre as cenas.
 *
 *  - public/textura/cereja.jpg, grao-verde.jpg, grao-torrado.jpg: a superfície
 *    do fruto e do grão, recortada das fotos e alinhada ao eixo longo, com a
 *    fenda na horizontal (o mesmo eixo da malha em coffeeGeometry).
 *  - public/textura/folha.jpg: folha do cafeeiro com orvalho, nervura vertical.
 *  - public/textura/crema.jpg: a crema vista de cima, para a superfície da xícara.
 *  - public/foto/*.jpg: as fotos inteiras, usadas desfocadas como fundo.
 */
const cache = new Map<string, THREE.Texture>();

export function photoTexture(src: string) {
  let t = cache.get(src);
  if (t) return t;
  t = new THREE.TextureLoader().load(src);
  t.colorSpace = THREE.SRGBColorSpace;
  t.minFilter = THREE.LinearMipmapLinearFilter;
  t.magFilter = THREE.LinearFilter;
  t.generateMipmaps = true;
  t.anisotropy = 4;
  t.wrapS = THREE.ClampToEdgeWrapping;
  t.wrapT = THREE.ClampToEdgeWrapping;
  cache.set(src, t);
  return t;
}

/** Recorte da foto usado como fundo: [x, y, largura, altura], origem no topo. */
export type BackdropPhoto = {
  src: string;
  rect: [number, number, number, number];
  /** desfoque em níveis de mipmap (0 = nítido) */
  blur: number;
  /** quanto da foto aparece (0..1) e o brilho dela */
  amount: number;
  gain?: number;
};

export const IMG_W = 940;
export const IMG_H = 1672;

const f = (n: string) => `/foto/${n}.jpg`;

/**
 * Fundo de cada etapa: o pedaço da foto que não tem o objeto principal
 * (bokeh, sol, brasa, terreiro), para o objeto 3D não ter um "fantasma" atrás.
 */
export const BG = {
  hero: { src: f("01-fruto-na-planta"), rect: [0.3, 0.0, 0.7, 0.62], blur: 2.2, amount: 0.92, gain: 0.85 },
  fruto: { src: f("02-o-fruto"), rect: [0.45, 0.0, 0.55, 0.55], blur: 2.6, amount: 0.9, gain: 0.8 },
  colheita: { src: f("03-colheita"), rect: [0.3, 0.0, 0.7, 0.6], blur: 2.8, amount: 0.9, gain: 0.78 },
  secagem: { src: f("04-secagem"), rect: [0.0, 0.0, 1.0, 0.62], blur: 2.0, amount: 0.92, gain: 0.82 },
  cru: { src: f("05-grao-cru"), rect: [0.45, 0.0, 0.55, 0.45], blur: 3.0, amount: 0.9, gain: 0.8 },
  torra: { src: f("06-torra"), rect: [0.5, 0.0, 0.5, 0.5], blur: 2.6, amount: 0.9, gain: 0.85 },
  tambor: { src: f("07-tambor"), rect: [0.35, 0.0, 0.65, 0.5], blur: 2.4, amount: 0.9, gain: 0.7 },
  moagem: { src: f("08-moagem"), rect: [0.5, 0.05, 0.5, 0.5], blur: 2.6, amount: 0.9, gain: 0.8 },
  preparo: { src: f("09-preparo"), rect: [0.55, 0.0, 0.45, 0.3], blur: 2.6, amount: 0.9, gain: 0.85 },
  xicara: { src: f("10-cafe-caindo"), rect: [0.55, 0.0, 0.45, 0.26], blur: 2.6, amount: 0.9, gain: 0.85 },
  servida: { src: f("11-xicara"), rect: [0.0, 0.0, 1.0, 0.24], blur: 2.4, amount: 0.92, gain: 0.85 },
} satisfies Record<string, BackdropPhoto>;

const lerp = (a: number, b: number, t: number) => a + (b - a) * t;

/** Põe uma (ou duas, em transição) fotos no fundo da cena. */
export function applyBackdropPhoto(
  mat: THREE.ShaderMaterial,
  a: BackdropPhoto,
  b: BackdropPhoto | null,
  mix: number,
  gl: THREE.WebGLRenderer,
) {
  const u = mat.uniforms;
  const k = b ? mix : 0;
  u.tPhotoA.value = photoTexture(a.src);
  u.uRectA.value.set(...a.rect);
  if (b) {
    u.tPhotoB.value = photoTexture(b.src);
    u.uRectB.value.set(...b.rect);
  } else {
    u.tPhotoB.value = u.tPhotoA.value;
    u.uRectB.value.set(...a.rect);
  }
  u.uPhotoMix.value = k;
  u.uPhotoAmt.value = lerp(a.amount, b?.amount ?? a.amount, k);
  u.uPhotoBlur.value = lerp(a.blur, b?.blur ?? a.blur, k);
  u.uPhotoGain.value = lerp(a.gain ?? 0.8, b?.gain ?? a.gain ?? 0.8, k);
  gl.getDrawingBufferSize(u.uRes.value);
}

/** Etapa da jornada a partir do progresso, com a mistura para a próxima. */
export function stageAt(p: number, stops: number[], fade = 0.05) {
  let i = 0;
  for (let k = 0; k < stops.length; k++) if (p >= stops[k]) i = k;
  const j = Math.min(i + 1, stops.length - 1);
  const next = stops[j];
  let mix = 0;
  if (j !== i) {
    const t = Math.min(1, Math.max(0, (p - (next - fade)) / fade));
    mix = t * t * (3 - 2 * t);
  }
  return { i, j, mix };
}
