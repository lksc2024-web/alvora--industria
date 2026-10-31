"use client";

import { useFrame, useThree } from "@react-three/fiber";
import { useEffect, useMemo, useRef } from "react";
import * as THREE from "three";

import type { ProgressRef } from "@/lib/hooks";
import {
  buildCupGeometry,
  buildLeafGeometry,
  buildMorphGeometry,
  buildSaucerGeometry,
} from "./coffeeGeometry";
import {
  applyCoffeeState,
  coffeeStateAt,
  createMorphMaterial,
  emptyState,
} from "./morphMaterial";
import {
  createBackdropMaterial,
  createCremaMaterial,
  createParticleGeometry,
  createParticleMaterial,
  createPorcelainMaterial,
  createStreamMaterial,
} from "./shaders";
import { applyBackdropPhoto, BG, photoTexture, stageAt } from "./photoTextures";
import {
  createShardsGeometry,
  createShardsMaterial,
  createSpriteMaterial,
  createSwarmMaterial,
} from "./photoSprites";
import { useStudioEnv } from "./useStudioEnv";

const FOLHA = () => photoTexture("/textura/folha.jpg");

/** As fotos atrás de cada uma das oito etapas (mesma ordem de `journey`). */
const JOURNEY_BG = [BG.fruto, BG.colheita, BG.secagem, BG.cru, BG.torra, BG.moagem, BG.preparo, BG.xicara];
const JOURNEY_STOPS = [0, 0.12, 0.25, 0.38, 0.5, 0.64, 0.78, 0.9];
import type { Keyframe } from "./util";
import {
  clamp01,
  damp,
  fitFactor,
  lerp,
  makeRandom,
  rampIndex,
  sampleNumber,
  sampleVec3,
  smoothstep,
  window01,
} from "./util";

/* ------------------------------------------------------------------ *
 * Keyframes de câmera — a narrativa inteira é um único movimento
 * ------------------------------------------------------------------ */

const CAM_POS: Keyframe<[number, number, number]>[] = [
  { at: 0.0, value: [0.25, 0.3, 4.3] },
  { at: 0.12, value: [-1.45, 0.85, 3.6] },
  { at: 0.25, value: [0.1, 2.25, 3.3] },
  { at: 0.38, value: [2.05, 0.45, 3.55] },
  { at: 0.5, value: [0.05, 0.15, 2.8] },
  { at: 0.64, value: [-1.05, -0.3, 2.5] },
  { at: 0.78, value: [0.55, 0.95, 3.05] },
  { at: 0.9, value: [0.05, 0.9, 3.3] },
  { at: 1.0, value: [0.0, 0.62, 2.65] },
];

const CAM_TARGET: Keyframe<[number, number, number]>[] = [
  { at: 0.0, value: [0, 0.1, 0] },
  { at: 0.25, value: [0, -0.55, -0.6] },
  { at: 0.38, value: [0, -0.35, -0.25] },
  { at: 0.5, value: [0, -0.05, 0] },
  { at: 0.64, value: [0, -0.2, 0] },
  { at: 0.78, value: [0, -0.3, 0] },
  { at: 1.0, value: [0, -0.5, 0] },
];

const CAM_FOV: Keyframe<number>[] = [
  { at: 0.0, value: 38 },
  { at: 0.5, value: 43 },
  { at: 0.64, value: 47 },
  { at: 0.78, value: 40 },
  { at: 1.0, value: 33 },
];

const HERO_POS: Keyframe<[number, number, number]>[] = [
  { at: 0.0, value: [0, 0.15, 0] },
  { at: 0.25, value: [0, -0.15, 0] },
  { at: 0.5, value: [0, 0.0, 0] },
  { at: 0.64, value: [0, 0.3, 0] },
  { at: 0.74, value: [0, 0.75, 0] },
  { at: 1.0, value: [0, 0.9, 0] },
];

const HERO_SCALE: Keyframe<number>[] = [
  { at: 0.0, value: 0.95 },
  { at: 0.3, value: 0.9 },
  { at: 0.5, value: 1.02 },
  { at: 0.66, value: 1.16 },
  { at: 0.74, value: 1.08 },
  { at: 0.795, value: 1.0 },
  { at: 0.8, value: 0.0 },
  { at: 1.0, value: 0.0 },
];

/* ------------------------------------------------------------------ *
 * Paleta por etapa — cor, luz e atmosfera caminham junto com o grão
 * ------------------------------------------------------------------ */

type Mood = {
  at: number;
  top: string;
  bottom: string;
  glowColor: string;
  glow: number;
  keyColor: string;
  keyIntensity: number;
  rimColor: string;
  rimIntensity: number;
  ambient: number;
};

