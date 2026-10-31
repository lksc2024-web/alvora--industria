"use client";

import { useFrame, useThree } from "@react-three/fiber";
import { useEffect, useMemo, useRef } from "react";
import * as THREE from "three";

import type { ProgressRef } from "@/lib/hooks";
import { clamp01, damp } from "./util";

/**
 * Foto viva: a imagem realista é o próprio material, e o movimento acontece
 * dentro dela.
 *
 *  - Campos de fluxo deslocam os pixels da foto: o tambor gira o leito de
 *    grãos, a cascata desce, a bandeja de resfriamento roda, o fio de café
 *    escorre, a crema gira e o vapor sobe. É a técnica de flowmap em duas
 *    fases, com a fase desencontrada por ruído para não pulsar.
 *  - Grãos recortados da foto de produto caem por cima, com gravidade e giro,
 *    e somem ao entrar no leito.
 *  - O fio de café pode terminar: acima de `cut` a foto mostra a versão sem o
 *    fio (preenchida a partir dos lados), e a cauda afina até sumir.
 *  - Quem decide câmera, troca de foto e tempos é o `direct` de cada seção.
 *
 * Coordenadas na foto: origem no canto superior esquerdo, 0..1, como se mede
 * olhando a imagem. Larguras e deslocamentos horizontais em fração da largura,
 * verticais em fração da altura.
 */

export type ParticleMode = "nenhuma" | "poeira" | "brasa" | "vapor" | "po";

type XY = [number, number];

export type LiveShot = {
  src: string;
  /** a mesma foto sem o fio de café, para o fim do despejo */
  alt?: string;
  /** cascatas: de, até, meia largura, deslocamento por ciclo */
  streams?: { from: XY; to: XY; width: number; speed: number; feather?: number; taper?: number }[];
  /** rotação dentro de uma elipse: tambor, crema */
  spin?: Spin;
  /** segunda rotação (bandeja de resfriamento, borda da crema) */
  churn?: Spin;
  /** pó se espalhando a partir de um ponto (moagem) */
  burst?: { center: XY; radius: XY; speed: number };
  /** ondas a partir de um ponto, achatadas em perspectiva */
  ripple?: { center: XY; radius: XY; amp: number; freq: number; speed: number };
  /** vapor/fumaça subindo dentro de uma caixa x0, x1, y0, y1 */
  steam?: { box: [number, number, number, number]; speed: number; wiggle?: number; notch?: XY };
  heat?: number;
  glow?: number;
  /** duração de um ciclo de fluxo, em segundos */
  period?: number;
  /** brilho e saturação */
  grade?: XY;
  particles?: ParticleMode;
  emitter?: XY;
  /** grãos caindo da borda do tambor */
  beans?: { lip: [number, number, number, number]; land: XY; gravity: number; size: number };
};

type Spin = {
  center: XY;
  radius: XY;
  tilt?: number;
  /** ângulo por ciclo, em radianos; o sinal decide o sentido */
  speed: number;
  feather?: number;
  /** só atua abaixo desta altura da foto */
  below?: number;
};

export type Direction = {
  a: number;
  b?: number;
  mix?: number;
  focusA?: XY;
  focusB?: XY;
  zoomA?: number;
  zoomB?: number;
  /** altura da cauda do fio; negativo = fio inteiro */
  cut?: number;
  /** borrão radial da travessia entre fotos */
  blur?: number;
  /** quanto do tom claro de torra inicial (0 = foto original) */
  tone?: number;
  /** força dos efeitos de calor (multiplica heat/glow) */
  heat?: number;
  /** densidade dos grãos caindo (0..1) */
  beans?: number;
  /** escurece a cena (0..1) */
  dim?: number;
  /** força das ondas da foto da frente */
  ripple?: number;
  /**
   * Fotos empilhadas na vertical (índices 0..n da lista): `y` é a altura da
   * pilha no centro da tela, em alturas de foto. Acima de 0 não há foto e a
   * camada fica transparente, deixando ver a cena 3D.
   */
  stack?: { y: number; x: number; zoom: number; count: number };
};

type Props = {
  shots: LiveShot[];
  direct: (p: number) => Direction;
  progress: ProgressRef;
  reduced: boolean;
  panelX?: number;
  particles?: number;
  beans?: number;
};

const IMG_ASPECT = 940 / 1672;
const IA = IMG_ASPECT.toFixed(5);
const MODE: Record<ParticleMode, number> = { nenhuma: 0, poeira: 1, brasa: 2, vapor: 3, po: 4 };

