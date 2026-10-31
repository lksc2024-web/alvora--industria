"use client";

import { useFrame, useThree } from "@react-three/fiber";
import { useEffect, useMemo, useRef } from "react";
import * as THREE from "three";

import { clamp01, damp, smoothstep } from "./util";

/**
 * Palco fotográfico: as fotos realistas da jornada ganham profundidade e
 * movimento dentro do WebGL, sem vídeo.
 *
 *  - Cada foto tem um mapa de profundidade (public/foto/*-prof.jpg). A câmera
 *    "anda" alguns milímetros e o que está perto se desloca mais que o fundo:
 *    é o efeito 2.5D que dá volume à cereja, ao grão e à xícara.
 *  - Pequenos movimentos locais deixam a foto viva: o fio de café escorre,
 *    a crema gira, o ar do tambor tremula, a brasa pulsa, as folhas balançam.
 *  - A troca de cena é uma dissolução com ruído e um leve mergulho de câmera.
 *  - No celular a foto ocupa a tela inteira. Em telas largas ela vira um painel
 *    vertical nítido, com a própria foto desfocada preenchendo o resto, para
 *    não esticar uma imagem vertical numa tela horizontal.
 *
 * Coordenadas de cada efeito são dadas na foto, com origem no canto superior
 * esquerdo (0..1), do jeito que se mede olhando a imagem.
 */

export type ParticleMode = "poeira" | "brasa" | "vapor" | "po" | "nenhuma";

export type Shot = {
  src: string;
  depth: string;
  /** ponto de interesse; o zoom acontece em volta dele */
  focus?: [number, number];
  /** zoom no início e no fim da cena (push-in lento) */
  zoom?: [number, number];
  /** intensidade do deslocamento por profundidade */
  parallax?: number;
  /** faixa de líquido escorrendo: x0, x1, y0, y1 */
  flow?: [number, number, number, number];
  /** redemoinho: x, y, raio, intensidade */
  swirl?: [number, number, number, number];
  heat?: number;
  glow?: number;
  wind?: number;
  particles?: ParticleMode;
  /** origem das partículas na foto */
  emitter?: [number, number];
  /** brilho/tom da foto (1 = original) */
  grade?: [number, number];
};

type Props = {
  shots: Shot[];
  /** progresso em que cada foto passa a ser a principal (crescente) */
  stops: number[];
  progress: { current: number };
  pointer?: { current: { x: number; y: number } };
  reduced: boolean;
  /** largura da janela de transição, em progresso */
  fade?: number;
  /** posição horizontal do painel em telas largas (0..1) */
  panelX?: number;
  particles?: number;
  /** escurece a foto conforme a seção vai embora (hero) */
  exit?: boolean;
  /** "cover" mantém a foto em tela cheia também no computador */
  layout?: "auto" | "cover";
};

const IMG_ASPECT = 940 / 1672;
const MODE: Record<ParticleMode, number> = { nenhuma: 0, poeira: 1, brasa: 2, vapor: 3, po: 4 };

const COMMON = /* glsl */ `
uniform float uAspect;
uniform float uPanel;
uniform float uPanelX;
uniform float uPanelH;

vec2 panelSize() {
  float h = uPanelH;
  return vec2(h * ${IMG_ASPECT.toFixed(5)} / uAspect, h);
}
vec2 panelOrigin() {
  vec2 s = panelSize();
  return vec2(uPanelX - s.x * 0.5, 0.5 - s.y * 0.5);
}
// tela (0..1) -> foto (0..1), cobrindo a tela inteira
vec2 coverUv(vec2 s) {
  float ia = ${IMG_ASPECT.toFixed(5)};
  vec2 c = s;
  if (uAspect > ia) c.y = 0.5 + (s.y - 0.5) * (ia / uAspect);
  else c.x = 0.5 + (s.x - 0.5) * (uAspect / ia);
  return c;
}
vec2 coverInv(vec2 c) {
  float ia = ${IMG_ASPECT.toFixed(5)};
  vec2 s = c;
  if (uAspect > ia) s.y = 0.5 + (c.y - 0.5) * (uAspect / ia);
  else s.x = 0.5 + (c.x - 0.5) * (ia / uAspect);
  return s;
}
// mapeia a tela para a foto (sem zoom), em modo tela cheia ou painel
vec2 screenToPhoto(vec2 s) {
  if (uPanel > 0.5) return (s - panelOrigin()) / panelSize();
  return coverUv(s);
}
vec2 photoToScreen(vec2 c) {
  if (uPanel > 0.5) return panelOrigin() + c * panelSize();
  return coverInv(c);
}
float hash(vec2 p) { return fract(sin(dot(p, vec2(127.1, 311.7))) * 43758.5453); }
float noise(vec2 p) {
  vec2 i = floor(p); vec2 f = fract(p);
  vec2 u = f * f * (3.0 - 2.0 * f);
  return mix(mix(hash(i), hash(i + vec2(1, 0)), u.x), mix(hash(i + vec2(0, 1)), hash(i + vec2(1, 1)), u.x), u.y);
}
`;