const MOODS: Mood[] = [
  // 01 lavoura ao amanhecer
  { at: 0.0, top: "#1d2b1b", bottom: "#070604", glowColor: "#ffbe72", glow: 0.8, keyColor: "#ffd9a8", keyIntensity: 2.6, rimColor: "#6fa05e", rimIntensity: 1.4, ambient: 0.35 },
  // 02 colheita, sol mais alto
  { at: 0.14, top: "#273318", bottom: "#090705", glowColor: "#ffc877", glow: 0.9, keyColor: "#ffd6a0", keyIntensity: 3.0, rimColor: "#86b05f", rimIntensity: 1.2, ambient: 0.4 },
  // 03 terreiro de secagem, luz seca e aberta
  { at: 0.27, top: "#39301d", bottom: "#0b0806", glowColor: "#ffd38f", glow: 1.0, keyColor: "#ffe3bb", keyIntensity: 3.2, rimColor: "#c9a877", rimIntensity: 0.8, ambient: 0.5 },
  // 04 chegada à indústria, luz fria de galpão
  { at: 0.4, top: "#151719", bottom: "#060708", glowColor: "#b9c6d2", glow: 0.35, keyColor: "#dfe7ee", keyIntensity: 2.2, rimColor: "#7f8f9e", rimIntensity: 1.0, ambient: 0.3 },
  // 05 torrefação: âmbar, brasa, calor
  { at: 0.55, top: "#3a1606", bottom: "#0c0402", glowColor: "#ff7b1b", glow: 1.25, keyColor: "#ffa047", keyIntensity: 3.4, rimColor: "#ff5a0d", rimIntensity: 2.2, ambient: 0.28 },
  // 06 moagem: pó no ar, luz rasante
  { at: 0.68, top: "#22140c", bottom: "#070403", glowColor: "#e0954c", glow: 0.7, keyColor: "#f0b36c", keyIntensity: 2.6, rimColor: "#8a4f22", rimIntensity: 1.2, ambient: 0.26 },
  // 07 preparo
  { at: 0.82, top: "#1a1009", bottom: "#060403", glowColor: "#f0b473", glow: 0.6, keyColor: "#ffd2a0", keyIntensity: 2.8, rimColor: "#a3703f", rimIntensity: 1.0, ambient: 0.3 },
  // 08 a xícara servida
  { at: 1.0, top: "#1f140c", bottom: "#070403", glowColor: "#ffb870", glow: 0.7, keyColor: "#ffe0b8", keyIntensity: 3.0, rimColor: "#b47b45", rimIntensity: 1.1, ambient: 0.34 },
];

function sampleMood(p: number, out: MoodOut) {
  let i = 0;
  while (i < MOODS.length - 2 && p > MOODS[i + 1].at) i++;
  const a = MOODS[i];
  const b = MOODS[i + 1];
  const raw = clamp01((p - a.at) / (b.at - a.at || 1e-6));
  const t = raw * raw * (3 - 2 * raw);
  out.top.set(a.top).lerp(TMP_C.set(b.top), t);
  out.bottom.set(a.bottom).lerp(TMP_C.set(b.bottom), t);
  out.glowColor.set(a.glowColor).lerp(TMP_C.set(b.glowColor), t);
  out.keyColor.set(a.keyColor).lerp(TMP_C.set(b.keyColor), t);
  out.rimColor.set(a.rimColor).lerp(TMP_C.set(b.rimColor), t);
  out.glow = lerp(a.glow, b.glow, t);
  out.keyIntensity = lerp(a.keyIntensity, b.keyIntensity, t);
  out.rimIntensity = lerp(a.rimIntensity, b.rimIntensity, t);
  out.ambient = lerp(a.ambient, b.ambient, t);
  return out;
}

type MoodOut = {
  top: THREE.Color;
  bottom: THREE.Color;
  glowColor: THREE.Color;
  keyColor: THREE.Color;
  rimColor: THREE.Color;
  glow: number;
  keyIntensity: number;
  rimIntensity: number;
  ambient: number;
};

const TMP_C = new THREE.Color();

/* ------------------------------------------------------------------ *
 * Layouts do enxame de grãos — o mesmo lote atravessa todas as etapas
 * ------------------------------------------------------------------ */

const LAYOUT_ANCHORS = [0.07, 0.19, 0.32, 0.45, 0.58, 0.71, 0.86];
const L_PLANT = 0;
const L_HARVEST = 1;
const L_PATIO = 2;
const L_LINE = 3;
const L_DRUM = 4;
const L_FUNNEL = 5;
const L_GONE = 6;

type Slot = { x: number; y: number; z: number; s: number; rx: number; ry: number; rz: number };