/** Centro e meia largura do fio em 10-cafe-caindo, de y = 0 a y = 0.4725. */
const FIO_CX = [0.5383, 0.5346, 0.5324, 0.5309, 0.5293, 0.5287, 0.5282, 0.5271, 0.5255, 0.5213, 0.517, 0.5154, 0.5138, 0.5133, 0.5133, 0.5133, 0.5138];
const FIO_HW = [0.1, 0.0963, 0.0888, 0.0787, 0.0665, 0.0606, 0.0548, 0.0527, 0.0511, 0.0489, 0.0468, 0.0452, 0.0436, 0.0431, 0.042, 0.042, 0.0436];

const COMMON = /* glsl */ `
uniform float uAspect;
uniform float uPanel;
uniform float uPanelX;
uniform float uPanelH;
vec2 panelSize() { return vec2(uPanelH * ${IA} / uAspect, uPanelH); }
vec2 panelOrigin() { vec2 s = panelSize(); return vec2(uPanelX - s.x * 0.5, 0.5 - s.y * 0.5); }
vec2 coverUv(vec2 s) {
  vec2 c = s;
  if (uAspect > ${IA}) c.y = 0.5 + (s.y - 0.5) * (${IA} / uAspect);
  else c.x = 0.5 + (s.x - 0.5) * (uAspect / ${IA});
  return c;
}
vec2 coverInv(vec2 c) {
  vec2 s = c;
  if (uAspect > ${IA}) s.y = 0.5 + (c.y - 0.5) * (uAspect / ${IA});
  else s.x = 0.5 + (c.x - 0.5) * (${IA} / uAspect);
  return s;
}
// tela (y para cima) <-> foto (y para baixo)
vec2 screenToPhoto(vec2 s) {
  vec2 c = uPanel > 0.5 ? (s - panelOrigin()) / panelSize() : coverUv(s);
  return vec2(c.x, 1.0 - c.y);
}
vec2 photoToScreen(vec2 p) {
  vec2 c = vec2(p.x, 1.0 - p.y);
  return uPanel > 0.5 ? panelOrigin() + c * panelSize() : coverInv(c);
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
struct Shot {
  vec4 view;               // foco.xy, zoom, -
  vec4 s0a; vec4 s0b;      // cascata 1
  vec4 s1a; vec4 s1b;      // cascata 2
  vec4 spa; vec4 spb;      // rotação
  vec4 cha; vec4 chb;      // segunda rotação
  vec4 rpa; vec4 rpb;      // ondas
  vec4 sma; vec4 smb;      // vapor
  vec4 bua; vec4 bub;      // explosão de pó
  vec4 fx;                 // heat, glow, -, -
  vec4 grade;              // brilho, saturação, período, tom de torra
};
uniform Shot uA;
uniform Shot uB;
uniform sampler2D tA;
uniform sampler2D tB;
uniform sampler2D tAlt;
uniform float uMix;
uniform float uStack;   // 1 = fotos empilhadas, a de baixo continua a de cima
uniform float uNoA;     // acima da pilha não há foto: mostra a cena 3D por trás
uniform float uNoB;     // última foto da pilha: nada abaixo dela
uniform float uAmbB;
uniform float uTime;
uniform float uBlur;
uniform float uDim;
uniform float uCut;
uniform float uCx[17];
uniform float uHw[17];
${COMMON}

vec2 rot(vec2 v, float a) { float c = cos(a), s = sin(a); return vec2(c * v.x - s * v.y, s * v.x + c * v.y); }
vec2 met(vec2 p) { return vec2(p.x * ${IA}, p.y); }
vec2 unmet(vec2 v) { return vec2(v.x / ${IA}, v.y); }

vec2 streamD(vec2 p, vec4 a, vec4 b) {
  if (b.y == 0.0) return vec2(0.0);
  vec2 P = met(p), A = met(a.xy), B = met(a.zw);
  vec2 d = B - A; float L = length(d); vec2 dir = d / L;
  float t = dot(P - A, dir);
  float off = abs(dot(P - A, vec2(-dir.y, dir.x)));
  // a cascata abre (taper > 1) ou o fio afina (taper < 1) conforme desce
  float hw = b.x * ${IA} * mix(1.0, b.w, clamp(t / L, 0.0, 1.0));
  float m = smoothstep(hw, hw * (1.0 - b.z), off) * smoothstep(-0.04, 0.02, t) * smoothstep(L + 0.04, L - 0.02, t);
  return unmet(dir * b.y * m);
}

vec2 spinD(vec2 p, vec4 a, vec4 b) {
  if (b.y == 0.0) return vec2(0.0);
  vec2 R = vec2(a.z * ${IA}, a.w);
  vec2 q = rot(met(p - a.xy), -b.x) / R;
  float r = length(q);
  float m = smoothstep(1.0, 1.0 - b.z, r);
  if (b.w > 0.0) m *= smoothstep(b.w - 0.03, b.w + 0.03, p.y);
  return unmet(rot(vec2(-q.y, q.x) * R * b.y, b.x) * m);
}

vec2 steamD(vec2 p, vec4 a, vec4 b, float t) {
  if (b.x == 0.0) return vec2(0.0);
  float m = smoothstep(a.x, a.x + 0.08, p.x) * smoothstep(a.y, a.y - 0.08, p.x)
          * smoothstep(a.z, a.z + 0.08, p.y) * smoothstep(a.w, a.w - 0.08, p.y);
  if (b.w > 0.0) m *= smoothstep(b.w * 0.6, b.w * 1.4, abs(p.x - b.z));
  float w = noise(p * vec2(5.0, 3.0) + vec2(0.0, t * 0.12)) - 0.5;
  return vec2(w * b.y, -1.0) * b.x * m;
}

vec2 burstD(vec2 p, vec4 a, vec4 b, float t) {
  if (b.x == 0.0) return vec2(0.0);
  vec2 q = (p - a.xy) / a.zw;
  float r = length(q);
  float m = smoothstep(1.0, 0.55, r) * smoothstep(0.05, 0.25, r);
  // as partículas mais longe do centro voam mais rápido e giram um pouco
  vec2 dir = q / max(r, 1e-4);
  dir = vec2(dir.x - dir.y * 0.25, dir.y + dir.x * 0.25);
  return dir * a.zw * b.x * m * (0.5 + r);
}

vec2 rippleO(vec2 p, vec4 a, vec4 b, float t) {
  if (b.x == 0.0) return vec2(0.0);
  vec2 q = (p - a.xy) / a.zw;
  float r = length(q);
  float w = sin(r * b.y - t * b.z) * smoothstep(1.0, 0.25, r) * smoothstep(0.02, 0.15, r);
  return q / max(r, 1e-4) * a.zw * w * b.x;
}

vec3 tx(sampler2D tex, vec2 p, float bias) {
  // fora da foto, espelha em vez de repetir a última linha (que vira listras)
  vec2 m = 1.0 - abs(1.0 - abs(p));
  vec2 uv = clamp(vec2(m.x, 1.0 - m.y), 0.001, 0.999);
  return bias > 0.0 ? texture2D(tex, uv, bias).rgb : texture2D(tex, uv).rgb;
}

vec3 look(sampler2D tex, vec2 p, Shot S, float t, float bias) {
  p += rippleO(p, S.rpa, S.rpb, t);
  if (S.fx.x > 0.0) {
    vec2 q = p * vec2(16.0, 22.0) + vec2(0.0, t * 1.4);
    p += (vec2(noise(q), noise(q + 7.3)) - 0.5) * 0.006 * S.fx.x;
  }
  vec2 D = streamD(p, S.s0a, S.s0b) + streamD(p, S.s1a, S.s1b)
         + spinD(p, S.spa, S.spb) + spinD(p, S.cha, S.chb)
         + steamD(p, S.sma, S.smb, t) + burstD(p, S.bua, S.bub, t);
  // perto das bordas da foto o fluxo some: nada é puxado de fora da imagem
  D *= smoothstep(0.0, 0.1, p.y) * smoothstep(1.0, 0.9, p.y) * smoothstep(0.0, 0.06, p.x) * smoothstep(1.0, 0.94, p.x);
  if (dot(D, D) < 1e-10) return tx(tex, p, bias);
  float T = max(S.grade.z, 0.1);
  float ph = fract(t / T + noise(p * 4.0) * 0.7 + noise(p * 11.0) * 0.3);
  float ph2 = fract(ph + 0.5);
  vec3 c0 = tx(tex, p - D * (ph - 0.5), bias);
  vec3 c1 = tx(tex, p - D * (ph2 - 0.5), bias);
  return mix(c0, c1, abs(1.0 - 2.0 * ph));
}

// 1 onde o fio já passou e a foto deve mostrar a versão sem ele
float tailMask(vec2 p) {
  if (uCut < -0.5) return 0.0;
  float yi = clamp(p.y / 0.4725, 0.0, 1.0) * 16.0;
  int i = int(min(floor(yi), 15.0));
  float f = yi - float(i);
  float cx = mix(uCx[i], uCx[i + 1], f);
  float hw = mix(uHw[i], uHw[i + 1], f);
  float dx = abs(p.x - cx);
  float band = smoothstep(hw + 0.01, hw - 0.004, dx) * smoothstep(0.5, 0.47, p.y);
  float keepW = hw * 0.5 * smoothstep(uCut - 0.09, uCut, p.y);
  float gone = 1.0 - smoothstep(uCut - 0.004, uCut + 0.004, p.y);
  return band * max(gone * smoothstep(keepW - 0.003, keepW + 0.003, dx), smoothstep(0.47, 0.5, uCut) * band);
}

vec3 grade(vec3 col, Shot S, vec2 p, float t) {
  // brasa e luz quente pulsando
  if (S.fx.y > 0.0) {
    float warm = smoothstep(0.45, 0.95, col.r) * smoothstep(0.55, 0.05, col.b) * smoothstep(0.15, 0.6, col.r - col.b);
    float pulse = 0.5 + 0.5 * sin(t * 2.4 + noise(p * 9.0) * 6.28);
    col += col * warm * S.fx.y * (0.08 + 0.22 * pulse);
  }
  // torra clara do início: canela, menos contraste
  if (S.grade.w > 0.0) {
    // levanta os meios-tons e puxa para o dourado, sem lavar a cor
    vec3 cin = pow(max(col, 0.0), vec3(0.78, 0.8, 0.9)) * vec3(1.1, 0.99, 0.74);
    col = mix(col, cin, S.grade.w * 0.65);
  }
  col *= S.grade.x;
  col = mix(vec3(dot(col, vec3(0.299, 0.587, 0.114))), col, S.grade.y);
  return col;
}

vec3 shotColor(sampler2D tex, vec2 c, Shot S, float t, bool alt) {
  // view.xy é o ponto da foto que fica no centro da tela
  vec2 f = S.view.xy;
  vec2 p = f + (c - 0.5) / S.view.z;
  vec3 col;
  if (uBlur > 0.001) {
    // travessia: borrão radial em direção ao foco
    col = vec3(0.0);
    vec2 d = (p - f) * uBlur * 0.012;
    float j = hash(c * 913.7);
    for (int k = 0; k < 10; k++) col += tx(tex, p - d * (float(k) + j), 2.0);
    col /= 10.0;
    col = mix(look(tex, p, S, t, 0.0), col, smoothstep(0.0, 0.25, uBlur));
  } else {
    col = look(tex, p, S, t, 0.0);
  }
  if (alt) {
    float m = tailMask(p);
    if (m > 0.0) col = mix(col, look(tAlt, p, S, t, 0.0), m);
  }
  return grade(col, S, p, t);
}

void main() {
  vec2 c = screenToPhoto(vS);
  float t = uTime;
  float inside = 1.0;
  if (uPanel > 0.5) {
    float rr = 0.035;
    vec2 qq = (c - 0.5) * vec2(${IA}, 1.0);
    float edge = length(max(abs(qq) - vec2(0.5 * ${IA} - rr, 0.5 - rr), 0.0)) - rr;
    inside = 1.0 - smoothstep(-0.002, 0.002, edge);
  }

  vec3 col = vec3(0.0);
  float alpha = 1.0;
  if (uStack > 0.5) {
    // emenda entre a base de uma foto e o topo da seguinte, com borda irregular
    float yA = uA.view.y + (c.y - 0.5) / uA.view.z;
    float xA = uA.view.x + (c.x - 0.5) / uA.view.z;
    float wob = (noise(vec2(xA * 5.0, yA * 3.0) + 1.3) - 0.5) * 0.06 + (noise(vec2(xA * 17.0, 2.0)) - 0.5) * 0.02;
    float w = uNoB > 0.5 ? 0.0 : smoothstep(0.94, 1.06, yA + wob);
    if (w < 0.999 && uNoA < 0.5) col = shotColor(tA, c, uA, t, true);
    if (w > 0.001) col = mix(col, shotColor(tB, c, uB, t, false), w);
    if (uNoA > 0.5) alpha = w;
  } else {
    col = shotColor(tA, c, uA, t, true);
    if (uMix > 0.001) {
      vec3 colB = shotColor(tB, c, uB, t, false);
      float n = noise(c * vec2(5.0, 8.0) + 3.0) * 0.6 + noise(c * 23.0) * 0.4;
      col = mix(col, colB, smoothstep(n - 0.25, n + 0.25, uMix * 1.5 - 0.25));
    }
  }

  if (uPanel > 0.5) {
    vec2 cc = coverUv(vS);
    cc.y = 1.0 - cc.y;
    vec3 amb = mix(tx(tA, cc, 6.0), tx(tB, cc, 6.0), uAmbB) * 0.3;
    vec2 ps = panelSize(); vec2 po = panelOrigin();
    vec2 l = (vS - po) / ps;
    vec2 dd = max(abs(l - 0.5) - 0.5, 0.0) * ps * vec2(uAspect, 1.0);
    amb *= 1.0 - 0.55 * smoothstep(0.09, 0.0, length(dd));
    col = mix(amb, col, inside);
  }

  vec2 v = vS - 0.5;
  col *= 1.0 - dot(v, v) * 0.5;
  col *= 1.0 - uDim * 0.6;
  gl_FragColor = vec4(col, alpha);
}
`;