const VERT = /* glsl */ `
varying vec2 vS;
void main() {
  vS = position.xy * 0.5 + 0.5;
  gl_Position = vec4(position.xy, 0.0, 1.0);
}
`;

const FRAG = /* glsl */ `
precision highp float;
varying vec2 vS;
uniform sampler2D tA; uniform sampler2D dA;
uniform sampler2D tB; uniform sampler2D dB;
uniform float uMix;
uniform float uTime;
uniform float uMotion;
uniform vec2 uCam;      // deslocamento de câmera (parallax)
uniform float uExit;
// por foto: foco.xy, zoom, parallax
uniform vec4 uViewA; uniform vec4 uViewB;
uniform vec4 uFlowA; uniform vec4 uFlowB;
uniform vec4 uSwirlA; uniform vec4 uSwirlB;
uniform vec4 uFxA; uniform vec4 uFxB;   // heat, glow, wind, local progress
uniform vec2 uGradeA; uniform vec2 uGradeB;
${COMMON}

// foto em coordenadas de textura (origem embaixo). Os parâmetros chegam com
// origem em cima e são convertidos aqui.
vec3 shot(sampler2D tex, sampler2D dep, vec2 c, vec4 view, vec4 flow, vec4 swirl, vec4 fx, vec2 grade, float extraZoom, float lod) {
  vec2 focus = vec2(view.x, 1.0 - view.y);
  float zoom = view.z * extraZoom;
  vec2 uv = focus + (c - focus) / zoom;
  float t = uTime * uMotion;

  // folhas e galhos balançando: mais forte no que está perto
  float near = texture2D(dep, uv).r;
  uv.x += sin(t * 1.1 + uv.y * 7.0) * 0.0022 * fx.z * near;
  uv.y += cos(t * 0.8 + uv.x * 5.0) * 0.0012 * fx.z * near;

  // parallax por profundidade
  uv += (near - 0.45) * uCam * view.w;

  // ar quente do tambor
  if (fx.x > 0.0) {
    vec2 q = uv * vec2(18.0, 26.0) + vec2(0.0, -t * 1.6);
    uv += (vec2(noise(q), noise(q + 7.3)) - 0.5) * 0.006 * fx.x;
  }

  // fio de líquido escorrendo para baixo
  if (flow.y > flow.x) {
    vec2 p = vec2(uv.x, 1.0 - uv.y);
    float m = smoothstep(flow.x - 0.02, flow.x + 0.01, p.x) * (1.0 - smoothstep(flow.y - 0.01, flow.y + 0.02, p.x))
            * smoothstep(flow.z - 0.02, flow.z + 0.03, p.y) * (1.0 - smoothstep(flow.w - 0.04, flow.w + 0.01, p.y));
    float n = noise(vec2(p.x * 60.0, p.y * 9.0 - t * 5.5));
    uv.x += (n - 0.5) * 0.007 * m;
    uv.y += (noise(vec2(p.x * 30.0 + 3.1, p.y * 14.0 - t * 7.0)) - 0.5) * 0.012 * m;
  }

  // redemoinho da crema / da superfície do café
  if (swirl.z > 0.0) {
    vec2 ctr = vec2(swirl.x, 1.0 - swirl.y);
    vec2 d = uv - ctr; d.x *= ${IMG_ASPECT.toFixed(5)};
    float r = length(d) / swirl.z;
    float k = pow(max(0.0, 1.0 - r), 2.0);
    float a = swirl.w * k * (0.55 * fx.w + 0.12 * sin(t * 0.35));
    float cs = cos(a), sn = sin(a);
    d = mat2(cs, -sn, sn, cs) * d;
    d.x /= ${IMG_ASPECT.toFixed(5)};
    uv = ctr + d;
  }

  vec3 col = lod > 0.0 ? texture2D(tex, clamp(uv, 0.001, 0.999), lod).rgb : texture2D(tex, clamp(uv, 0.001, 0.999)).rgb;

  // brasa e luz quente pulsando
  if (fx.y > 0.0) {
    float warm = smoothstep(0.45, 0.95, col.r) * smoothstep(0.55, 0.05, col.b) * smoothstep(0.15, 0.6, col.r - col.b);
    float pulse = 0.5 + 0.5 * sin(t * 2.6 + noise(uv * 9.0) * 6.28);
    col += col * warm * fx.y * (0.1 + 0.25 * pulse);
  }
  col *= grade.x;
  col = mix(vec3(dot(col, vec3(0.299, 0.587, 0.114))), col, grade.y);
  return col;
}

void main() {
  vec2 c = screenToPhoto(vS);
  float m = uMix;
  // mergulho: a foto que sai avança, a que entra chega de um pouco mais perto
  float zA = 1.0 + m * 0.12;
  float zB = 1.12 - m * 0.12;

  float inside = 1.0;
  if (uPanel > 0.5) {
    vec2 q = abs(c - 0.5) - vec2(0.5);
    float rr = 0.035;
    vec2 qq = (c - 0.5) * vec2(${IMG_ASPECT.toFixed(5)}, 1.0);
    float edge = length(max(abs(qq) - vec2(0.5 * ${IMG_ASPECT.toFixed(5)} - rr, 0.5 - rr), 0.0)) - rr;
    inside = 1.0 - smoothstep(-0.002, 0.002, edge);
  }

  vec3 colA = shot(tA, dA, c, uViewA, uFlowA, uSwirlA, uFxA, uGradeA, zA, 0.0);
  vec3 col = colA;
  if (m > 0.001) {
    vec3 colB = shot(tB, dB, c, uViewB, uFlowB, uSwirlB, uFxB, uGradeB, zB, 0.0);
    float n = noise(c * vec2(5.0, 8.0) + 3.0) * 0.6 + noise(c * 23.0) * 0.4;
    float a = smoothstep(n - 0.18, n + 0.18, m * 1.36 - 0.18);
    col = mix(colA, colB, a);
    col *= 1.0 + 0.18 * sin(3.14159 * m) * (1.0 - abs(a - 0.5) * 2.0);
  }

  if (uPanel > 0.5) {
    // fundo: a própria foto, muito desfocada e escura, cobrindo a tela
    vec2 cc = coverUv(vS);
    vec3 amb = mix(texture2D(tA, cc, 6.0).rgb, texture2D(tB, cc, 6.0).rgb, smoothstep(0.2, 0.8, m));
    amb *= 0.32;
    // sombra do painel
    vec2 ps = panelSize(); vec2 po = panelOrigin();
    vec2 l = (vS - po) / ps;
    vec2 dd = max(abs(l - 0.5) - 0.5, 0.0) * ps * vec2(uAspect, 1.0);
    float sh = smoothstep(0.09, 0.0, length(dd));
    amb *= 1.0 - 0.55 * sh;
    col = mix(amb, col, inside);
  }

  // vinheta e saída do hero
  vec2 v = vS - 0.5;
  col *= 1.0 - dot(v, v) * 0.55;
  col *= 1.0 - uExit * 0.55;
  gl_FragColor = vec4(col, 1.0);
}
`;