function layoutAt(
  layout: number,
  s0: number,
  s1: number,
  s2: number,
  s3: number,
  t: number,
  out: Slot,
) {
  switch (layout) {
    case L_PLANT: {
      const a = s0 * Math.PI * 2;
      const rad = 2.1 + s1 * 2.8;
      out.x = Math.cos(a) * rad * 1.2 + Math.sin(t * 0.5 + s0 * 7) * 0.07;
      out.y = -0.3 + Math.sin(a * 1.7) * 1.7 + (s2 - 0.5) * 1.3;
      out.z = -1.1 - s1 * 3.6 + Math.sin(a) * 0.9;
      out.s = 0.1 + s2 * 0.07;
      out.rx = s0 * 6.28 + t * 0.12;
      out.ry = s1 * 6.28;
      out.rz = s2 * 6.28;
      return out;
    }
    case L_HARVEST: {
      const k = (s0 + t * 0.07) % 1;
      out.x = lerp(3.0, -2.6, k) + (s1 - 0.5) * 2.6;
      out.y = lerp(2.6, -2.0, k * k) + (s2 - 0.5) * 0.9;
      out.z = -0.4 - s1 * 2.8;
      out.s = 0.09 + s2 * 0.07;
      out.rx = t * (1.6 + s1 * 2.4);
      out.ry = t * (1.2 + s2 * 2.0);
      out.rz = s3 * 6.28;
      return out;
    }
    case L_PATIO: {
      out.x = (s0 - 0.5) * 9.4;
      out.z = -0.6 - s1 * 6.2;
      out.y = -1.5 + Math.sin(out.x * 2.1) * 0.035 + s2 * 0.05;
      out.s = 0.1 + s2 * 0.045;
      out.rx = -Math.PI / 2 + (s2 - 0.5) * 0.5;
      out.ry = s0 * 6.28;
      out.rz = s3 * 6.28;
      return out;
    }
    case L_LINE: {
      const k = (s0 + t * 0.09) % 1;
      out.x = lerp(-4.6, 4.6, k);
      out.y = -0.95 + (s1 - 0.5) * 0.26 + Math.sin(k * 26 + s2 * 6) * 0.03;
      out.z = -0.7 + (s2 - 0.5) * 1.7;
      out.s = 0.095 + s2 * 0.045;
      out.rx = s1 * 6.28;
      out.ry = k * 9.0 + s0 * 6.28;
      out.rz = 0;
      return out;
    }
    case L_DRUM: {
      const a = s0 * Math.PI * 2 + t * (0.85 + s1 * 0.3);
      const rad = 0.55 + s1 * 0.95;
      out.x = Math.cos(a) * rad * 1.5;
      out.y = Math.sin(a) * rad * 1.0 - 0.08;
      out.z = (s2 - 0.5) * 2.2;
      out.s = 0.1 + s2 * 0.05;
      out.rx = a * 1.4;
      out.ry = a * 0.8 + s1 * 6.28;
      out.rz = s3 * 6.28;
      return out;
    }
    case L_FUNNEL: {
      const k = (s0 + t * 0.26) % 1;
      const rad = (1 - k) * (1.5 + s1 * 1.3);
      const a = s0 * Math.PI * 2 + k * 7.5;
      out.x = Math.cos(a) * rad;
      out.z = Math.sin(a) * rad;
      out.y = lerp(1.5, -1.7, k);
      out.s = (0.1 + s2 * 0.05) * (1 - k * 0.94);
      out.rx = k * 10;
      out.ry = a * 2;
      out.rz = s3 * 6.28;
      return out;
    }
    default: {
      out.x = 0;
      out.y = -1.8;
      out.z = 0;
      out.s = 0;
      out.rx = 0;
      out.ry = 0;
      out.rz = 0;
      return out;
    }
  }
}

/* ------------------------------------------------------------------ *
 * Papéis do sistema de partículas
 * ------------------------------------------------------------------ */

type Role = {
  at: number;
  size: number;
  opacity: number;
  a: string;
  b: string;
  spread: [number, number, number];
  speed: number;
  swirl: number;
  turb: number;
  center: [number, number, number];
  soft: number;
};