const PART_VERT = /* glsl */ `
attribute vec4 aSeed;
uniform float uTime;
uniform float uMode;
uniform vec2 uEmit;
uniform vec4 uView;
uniform float uPx;
uniform float uFadeIn;
varying float vA;
varying float vMode;
${COMMON}
void main() {
  float t = uTime;
  float life = fract(aSeed.w + t * (0.06 + aSeed.z * 0.05));
  vec2 p; float size = 0.0; float a = 0.0;
  vec2 e = uEmit;
  if (uMode < 1.5) {
    p = fract(vec2(aSeed.x, aSeed.y) + vec2(sin(t * 0.2 + aSeed.w * 6.28) * 0.04 + life * 0.05, -life * 0.12));
    size = 2.0 + aSeed.z * 3.0;
    a = (0.25 + 0.5 * aSeed.z) * sin(3.14159 * life);
  } else if (uMode < 2.5) {
    p = vec2(aSeed.x, 1.05 - life * 1.2) + vec2(sin(life * 12.0 + aSeed.w * 6.28) * 0.025, 0.0);
    size = 2.0 + aSeed.z * 4.0;
    a = smoothstep(0.0, 0.1, life) * (1.0 - smoothstep(0.55, 1.0, life)) * (0.5 + 0.5 * aSeed.z);
  } else if (uMode < 3.5) {
    p = e + vec2((aSeed.x - 0.5) * 0.3 + sin(life * 5.0 + aSeed.w * 6.28) * 0.04 * life, -life * 0.4);
    size = 30.0 + life * 90.0 * (0.6 + aSeed.z);
    a = smoothstep(0.0, 0.25, life) * (1.0 - smoothstep(0.45, 1.0, life)) * 0.09;
  } else {
    float ang = aSeed.x * 6.28318;
    p = e + vec2(cos(ang), sin(ang) * 0.6) * (0.12 + aSeed.y * 0.32) * life + vec2(0.0, life * life * 0.1);
    size = 1.5 + aSeed.z * 3.5;
    a = (1.0 - smoothstep(0.6, 1.0, life)) * smoothstep(0.0, 0.05, life) * 0.85;
  }
  vec2 c = 0.5 + (p - uView.xy) * uView.z;
  gl_Position = vec4(photoToScreen(c) * 2.0 - 1.0, 0.0, 1.0);
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
  float r = length(gl_PointCoord - 0.5);
  float soft = vMode > 2.5 && vMode < 3.5 ? smoothstep(0.5, 0.0, r) : smoothstep(0.5, 0.15, r);
  vec3 c = vMode < 1.5 ? vec3(1.0, 0.82, 0.52)
         : vMode < 2.5 ? vec3(1.0, 0.45, 0.12) * (1.4 - r)
         : vMode < 3.5 ? vec3(0.95, 0.88, 0.8)
         : vec3(0.42, 0.24, 0.12);
  float a = vA * soft;
  if (a < 0.003) discard;
  gl_FragColor = vec4(c * a, a);
}
`;