const PART_VERT = /* glsl */ `
attribute vec4 aSeed;
uniform float uTime;
uniform float uMode;
uniform float uMotion;
uniform vec2 uEmit;
uniform vec4 uView;
uniform float uPx;
uniform float uFadeIn;
varying float vA;
varying float vMode;
${COMMON}
void main() {
  float t = uTime * mix(0.35, 1.0, uMotion);
  float life = fract(aSeed.w + t * (0.06 + aSeed.z * 0.05));
  vec2 p; float size = 0.0; float a = 0.0;
  vec2 e = uEmit;
  if (uMode < 1.5) {            // poeira dourada flutuando na luz
    p = vec2(aSeed.x, aSeed.y) + vec2(sin(t * 0.2 + aSeed.w * 6.28) * 0.04 + life * 0.05, -life * 0.12);
    p = fract(p);
    size = 2.0 + aSeed.z * 3.0;
    a = (0.25 + 0.5 * aSeed.z) * sin(3.14159 * life) * (0.6 + 0.4 * sin(t * 3.0 + aSeed.w * 40.0));
  } else if (uMode < 2.5) {     // brasas subindo
    p = vec2(aSeed.x, 1.05 - life * 1.2) + vec2(sin(life * 12.0 + aSeed.w * 6.28) * 0.025, 0.0);
    size = 2.0 + aSeed.z * 4.0;
    a = smoothstep(0.0, 0.1, life) * (1.0 - smoothstep(0.55, 1.0, life)) * (0.5 + 0.5 * aSeed.z);
  } else if (uMode < 3.5) {     // vapor saindo da xícara
    float ang = (aSeed.x - 0.5) * 0.5;
    p = e + vec2((aSeed.x - 0.5) * 0.28 + sin(life * 5.0 + aSeed.w * 6.28) * 0.04 * life, -life * 0.42);
    size = 30.0 + life * 90.0 * (0.6 + aSeed.z);
    a = smoothstep(0.0, 0.25, life) * (1.0 - smoothstep(0.45, 1.0, life)) * 0.11;
  } else {                      // pó de café se espalhando
    float ang = aSeed.x * 6.28318;
    float sp = 0.12 + aSeed.y * 0.32;
    p = e + vec2(cos(ang), sin(ang) * 0.6) * sp * life + vec2(0.0, life * life * 0.1);
    size = 1.5 + aSeed.z * 3.5;
    a = (1.0 - smoothstep(0.6, 1.0, life)) * smoothstep(0.0, 0.05, life) * 0.85;
  }
  // a partícula vive na foto: aplica o mesmo zoom da cena e converte para a tela
  vec2 focus = uView.xy;
  vec2 c = focus + (p - focus) * uView.z;
  vec2 s = photoToScreen(vec2(c.x, 1.0 - c.y));
  gl_Position = vec4(s * 2.0 - 1.0, 0.0, 1.0);
  gl_PointSize = size * uPx;
  vA = a * uFadeIn;
  vMode = uMode;
}
`;