const ROLES: Role[] = [
  { at: 0.0, size: 16, opacity: 0.0, a: "#cbe0a8", b: "#6f8b4a", spread: [10, 7, 7], speed: 0.03, swirl: 0.04, turb: 0.5, center: [0, 0, -1], soft: 1.5 },
  { at: 0.16, size: 18, opacity: 0.22, a: "#e7d2a0", b: "#9a7a46", spread: [11, 7, 7], speed: 0.05, swirl: 0.05, turb: 0.6, center: [0, 0, -1], soft: 1.5 },
  // poeira seca do terreiro
  { at: 0.3, size: 20, opacity: 0.4, a: "#f1dcb4", b: "#a98f63", spread: [13, 5, 8], speed: 0.04, swirl: 0.03, turb: 0.8, center: [0, -0.6, -2], soft: 1.4 },
  { at: 0.42, size: 14, opacity: 0.18, a: "#c9d4dd", b: "#79858f", spread: [11, 6, 7], speed: 0.06, swirl: 0.06, turb: 0.5, center: [0, -0.4, -1], soft: 1.5 },
  // brasas da torra
  { at: 0.56, size: 11, opacity: 0.95, a: "#ffb14a", b: "#ff4d05", spread: [6.5, 7, 5.5], speed: 0.26, swirl: 0.55, turb: 0.5, center: [0, -0.3, 0], soft: 2.4 },
  // pó de café na moagem
  { at: 0.7, size: 9, opacity: 0.8, a: "#b2783f", b: "#49260f", spread: [4.6, 6.5, 4.6], speed: -0.3, swirl: 0.9, turb: 0.45, center: [0, 0.1, 0], soft: 2.2 },
  { at: 0.82, size: 14, opacity: 0.3, a: "#d8b082", b: "#6a4523", spread: [5, 6, 5], speed: -0.1, swirl: 0.3, turb: 0.5, center: [0, 0.2, 0], soft: 1.6 },
  // vapor da xícara
  { at: 1.0, size: 32, opacity: 0.4, a: "#fff2e0", b: "#c7a885", spread: [1.5, 3.2, 1.5], speed: 0.14, swirl: 0.22, turb: 0.35, center: [0, 0.35, 0], soft: 1.0 },
];

function sampleRole(p: number, mat: ReturnType<typeof createParticleMaterial>) {
  let i = 0;
  while (i < ROLES.length - 2 && p > ROLES[i + 1].at) i++;
  const a = ROLES[i];
  const b = ROLES[i + 1];
  const raw = clamp01((p - a.at) / (b.at - a.at || 1e-6));
  const t = raw * raw * (3 - 2 * raw);
  const u = mat.uniformsRef;
  u.uSize.value = lerp(a.size, b.size, t);
  u.uOpacity.value = lerp(a.opacity, b.opacity, t);
  u.uSpeed.value = lerp(a.speed, b.speed, t);
  u.uSwirl.value = lerp(a.swirl, b.swirl, t);
  u.uTurb.value = lerp(a.turb, b.turb, t);
  u.uColorA.value.set(a.a).lerp(TMP_C.set(b.a), t);
  u.uColorB.value.set(a.b).lerp(TMP_C.set(b.b), t);
  u.uSpread.value.set(
    lerp(a.spread[0], b.spread[0], t),
    lerp(a.spread[1], b.spread[1], t),
    lerp(a.spread[2], b.spread[2], t),
  );
  u.uCenter.value.set(
    lerp(a.center[0], b.center[0], t),
    lerp(a.center[1], b.center[1], t),
    lerp(a.center[2], b.center[2], t),
  );
  u.uSoft.value = lerp(a.soft, b.soft, t);
}

/* ------------------------------------------------------------------ */

const ENV_BANDS = [
  { x: 0.24, y: 0.2, w: 0.5, h: 0.5, color: "#ffd9a8", intensity: 1.2 },
  { x: 0.72, y: 0.34, w: 0.34, h: 0.4, color: "#ff8a35", intensity: 0.9 },
  { x: 0.5, y: 0.78, w: 0.8, h: 0.3, color: "#2a2018", intensity: 0.6 },
];
const ENV_BASE: [string, string, string] = ["#2b1b11", "#120b07", "#050302"];

type Props = {
  progress: ProgressRef;
  count: number;
  particles: number;
  reduced: boolean;
};