const BEAN_VERT = /* glsl */ `
attribute vec4 aSeed;
uniform float uTime;
uniform vec4 uLip;
uniform vec2 uLand;
uniform float uGrav;
uniform float uSize;
uniform vec4 uView;
uniform float uPhotoPx;
uniform float uAmount;
varying float vA;
varying float vRot;
varying float vBlur;
varying float vShade;
${COMMON}
void main() {
  float T = 0.9 + aSeed.z * 0.5;
  float life = fract(aSeed.w + uTime / T);
  float tt = life * T;
  vec2 start = mix(uLip.xy, uLip.zw, aSeed.x);
  float near = aSeed.z * aSeed.z * aSeed.z;
  vec2 v0 = vec2(-0.07 + aSeed.y * 0.15 + near * 0.04, -0.02 + aSeed.x * 0.04);
  vec2 p = start + v0 * tt + vec2(0.0, 0.5 * uGrav * tt * tt);
  // os mais próximos da câmera passam deslocados e maiores
  p += vec2(0.05, 0.04) * near * tt;
  float land = mix(uLand.x, uLand.y, fract(aSeed.y * 7.13 + aSeed.x * 3.1));
  float a = smoothstep(0.0, 0.08, life) * (1.0 - smoothstep(land - 0.04, land, p.y));
  a *= step(fract(aSeed.x * 13.7 + aSeed.y * 5.3), uAmount);
  vec2 c = 0.5 + (p - uView.xy) * uView.z;
  gl_Position = vec4(photoToScreen(c) * 2.0 - 1.0, 0.0, 1.0);
  gl_PointSize = uSize * mix(0.7, 1.9, near) * uPhotoPx * uView.z;
  vA = a;
  vRot = aSeed.w * 6.28318 + tt * (aSeed.y - 0.5) * 9.0;
  vBlur = near * 2.2;
  vShade = mix(0.75, 1.1, aSeed.y);
}
`;