const PART_FRAG = /* glsl */ `
precision highp float;
varying float vA;
varying float vMode;
void main() {
  vec2 d = gl_PointCoord - 0.5;
  float r = length(d);
  float soft = vMode > 2.5 && vMode < 3.5 ? smoothstep(0.5, 0.0, r) : smoothstep(0.5, 0.15, r);
  vec3 c = vMode < 1.5 ? vec3(1.0, 0.82, 0.52)
         : vMode < 2.5 ? vec3(1.0, 0.45, 0.12) * (1.4 - r)
         : vMode < 3.5 ? vec3(0.95, 0.88, 0.8)
         : vec3(0.42, 0.24, 0.12);
  float a = vA * soft;
  if (a < 0.003) discard;
  gl_FragColor = vec4(c * a, vMode > 3.5 ? a : a);
}
`;

const loader = typeof window !== "undefined" ? new THREE.TextureLoader() : null;
function loadTex(src: string, onLoad: () => void) {
  const t = loader!.load(src, onLoad);
  t.colorSpace = THREE.NoColorSpace;
  t.minFilter = THREE.LinearMipmapLinearFilter;
  t.magFilter = THREE.LinearFilter;
  t.generateMipmaps = true;
  t.anisotropy = 4;
  return t;
}

const v4 = (a?: number[], fallback: number[] = [0, 0, 0, 0]) =>
  new THREE.Vector4(...((a ?? fallback).concat(fallback).slice(0, 4) as [number, number, number, number]));

function makeParticles(n: number) {
  const g = new THREE.BufferGeometry();
  const seed = new Float32Array(n * 4);
  const pos = new Float32Array(n * 3);
  let s = 12345;
  const r = () => ((s = (s * 16807) % 2147483647) - 1) / 2147483646;
  for (let i = 0; i < n * 4; i++) seed[i] = r();
  g.setAttribute("position", new THREE.BufferAttribute(pos, 3));
  g.setAttribute("aSeed", new THREE.BufferAttribute(seed, 4));
  return g;
}