export function JourneyScene({ progress, count, particles, reduced }: Props) {
  const camera = useThree((s) => s.camera) as THREE.PerspectiveCamera;
  const size = useThree((s) => s.size);
  const gl = useThree((s) => s.gl);
  useStudioEnv(ENV_BANDS, ENV_BASE);

  const geo = useMemo(
    () => buildMorphGeometry(count > 300 ? [88, 60] : [56, 40]),
    [count],
  );
  const heroMat = useMemo(() => createMorphMaterial(), []);
  // fruto e grãos feitos dos recortes das fotos
  const halfMats = useMemo(() => {
    const m = [createSpriteMaterial(), createSpriteMaterial()];
    m[0].uniforms.uHalf.value = -1;
    m[1].uniforms.uHalf.value = 1;
    return m;
  }, []);
  const beanSprite = useMemo(() => {
    const m = createSpriteMaterial();
    m.uniforms.uStage.value = 1;
    return m;
  }, []);
  const swarmMat = useMemo(() => createSwarmMaterial(), []);
  const shardsGeo = useMemo(() => createShardsGeometry(), []);
  const shardsMat = useMemo(() => createShardsMaterial(), []);
  const spriteGeo = useMemo(() => new THREE.PlaneGeometry(2.3, 2.3), []);
  const porcMat = useMemo(() => createPorcelainMaterial(0.8), []);
  const flatPorcMat = useMemo(() => {
    const m = createPorcelainMaterial(0.1);
    m.uniforms.uFlat.value = 1;
    return m;
  }, []);
  const fieldMat = useMemo(() => createMorphMaterial(), []);
  const backdropMat = useMemo(() => createBackdropMaterial(), []);
  const particleGeo = useMemo(() => createParticleGeometry(particles), [particles]);
  const particleMat = useMemo(() => createParticleMaterial(), []);
  const streamMat = useMemo(() => createStreamMaterial(), []);
  const cremaMat = useMemo(() => createCremaMaterial(), []);

  const cupGeo = useMemo(() => buildCupGeometry(72), []);
  const saucerGeo = useMemo(() => buildSaucerGeometry(72), []);
  const leafGeo = useMemo(() => buildLeafGeometry(), []);

  const seeds = useMemo(() => {
    const rnd = makeRandom(20260415);
    const arr = new Float32Array(count * 4);
    for (let i = 0; i < count * 4; i++) arr[i] = rnd();
    return arr;
  }, [count]);

  const leaves = useMemo(() => {
    const rnd = makeRandom(7);
    return Array.from({ length: 9 }, () => ({
      pos: [
        (rnd() - 0.5) * 5.2,
        (rnd() - 0.5) * 3.4,
        -0.8 - rnd() * 3.2,
      ] as [number, number, number],
      rot: [rnd() * 0.9 - 0.45, rnd() * 6.28, rnd() * 6.28] as [number, number, number],
      scale: 0.5 + rnd() * 0.75,
      phase: rnd() * 6.28,
    }));
  }, []);

  const heroRef = useRef<THREE.Group>(null);
  const beanRef = useRef<THREE.Mesh>(null);
  const shardsRef = useRef<THREE.Mesh>(null);
  const doorL = useRef<THREE.Group>(null);
  const doorR = useRef<THREE.Group>(null);
  const fieldRef = useRef<THREE.InstancedMesh>(null);
  const leavesRef = useRef<THREE.Group>(null);
  const drumRef = useRef<THREE.Group>(null);
  const cupRef = useRef<THREE.Group>(null);
  const streamRef = useRef<THREE.Mesh>(null);
  const ambientRef = useRef<THREE.AmbientLight>(null);
  const keyRef = useRef<THREE.DirectionalLight>(null);
  const rimRef = useRef<THREE.DirectionalLight>(null);
  const emberRef = useRef<THREE.PointLight>(null);

  const smoothed = useRef(0);
  const state = useMemo(() => emptyState(), []);
  const mood = useMemo<MoodOut>(
    () => ({
      top: new THREE.Color(),
      bottom: new THREE.Color(),
      glowColor: new THREE.Color(),
      keyColor: new THREE.Color(),
      rimColor: new THREE.Color(),
      glow: 0,
      keyIntensity: 0,
      rimIntensity: 0,
      ambient: 0,
    }),
    [],
  );
  const vA = useMemo(() => new THREE.Vector3(), []);
  const vB = useMemo(() => new THREE.Vector3(), []);
  const dummy = useMemo(() => new THREE.Object3D(), []);
  const slotA = useMemo<Slot>(() => ({ x: 0, y: 0, z: 0, s: 0, rx: 0, ry: 0, rz: 0 }), []);
  const slotB = useMemo<Slot>(() => ({ x: 0, y: 0, z: 0, s: 0, rx: 0, ry: 0, rz: 0 }), []);

  useEffect(() => {
    const dprCap = Math.min(window.devicePixelRatio || 1, 1.75);
    particleMat.uniformsRef.uPixelRatio.value = dprCap;
  }, [particleMat]);

  useEffect(
    () => () => {
      [heroMat, fieldMat, backdropMat, particleMat, streamMat, cremaMat, ...halfMats, beanSprite, swarmMat, shardsMat, shardsGeo, spriteGeo, porcMat, flatPorcMat].forEach(
        (m) => m.dispose(),
      );
      [particleGeo, cupGeo, saucerGeo, leafGeo].forEach((g) => g.dispose());
    },
    [heroMat, fieldMat, backdropMat, particleMat, streamMat, cremaMat, halfMats, beanSprite, swarmMat, shardsMat, shardsGeo, spriteGeo, porcMat, flatPorcMat, particleGeo, cupGeo, saucerGeo, leafGeo],
  );

  useFrame((_, delta) => {
    const dt = Math.min(delta, 0.05);
    const target = clamp01(progress.current);
    // amortecimento: o scroll do usuário é discreto, a câmera não pode ser
    smoothed.current = reduced
      ? target
      : damp(smoothed.current, target, 7.5, dt);
    const p = smoothed.current;
    // Em movimento reduzido o relógio para, mas a cena não congela: o "tempo"
    // passa a vir da própria rolagem. Nada se move sem que a pessoa mova.
    const time = reduced ? p * 9 : performance.now() / 1000;

    /* --- matéria-prima: estado do grão --------------------------------- */
    coffeeStateAt(p, state);
    applyCoffeeState(heroMat, state);
    applyCoffeeState(fieldMat, state);
    heroMat.uniformsRef.uTime.value = time;
    fieldMat.uniformsRef.uTime.value = time;

    /* --- câmera -------------------------------------------------------- */
    sampleVec3(CAM_POS, p, vA);
    sampleVec3(CAM_TARGET, p, vB);
    // afasta a câmera em telas estreitas para o objeto não vazar do quadro
    const fit = fitFactor(size.width, size.height);
    camera.position.set(
      vB.x + (vA.x - vB.x) * fit,
      vB.y + (vA.y - vB.y) * fit,
      vB.z + (vA.z - vB.z) * fit,
    );
    camera.lookAt(vB);
    const fov = sampleNumber(CAM_FOV, p);
    if (Math.abs(camera.fov - fov) > 0.01) {
      camera.fov = fov;
      camera.updateProjectionMatrix();
    }

    /* --- atmosfera ----------------------------------------------------- */
    sampleMood(p, mood);
    const bu = backdropMat.uniforms;
    (bu.uTop.value as THREE.Color).copy(mood.top);
    (bu.uBottom.value as THREE.Color).copy(mood.bottom);
    (bu.uGlowColor.value as THREE.Color).copy(mood.glowColor);
    bu.uGlow.value = mood.glow;
    bu.uTime.value = time;
    {
      const st = stageAt(p, JOURNEY_STOPS, 0.05);
      applyBackdropPhoto(backdropMat, JOURNEY_BG[st.i], JOURNEY_BG[st.j], st.mix, gl);
    }

    if (ambientRef.current) ambientRef.current.intensity = mood.ambient;
    if (keyRef.current) {
      keyRef.current.color.copy(mood.keyColor);
      keyRef.current.intensity = mood.keyIntensity;
      keyRef.current.position.set(
        2.6 + Math.sin(p * 3.1) * 1.2,
        3.2 - p * 1.1,
        2.4 + Math.cos(p * 2.4) * 1.4,
      );
    }
    if (rimRef.current) {
      rimRef.current.color.copy(mood.rimColor);
      rimRef.current.intensity = mood.rimIntensity;
    }
    if (emberRef.current) {
      const heat = window01(p, 0.46, 0.74, 0.08);
      emberRef.current.intensity = heat * 9;
      emberRef.current.position.set(
        Math.sin(time * 1.3) * 0.35,
        -0.6 + Math.sin(time * 2.1) * 0.1,
        0.4,
      );
    }

    /* --- objeto herói: fruto → semente → grão --------------------------- */
    // a cereja se abre em duas metades, como portas, e o grão aparece lá dentro
    const SPLIT_A = 0.115;
    const split = smoothstep(SPLIT_A, 0.235, p);
    const splitOn = p > SPLIT_A;
    const breakT = smoothstep(0.675, 0.795, p);
    [...halfMats, beanSprite, swarmMat].forEach((m) => {
      m.uniforms.uTime.value = time;
      m.uniforms.uRoast.value = state.roast;
    });
    swarmMat.uniforms.uStage.value = smoothstep(0.13, 0.26, p);
    shardsMat.uniforms.uBreak.value = breakT;

    if (heroRef.current) {
      const g = heroRef.current;
      sampleVec3(HERO_POS, p, vA);
      g.position.copy(vA);
      const base = sampleNumber(HERO_SCALE, p);
      g.scale.setScalar(Math.max(0.0001, base * 0.92));
      g.visible = base > 0.002;
      // a foto sempre encara a câmera; o giro é pequeno para não esticar a imagem
      g.quaternion.copy(camera.quaternion);
      g.rotateZ(Math.sin(p * 4.2) * 0.28 + smoothstep(0.58, 0.78, p) * 0.5 + Math.sin(time * 0.45) * 0.04);
      g.rotateY(Math.sin(time * 0.55 + p * 7.0) * 0.2);
      g.rotateX(Math.sin(time * 0.4 + p * 3.0) * 0.08);

      const bean = beanRef.current;
      if (bean) {
        bean.visible = splitOn && breakT < 0.25;
        bean.scale.setScalar((0.6 + 0.4 * split) * (1 + state.roast * 0.06));
        beanSprite.uniforms.uOpacity.value = 1 - smoothstep(0.0, 0.25, breakT);
      }
      const shards = shardsRef.current;
      if (shards) {
        shards.visible = breakT > 0.001 && breakT < 0.999;
        shards.scale.setScalar(2.3 * 0.9);
      }
      const away = smoothstep(0.55, 1.0, split);
      [doorL.current, doorR.current].forEach((d, k) => {
        if (!d) return;
        const dir = k === 0 ? -1 : 1;
        d.visible = split < 0.999;
        d.position.set(dir * (1.15 + away * 1.4), -away * away * 1.2, away * 0.4);
        d.rotation.set(0, -dir * split * 1.35, dir * away * 0.5);
      });
      halfMats.forEach((m) => (m.uniforms.uOpacity.value = 1 - smoothstep(0.75, 1.0, split)));
    }

    /* --- o lote: mesmos grãos, outra organização ------------------------ */
    const mesh = fieldRef.current;
    if (mesh) {
      const lf = rampIndex(p, LAYOUT_ANCHORS);
      const la = Math.floor(lf);
      const lb = Math.min(L_GONE, la + 1);
      const mix = lf - la;
      for (let i = 0; i < count; i++) {
        const s0 = seeds[i * 4];
        const s1 = seeds[i * 4 + 1];
        const s2 = seeds[i * 4 + 2];
        const s3 = seeds[i * 4 + 3];
        layoutAt(la, s0, s1, s2, s3, time, slotA);
        if (mix > 0.001) {
          layoutAt(lb, s0, s1, s2, s3, time, slotB);
          dummy.position.set(
            lerp(slotA.x, slotB.x, mix),
            lerp(slotA.y, slotB.y, mix),
            lerp(slotA.z, slotB.z, mix),
          );
          dummy.rotation.set(
            lerp(slotA.rx, slotB.rx, mix),
            lerp(slotA.ry, slotB.ry, mix),
            lerp(slotA.rz, slotB.rz, mix),
          );
          dummy.scale.setScalar(lerp(slotA.s, slotB.s, mix));
        } else {
          dummy.position.set(slotA.x, slotA.y, slotA.z);
          dummy.rotation.set(slotA.rx, slotA.ry, slotA.rz);
          dummy.scale.setScalar(slotA.s);
        }
        dummy.updateMatrix();
        mesh.setMatrixAt(i, dummy.matrix);
      }
      mesh.instanceMatrix.needsUpdate = true;
    }

    /* --- partículas: poeira → brasa → pó → vapor ------------------------ */
    sampleRole(p, particleMat);
    particleMat.uniformsRef.uTime.value = time;

    /* --- cenários que entram e saem ------------------------------------- */
    if (leavesRef.current) {
      const v = 1 - smoothstep(0.1, 0.24, p);
      leavesRef.current.visible = v > 0.01;
      leavesRef.current.scale.setScalar(0.9 + v * 0.1);
      leavesRef.current.children.forEach((child, i) => {
        const m = child as THREE.Mesh;
        const mm = m.material as THREE.MeshStandardMaterial;
        mm.opacity = v;
        m.rotation.z = leaves[i].rot[2] + Math.sin(time * 0.7 + leaves[i].phase) * 0.09;
      });
    }

    if (drumRef.current) {
      // Dois aros incandescentes sugerem a boca do tambor sem competir com o
      // grão. O tambor literal é a seção dedicada de torrefação.
      const v = window01(p, 0.44, 0.74, 0.07);
      drumRef.current.visible = v > 0.01;
      drumRef.current.rotation.z = time * 0.35;
      drumRef.current.scale.setScalar(2.6 + (1 - v) * 0.8);
      drumRef.current.children.forEach((child) => {
        const m = (child as THREE.Mesh).material as THREE.MeshStandardMaterial;
        if (m) m.opacity = v * 0.4;
      });
    }

    /* --- o café encontra a xícara --------------------------------------- */
    if (cupRef.current) {
      const v = smoothstep(0.84, 0.93, p);
      cupRef.current.visible = v > 0.01;
      cupRef.current.position.y = -1.25 + (1 - v) * 0.5;
      cupRef.current.scale.setScalar(1.1 * (0.86 + v * 0.14));
      cupRef.current.children.forEach((child) => {
        const m = (child as THREE.Mesh).material as THREE.Material & {
          opacity?: number;
        };
        if (m && "opacity" in m) m.opacity = v;
      });
    }

    const pourT = smoothstep(0.87, 0.97, p);
    streamMat.uniformsRef.uTime.value = time;
    streamMat.uniformsRef.uProgress.value = pourT;
    streamMat.uniformsRef.uOpacity.value =
      smoothstep(0.85, 0.89, p) * (1 - smoothstep(0.985, 1.0, p) * 0.2);
    if (streamRef.current) streamRef.current.visible = p > 0.84;

    // a crema acompanha a xícara de perto: ela nunca aparece vazia em cena
    cremaMat.uniformsRef.uTime.value = time;
    cremaMat.uniformsRef.uFill.value = smoothstep(0.86, 0.985, p) * 0.97;
    cremaMat.uniformsRef.uFoam.value = smoothstep(0.9, 1.0, p);
    cremaMat.uniformsRef.uOpacity.value = smoothstep(0.85, 0.89, p);
  });

  return (
    <>
      <ambientLight ref={ambientRef} intensity={0.35} />
      <directionalLight ref={keyRef} position={[2.6, 3.2, 2.4]} intensity={2.8} />
      <directionalLight ref={rimRef} position={[-3.2, 1.2, -2.8]} intensity={1.2} />
      <pointLight ref={emberRef} color="#ff5e0a" intensity={0} distance={9} decay={2} />

      {/* fundo contínuo: nunca há corte de cor entre as etapas */}
      <mesh scale={46} renderOrder={-10}>
        <sphereGeometry args={[1, 32, 24]} />
        <primitive object={backdropMat} attach="material" />
      </mesh>

      {/* folhagem do cafeeiro (apenas na primeira cena) */}
      <group ref={leavesRef}>
        {leaves.map((l, i) => (
          <mesh key={i} geometry={leafGeo} position={l.pos} rotation={l.rot} scale={l.scale}>
            <meshStandardMaterial
              map={FOLHA()}
                color={i % 2 === 0 ? "#ffffff" : "#c9dcc2"}
              roughness={0.52}
              metalness={0}
              envMapIntensity={1.4}
              side={THREE.DoubleSide}
              transparent
              opacity={1}
            />
          </mesh>
        ))}
      </group>

      {/* tambor da torrefação */}
      <group ref={drumRef} visible={false}>
        <mesh position={[0, 0, 0.55]}>
          <torusGeometry args={[1.0, 0.022, 10, 72]} />
          <meshStandardMaterial
            color="#b9793c"
            metalness={1}
            roughness={0.24}
            emissive="#ff6a16"
            emissiveIntensity={0.35}
            transparent
            opacity={0}
          />
        </mesh>
        <mesh position={[0, 0, -0.75]}>
          <torusGeometry args={[0.82, 0.016, 8, 56]} />
          <meshStandardMaterial
            color="#8a5526"
            metalness={1}
            roughness={0.3}
            transparent
            opacity={0}
          />
        </mesh>
      </group>

      {/* o lote inteiro */}
      <instancedMesh
        ref={fieldRef}
        args={[spriteGeo, swarmMat, count]}
        frustumCulled={false}
      />

      {/* fruto / semente / grão — o fio condutor da narrativa */}
      <group ref={heroRef}>
        <mesh ref={beanRef} geometry={spriteGeo} material={beanSprite} renderOrder={2} />
        {/* as metades giram em torno da borda de fora, como portas */}
        <group ref={doorL} position={[-1.15, 0, 0]}>
          <mesh geometry={spriteGeo} material={halfMats[0]} position={[1.15, 0, 0.01]} renderOrder={3} />
        </group>
        <group ref={doorR} position={[1.15, 0, 0]}>
          <mesh geometry={spriteGeo} material={halfMats[1]} position={[-1.15, 0, 0.01]} renderOrder={3} />
        </group>
        <mesh ref={shardsRef} geometry={shardsGeo} material={shardsMat} frustumCulled={false} renderOrder={4} />
      </group>

      {/* poeira, brasa, pó e vapor */}
      <points geometry={particleGeo} material={particleMat} frustumCulled={false} />

      {/* xícara servida */}
      <group ref={cupRef} visible={false} position={[0, -1.25, 0]}>
        <mesh geometry={saucerGeo} position={[0, -0.03, 0]}>
          <primitive object={flatPorcMat} attach="material" />
        </mesh>
        <mesh geometry={cupGeo}>
          <primitive object={porcMat} attach="material" />
        </mesh>
        {/* a asa é o que faz o objeto ler como xícara e não como tigela */}
        <mesh position={[0.78, 0.5, 0]} rotation={[0, 0, -0.1]}>
          <torusGeometry args={[0.24, 0.045, 12, 40, Math.PI * 1.25]} />
          <primitive object={flatPorcMat} attach="material" />
        </mesh>
        <mesh rotation={[-Math.PI / 2, 0, 0]} position={[0, 0.63, 0]}>
          <circleGeometry args={[0.66, 56]} />
          <primitive object={cremaMat} attach="material" />
        </mesh>
      </group>

      {/* o fio de café caindo */}
      <mesh ref={streamRef} position={[0, 0.65, 0]} visible={false}>
        <cylinderGeometry args={[0.062, 0.05, 2.2, 24, 18, true]} />
        <primitive object={streamMat} attach="material" />
      </mesh>
    </>
  );
}