const BEAN_FRAG = /* glsl */ `
precision highp float;
uniform sampler2D tBean;
uniform vec3 uTint;
varying float vA;
varying float vRot;
varying float vBlur;
varying float vShade;
void main() {
  vec2 q = gl_PointCoord - 0.5;
  float c = cos(vRot), s = sin(vRot);
  q = vec2(c * q.x - s * q.y, s * q.x + c * q.y);
  // o recorte ocupa ~70% do quadro: amplia um pouco para o grão encher o ponto
  vec2 uv = q * 1.15 + 0.5;
  if (uv.x < 0.0 || uv.y < 0.0 || uv.x > 1.0 || uv.y > 1.0) discard;
  vec4 b = texture2D(tBean, vec2(uv.x, 1.0 - uv.y), vBlur);
  float a = b.a * vA;
  if (a < 0.01) discard;
  // luz quente vindo de cima e da direita, como na foto do tambor
  float rim = smoothstep(-0.4, 0.5, q.x * 0.6 - q.y * 0.8);
  vec3 col = b.rgb * uTint * vShade * mix(0.7, 1.25, rim);
  gl_FragColor = vec4(col, a);
}
`;

const loader = typeof window !== "undefined" ? new THREE.TextureLoader() : null;
function loadTex(src: string, onLoad: () => void, color = false) {
  const t = loader!.load(src, onLoad);
  t.colorSpace = color ? THREE.SRGBColorSpace : THREE.NoColorSpace;
  t.minFilter = THREE.LinearMipmapLinearFilter;
  t.magFilter = THREE.LinearFilter;
  t.generateMipmaps = true;
  t.anisotropy = 4;
  return t;
}