export function PhotoStage({
  shots,
  stops,
  progress,
  pointer,
  reduced,
  fade = 0.04,
  panelX = 0.66,
  particles = 380,
  exit = false,
  layout = "auto",
}: Props) {
  const size = useThree((s) => s.size);
  const dpr = useThree((s) => s.viewport.dpr);
  const ready = useRef<boolean[]>([]);

  const textures = useMemo(
    () =>
      shots.map((s, i) => ({
        img: loadTex(s.src, () => (ready.current[i] = true)),
        dep: loadTex(s.depth, () => {}),
      })),
    // as fotos de uma seção não mudam depois de montadas
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [],
  );
  useEffect(
    () => () =>
      textures.forEach((t) => {
        t.img.dispose();
        t.dep.dispose();
      }),
    [textures],
  );

  const common = useMemo(
    () => ({
      uAspect: { value: 1 },
      uPanel: { value: 0 },
      uPanelX: { value: panelX },
      uPanelH: { value: 0.9 },
      uTime: { value: 0 },
      uMotion: { value: reduced ? 0.4 : 1 },
    }),
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [],
  );

  const material = useMemo(
    () =>
      new THREE.ShaderMaterial({
        vertexShader: VERT,
        fragmentShader: FRAG,
        depthTest: false,
        depthWrite: false,
        uniforms: {
          ...common,
          tA: { value: textures[0].img },
          dA: { value: textures[0].dep },
          tB: { value: textures[Math.min(1, textures.length - 1)].img },
          dB: { value: textures[Math.min(1, textures.length - 1)].dep },
          uMix: { value: 0 },
          uCam: { value: new THREE.Vector2() },
          uExit: { value: 0 },
          uViewA: { value: new THREE.Vector4(0.5, 0.5, 1, 1) },
          uViewB: { value: new THREE.Vector4(0.5, 0.5, 1, 1) },
          uFlowA: { value: new THREE.Vector4() },
          uFlowB: { value: new THREE.Vector4() },
          uSwirlA: { value: new THREE.Vector4() },
          uSwirlB: { value: new THREE.Vector4() },
          uFxA: { value: new THREE.Vector4() },
          uFxB: { value: new THREE.Vector4() },
          uGradeA: { value: new THREE.Vector2(1, 1) },
          uGradeB: { value: new THREE.Vector2(1, 1) },
        },
      }),
    [common, textures],
  );

  const partGeo = useMemo(() => makeParticles(particles), [particles]);
  const partMats = useMemo(
    () =>
      [0, 1].map(
        () =>
          new THREE.ShaderMaterial({
            vertexShader: PART_VERT,
            fragmentShader: PART_FRAG,
            transparent: true,
            depthTest: false,
            depthWrite: false,
            blending: THREE.AdditiveBlending,
            uniforms: {
              ...common,
              uMode: { value: 0 },
              uEmit: { value: new THREE.Vector2(0.5, 0.5) },
              uView: { value: new THREE.Vector4(0.5, 0.5, 1, 0) },
              uPx: { value: 1 },
              uFadeIn: { value: 1 },
            },
          }),
      ),
    [common],
  );
  useEffect(
    () => () => {
      material.dispose();
      partGeo.dispose();
      partMats.forEach((m) => m.dispose());
    },
    [material, partGeo, partMats],
  );

  const cam = useRef(new THREE.Vector2());
  const shown = useRef(0);

  useFrame((state, delta) => {
    const dt = Math.min(delta, 0.05);
    const p = clamp01(progress.current);
    const u = material.uniforms;
    common.uTime.value += dt;
    common.uMotion.value = reduced ? 0.4 : 1;

    const aspect = size.width / Math.max(1, size.height);
    common.uAspect.value = aspect;
    const wide = layout === "auto" && aspect > 0.95;
    common.uPanel.value = wide ? 1 : 0;
    common.uPanelH.value = aspect > 1.9 ? 0.86 : 0.9;
    // o painel nunca encosta no texto em telas apenas um pouco largas
    common.uPanelX.value = aspect < 1.3 ? Math.max(panelX, 0.7) : panelX;

    // qual foto está na frente e quanto da próxima já entrou
    let i = 0;
    for (let k = 0; k < stops.length; k++) if (p >= stops[k]) i = k;
    const j = Math.min(i + 1, shots.length - 1);
    const next = stops[j] ?? 1;
    const mix = j === i ? 0 : smoothstep(next - fade, next, p);
    const span = Math.max(1e-4, (stops[j] ?? 1) - stops[i]);
    const local = j === i ? clamp01((p - stops[i]) / Math.max(1e-4, 1 - stops[i])) : clamp01((p - stops[i]) / span);

    // só mostra uma foto que já chegou; a transição espera a próxima carregar
    const okB = ready.current[j];
    const A = shots[i];
    const B = shots[j];
    u.tA.value = textures[i].img;
    u.dA.value = textures[i].dep;
    u.tB.value = textures[j].img;
    u.dB.value = textures[j].dep;
    u.uMix.value = okB ? mix : 0;

    const setView = (v: THREE.Vector4, s: Shot, lp: number) => {
      const z = s.zoom ?? [1.02, 1.1];
      v.set(s.focus?.[0] ?? 0.5, s.focus?.[1] ?? 0.5, z[0] + (z[1] - z[0]) * lp, (s.parallax ?? 1) * (reduced ? 0.6 : 1));
    };
    setView(u.uViewA.value, A, local);
    setView(u.uViewB.value, B, 0);
    u.uFlowA.value.copy(v4(A.flow));
    u.uFlowB.value.copy(v4(B.flow));
    u.uSwirlA.value.copy(v4(A.swirl));
    u.uSwirlB.value.copy(v4(B.swirl));
    u.uFxA.value.set(A.heat ?? 0, A.glow ?? 0, A.wind ?? 0, local);
    u.uFxB.value.set(B.heat ?? 0, B.glow ?? 0, B.wind ?? 0, 0);
    u.uGradeA.value.set(A.grade?.[0] ?? 1, A.grade?.[1] ?? 1);
    u.uGradeB.value.set(B.grade?.[0] ?? 1, B.grade?.[1] ?? 1);

    // câmera: deriva lenta com a rolagem, respiração no tempo e o ponteiro
    const t = common.uTime.value;
    const px = pointer?.current.x ?? 0;
    const py = pointer?.current.y ?? 0;
    const tx = Math.sin(local * Math.PI * 1.2 - 0.6) * 0.012 + Math.sin(t * 0.21) * 0.004 + px * 0.01;
    const ty = Math.cos(local * Math.PI) * 0.008 + Math.cos(t * 0.17) * 0.003 - py * 0.008;
    cam.current.x = damp(cam.current.x, tx, 3, dt);
    cam.current.y = damp(cam.current.y, ty, 3, dt);
    u.uCam.value.copy(cam.current);
    u.uExit.value = exit ? smoothstep(0.05, 0.95, p) : 0;

    shown.current = damp(shown.current, ready.current[i] ? 1 : 0, 4, dt);

    // partículas: uma camada para a foto da frente, outra para a que entra
    const px2 = Math.min(dpr, 1.75) * (size.height / 900) * 1.4;
    [
      [partMats[0], A, 1 - (okB ? mix : 0), local],
      [partMats[1], B, okB ? mix : 0, 0],
    ].forEach(([mat, s, w, lp]) => {
      const m = mat as THREE.ShaderMaterial;
      const sh = s as Shot;
      m.uniforms.uMode.value = MODE[sh.particles ?? "nenhuma"];
      m.uniforms.uEmit.value.set(sh.emitter?.[0] ?? 0.5, sh.emitter?.[1] ?? 0.5);
      const z = sh.zoom ?? [1.02, 1.1];
      const zz = z[0] + (z[1] - z[0]) * (lp as number);
      m.uniforms.uView.value.set(sh.focus?.[0] ?? 0.5, sh.focus?.[1] ?? 0.5, zz, 0);
      m.uniforms.uPx.value = px2;
      m.uniforms.uFadeIn.value = (w as number) * shown.current;
    });
  });

  return (
    <>
      <mesh material={material} frustumCulled={false} renderOrder={0}>
        <planeGeometry args={[2, 2]} />
      </mesh>
      {partMats.map((m, k) => (
        <points key={k} geometry={partGeo} material={m} frustumCulled={false} renderOrder={1 + k} />
      ))}
    </>
  );
}