function seeds(n: number, seed: number) {
  const g = new THREE.BufferGeometry();
  const a = new Float32Array(n * 4);
  let s = seed;
  const r = () => ((s = (s * 16807) % 2147483647) - 1) / 2147483646;
  for (let i = 0; i < a.length; i++) a[i] = r();
  g.setAttribute("position", new THREE.BufferAttribute(new Float32Array(n * 3), 3));
  g.setAttribute("aSeed", new THREE.BufferAttribute(a, 4));
  return g;
}

const V = () => new THREE.Vector4();
const emptyShot = () => ({
  view: new THREE.Vector4(0.5, 0.5, 1, 0),
  s0a: V(), s0b: V(), s1a: V(), s1b: V(),
  spa: V(), spb: V(), cha: V(), chb: V(),
  rpa: V(), rpb: V(), sma: V(), smb: V(), bua: V(), bub: V(),
  fx: V(),
  grade: new THREE.Vector4(1, 1, 1, 0),
});
type ShotU = ReturnType<typeof emptyShot>;

const smoothstep01 = (x: number, w: number) => {
  const t = Math.min(1, Math.max(0, x / Math.max(w, 1e-6)));
  return t * t * (3 - 2 * t);
};

/** mantém o enquadramento dentro da foto */
function frame(f: XY, z: number): XY {
  const h = 0.5 / Math.max(z, 1);
  return [Math.min(1 - h, Math.max(h, f[0])), Math.min(1 - h, Math.max(h, f[1]))];
}

function writeShot(u: ShotU, s: LiveShot, focus: XY, zoom: number, heat: number, tone: number, ripple = 1) {
  u.view.set(focus[0], focus[1], zoom, 0);
  const st = s.streams ?? [];
  [[u.s0a, u.s0b], [u.s1a, u.s1b]].forEach(([a, b], k) => {
    const x = st[k];
    if (!x) return void b.set(0, 0, 0, 0);
    a.set(x.from[0], x.from[1], x.to[0], x.to[1]);
    b.set(x.width, x.speed, x.feather ?? 0.5, x.taper ?? 1);
  });
  ([[u.spa, u.spb, s.spin], [u.cha, u.chb, s.churn]] as const).forEach(([a, b, x]) => {
    if (!x) return void b.set(0, 0, 0, 0);
    a.set(x.center[0], x.center[1], x.radius[0], x.radius[1]);
    b.set(x.tilt ?? 0, x.speed, x.feather ?? 0.35, x.below ?? 0);
  });
  if (s.ripple) {
    u.rpa.set(s.ripple.center[0], s.ripple.center[1], s.ripple.radius[0], s.ripple.radius[1]);
    u.rpb.set(s.ripple.amp * ripple, s.ripple.freq, s.ripple.speed, 0);
  } else u.rpb.set(0, 0, 0, 0);
  if (s.steam) {
    u.sma.set(...s.steam.box);
    u.smb.set(s.steam.speed, s.steam.wiggle ?? 0.6, s.steam.notch?.[0] ?? 0, s.steam.notch?.[1] ?? 0);
  } else u.smb.set(0, 0, 0, 0);
  if (s.burst) {
    u.bua.set(s.burst.center[0], s.burst.center[1], s.burst.radius[0], s.burst.radius[1]);
    u.bub.set(s.burst.speed, 0, 0, 0);
  } else u.bub.set(0, 0, 0, 0);
  u.fx.set((s.heat ?? 0) * heat, (s.glow ?? 0) * heat, 0, 0);
  u.grade.set(s.grade?.[0] ?? 1, s.grade?.[1] ?? 1, s.period ?? 1.2, tone);
}

export function LivingPhoto({
  shots,
  direct,
  progress,
  reduced,
  panelX = 0.66,
  particles = 320,
  beans = 70,
}: Props) {
  const size = useThree((s) => s.size);
  const dpr = useThree((s) => s.viewport.dpr);
  const ready = useRef<boolean[]>([]);

  const tex = useMemo(
    () => ({
      img: shots.map((s, i) => loadTex(s.src, () => (ready.current[i] = true))),
      alt: shots.map((s) => (s.alt ? loadTex(s.alt, () => {}) : null)),
      bean: loadTex("/textura/grao-torrado-recorte.png", () => {}),
    }),
    // as fotos de uma seção não mudam depois de montadas
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [],
  );

  const common = useMemo(
    () => ({
      uAspect: { value: 1 },
      uPanel: { value: 0 },
      uPanelX: { value: panelX },
      uPanelH: { value: 0.9 },
      uTime: { value: 0 },
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
        transparent: true,
        uniforms: {
          ...common,
          uA: { value: emptyShot() },
          uB: { value: emptyShot() },
          tA: { value: tex.img[0] },
          tB: { value: tex.img[Math.min(1, tex.img.length - 1)] },
          tAlt: { value: tex.alt.find(Boolean) ?? tex.img[0] },
          uMix: { value: 0 },
          uStack: { value: 0 },
          uNoA: { value: 0 },
          uNoB: { value: 0 },
          uAmbB: { value: 0 },
          uBlur: { value: 0 },
          uDim: { value: 0 },
          uCut: { value: -1 },
          uCx: { value: FIO_CX },
          uHw: { value: FIO_HW },
        },
      }),
    [common, tex],
  );

  const partGeo = useMemo(() => seeds(particles, 12345), [particles]);
  const partMat = useMemo(
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
    [common],
  );

  const beanGeo = useMemo(() => seeds(beans, 777), [beans]);
  const beanMat = useMemo(
    () =>
      new THREE.ShaderMaterial({
        vertexShader: BEAN_VERT,
        fragmentShader: BEAN_FRAG,
        transparent: true,
        depthTest: false,
        depthWrite: false,
        uniforms: {
          ...common,
          tBean: { value: tex.bean },
          uTint: { value: new THREE.Color(1.05, 0.78, 0.56) },
          uLip: { value: new THREE.Vector4() },
          uLand: { value: new THREE.Vector2(0.5, 0.6) },
          uGrav: { value: 1 },
          uSize: { value: 0.07 },
          uView: { value: new THREE.Vector4(0.5, 0.5, 1, 0) },
          uPhotoPx: { value: 500 },
          uAmount: { value: 0 },
        },
      }),
    [common, tex],
  );

  useEffect(
    () => () => {
      material.dispose();
      partMat.dispose();
      beanMat.dispose();
      partGeo.dispose();
      beanGeo.dispose();
      tex.img.forEach((t) => t.dispose());
      tex.alt.forEach((t) => t?.dispose());
      tex.bean.dispose();
    },
    [material, partMat, beanMat, partGeo, beanGeo, tex],
  );

  const smooth = useRef(0);
  const shown = useRef(0);
  const plateRef = useRef<THREE.Mesh>(null);
  const beansRef = useRef<THREE.Points>(null);
  const partRef = useRef<THREE.Points>(null);

  useFrame((_, delta) => {
    const dt = Math.min(delta, 0.05);
    smooth.current = damp(smooth.current, clamp01(progress.current), 6, dt);
    const p = smooth.current;
    common.uTime.value += dt * (reduced ? 0.4 : 1);
    const t = common.uTime.value;

    const aspect = size.width / Math.max(1, size.height);
    common.uAspect.value = aspect;
    const wide = aspect > 0.95;
    common.uPanel.value = wide ? 1 : 0;
    common.uPanelH.value = aspect > 1.9 ? 0.86 : 0.9;
    common.uPanelX.value = aspect < 1.3 ? Math.max(panelX, 0.7) : panelX;

    const d = direct(p);
    const u = material.uniforms;
    let ia: number, ib: number, mix: number;
    let fa: XY, fb: XY, za: number, zb: number;
    let ambB = 0;
    let fade = 1;
    // índice da foto (na pilha) e o centro de vista dela, para grãos e partículas
    let viewOf: (i: number) => [number, number, number];
    if (d.stack) {
      const { y, x, zoom, count } = d.stack;
      za = zb = Math.max(1, zoom);
      const h = 0.5 / za;
      const xx = Math.min(1 - h, Math.max(h, x));
      const k = Math.max(-1, Math.floor(y - 0.5));
      ia = Math.max(0, k);
      ib = Math.max(0, Math.min(count - 1, k + 1));
      fa = [xx, y - k];
      fb = [xx, y - k - 1];
      mix = 0;
      u.uStack.value = 1;
      u.uNoA.value = k < 0 ? 1 : 0;
      u.uNoB.value = k + 1 >= count ? 1 : 0;
      ambB = smoothstep01(y - k - 1 + h, 2 * h);
      const seam = k + 1;
      fade = Math.min(1, Math.abs(y - seam) / 0.3);
      viewOf = (i) => [xx, y - i, za];
      // tudo acima da pilha: a camada inteira some
      const off = y + h < -0.08;
      if (plateRef.current) plateRef.current.visible = !off;
      if (beansRef.current) beansRef.current.visible = !off;
      if (partRef.current) partRef.current.visible = !off;
    } else {
      ia = d.a;
      ib = d.b ?? d.a;
      za = Math.max(1, d.zoomA ?? 1);
      zb = Math.max(1, d.zoomB ?? 1);
      fa = frame(d.focusA ?? [0.5, 0.5], za);
      fb = frame(d.focusB ?? fa, zb);
      mix = ready.current[ib] ? d.mix ?? 0 : 0;
      ambB = smoothstep01(mix - 0.2, 0.6);
      u.uStack.value = 0;
      u.uNoA.value = 0;
      u.uNoB.value = 0;
      viewOf = (i) => (i === ib && mix > 0.5 ? [fb[0], fb[1], zb] : [fa[0], fa[1], za]);
      if (plateRef.current) plateRef.current.visible = true;
      if (beansRef.current) beansRef.current.visible = true;
      if (partRef.current) partRef.current.visible = true;
    }
    const A = shots[ia];
    const B = shots[ib];
    u.tA.value = tex.img[ia];
    u.tB.value = tex.img[ib];
    if (tex.alt[ia]) u.tAlt.value = tex.alt[ia];
    u.uMix.value = mix;
    u.uAmbB.value = ambB;
    u.uBlur.value = d.blur ?? 0;
    u.uDim.value = d.dim ?? 0;
    u.uCut.value = tex.alt[ia] && d.cut !== undefined ? d.cut : -1;
    writeShot(u.uA.value, A, fa, za, d.heat ?? 1, d.tone ?? 0, d.ripple ?? 1);
    writeShot(u.uB.value, B, fb, zb, d.heat ?? 1, ib === 0 ? d.tone ?? 0 : 0);

    shown.current = damp(shown.current, ready.current[ia] ? 1 : 0, 4, dt);

    // tamanho da foto na tela, em pixels do framebuffer
    const pr = Math.min(dpr, 2);
    const photoW = wide
      ? common.uPanelH.value * size.height * IMG_ASPECT
      : Math.max(size.width, size.height * IMG_ASPECT);

    // partículas da foto que está na frente
    const frontIdx = d.stack ? Math.max(0, Math.min(shots.length - 1, Math.floor(d.stack.y))) : mix > 0.5 ? ib : ia;
    const front = shots[frontIdx];
    const pm = partMat.uniforms;
    pm.uMode.value = MODE[front.particles ?? "nenhuma"];
    pm.uEmit.value.set(front.emitter?.[0] ?? 0.5, front.emitter?.[1] ?? 0.5);
    pm.uView.value.set(...viewOf(frontIdx), 0);
    pm.uPx.value = pr * (photoW / 520);
    pm.uFadeIn.value = shown.current * fade * (1 - Math.min(1, (d.blur ?? 0) * 2)) * (d.heat ?? 1);

    // grãos caindo: só a foto que tem a borda do tambor
    const bm = beanMat.uniforms;
    const bi = shots.findIndex((s) => s.beans);
    const bean = bi >= 0 ? shots[bi].beans : undefined;
    const beanOn = bean && (bi === ia || bi === ib);
    bm.uAmount.value = beanOn ? (d.beans ?? 1) * shown.current * (d.stack ? 1 : 1 - mix) : 0;
    if (bean) {
      bm.uLip.value.set(...bean.lip);
      bm.uLand.value.set(...bean.land);
      bm.uGrav.value = bean.gravity;
      bm.uSize.value = bean.size;
      bm.uView.value.set(...viewOf(bi), 0);
    }
    bm.uPhotoPx.value = photoW * pr;
    bm.uTime.value = t;
    pm.uTime.value = t;
  });

  return (
    <>
      <mesh ref={plateRef} material={material} frustumCulled={false} renderOrder={5}>
        <planeGeometry args={[2, 2]} />
      </mesh>
      <points ref={beansRef} geometry={beanGeo} material={beanMat} frustumCulled={false} renderOrder={6} />
      <points ref={partRef} geometry={partGeo} material={partMat} frustumCulled={false} renderOrder={7} />
    </>
  );
}
