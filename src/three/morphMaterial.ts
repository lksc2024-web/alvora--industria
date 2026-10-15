import * as THREE from "three";

export type MorphUniforms = {
  uMorph: { value: number };
  uTime: { value: number };
  uGroove: { value: number };
  uGrooveColor: { value: THREE.Color };
  uEmber: { value: number };
  uEmberColor: { value: THREE.Color };
};

/**
 * MeshPhysicalMaterial estendido para interpolar entre os dois estados da
 * geometria (fruto ↔ grão) e para acender uma brasa de borda durante a torra.
 * Mantemos clearcoat sempre > 0 para que o programa de shader nunca recompile
 * no meio da narrativa (recompilar causaria engasgo visível no scroll).
 */
export function createMorphMaterial(): THREE.MeshPhysicalMaterial & {
  uniformsRef: MorphUniforms;
} {
  const uniforms: MorphUniforms = {
    uMorph: { value: 0 },
    uTime: { value: 0 },
    uGroove: { value: 0 },
    uGrooveColor: { value: new THREE.Color("#efe2c8") },
    uEmber: { value: 0 },
    uEmberColor: { value: new THREE.Color("#ff6a16") },
  };

  const material = new THREE.MeshPhysicalMaterial({
    color: new THREE.Color("#8e1410"),
    roughness: 0.2,
    metalness: 0.0,
    clearcoat: 0.9,
    clearcoatRoughness: 0.18,
    envMapIntensity: 1.1,
  });

  material.onBeforeCompile = (shader) => {
    Object.assign(shader.uniforms, uniforms);

    shader.vertexShader =
      `
      attribute vec3 aCherry;
      attribute vec3 aBean;
      attribute vec3 aCherryN;
      attribute vec3 aBeanN;
      attribute float aGroove;
      uniform float uMorph;
      uniform float uTime;
      varying float vGrooveV;
    ` + shader.vertexShader;

    shader.vertexShader = shader.vertexShader
      .replace(
        "#include <beginnormal_vertex>",
        `
        vec3 objectNormal = normalize( mix( aCherryN, aBeanN, uMorph ) );
        vGrooveV = aGroove * uMorph;
        `,
      )
      .replace(
        "#include <begin_vertex>",
        `
        vec3 transformed = mix( aCherry, aBean, uMorph );
        transformed += objectNormal * sin( transformed.x * 9.0 + transformed.y * 7.0 + uTime * 0.7 ) * 0.0035;
        `,
      );

    shader.fragmentShader =
      `
      uniform float uGroove;
      uniform vec3 uGrooveColor;
      uniform float uEmber;
      uniform vec3 uEmberColor;
      varying float vGrooveV;
    ` + shader.fragmentShader;

    shader.fragmentShader = shader.fragmentShader
      .replace(
        "#include <color_fragment>",
        `
        #include <color_fragment>
        float gm = smoothstep( 0.22, 0.92, vGrooveV );
        diffuseColor.rgb = mix( diffuseColor.rgb, uGrooveColor, gm * uGroove );
        `,
      )
      .replace(
        "#include <emissivemap_fragment>",
        `
        #include <emissivemap_fragment>
        float fres = pow( 1.0 - clamp( dot( normal, normalize( vViewPosition ) ), 0.0, 1.0 ), 2.6 );
        totalEmissiveRadiance += uEmberColor * fres * uEmber;
        `,
      );
  };

  const typed = material as THREE.MeshPhysicalMaterial & {
    uniformsRef: MorphUniforms;
  };
  typed.uniformsRef = uniforms;
  return typed;
}

/* ------------------------------------------------------------------ */
/* Rampa de estados: fruto → pergaminho → grão cru → torra → grão oleoso */
/* ------------------------------------------------------------------ */

export type CoffeeState = {
  /** 0 = cereja, 1 = grão */
  morph: number;
  color: string;
  /** cor da película prateada na fenda */
  groove: string;
  grooveAmount: number;
  roughness: number;
  clearcoat: number;
  clearcoatRoughness: number;
  /** brasa de borda durante a torrefação */
  ember: number;
  /** escala relativa — o grão incha ao torrar e encolhe ao secar */
  scale: number;
};

type Stop = CoffeeState & { at: number };

/**
 * A ordem respeita a produção real:
 *   fruto maduro → fruto escurecido → semente em pergaminho →
 *   grão cru esverdeado → torra canela → torra média → torra escura oleosa
 */
const RAMP: Stop[] = [
  {
    at: 0.0,
    morph: 0,
    color: "#9c1a12",
    groove: "#f0e3c9",
    grooveAmount: 0,
    roughness: 0.16,
    clearcoat: 1.0,
    clearcoatRoughness: 0.1,
    ember: 0,
    scale: 1.0,
  },
  {
    at: 0.2,
    morph: 0.04,
    color: "#7d1210",
    groove: "#f0e3c9",
    grooveAmount: 0.05,
    roughness: 0.2,
    clearcoat: 0.95,
    clearcoatRoughness: 0.14,
    ember: 0,
    scale: 0.99,
  },
  {
    at: 0.34,
    morph: 0.72,
    color: "#d8c49b",
    groove: "#f6ecd8",
    grooveAmount: 0.55,
    roughness: 0.78,
    clearcoat: 0.12,
    clearcoatRoughness: 0.7,
    ember: 0,
    scale: 0.9,
  },
  {
    at: 0.46,
    morph: 1,
    color: "#93a471",
    groove: "#e9e3cb",
    grooveAmount: 0.75,
    roughness: 0.72,
    clearcoat: 0.14,
    clearcoatRoughness: 0.62,
    ember: 0,
    scale: 0.92,
  },
  {
    at: 0.58,
    morph: 1,
    color: "#b5773c",
    groove: "#e6d3ae",
    grooveAmount: 0.6,
    roughness: 0.6,
    clearcoat: 0.2,
    clearcoatRoughness: 0.5,
    ember: 0.55,
    scale: 1.0,
  },
  {
    at: 0.68,
    morph: 1,
    color: "#7c431f",
    groove: "#d6b589",
    grooveAmount: 0.5,
    roughness: 0.5,
    clearcoat: 0.3,
    clearcoatRoughness: 0.38,
    ember: 0.75,
    scale: 1.05,
  },
  {
    at: 0.8,
    morph: 1,
    color: "#44230f",
    groove: "#a97f52",
    grooveAmount: 0.42,
    roughness: 0.42,
    clearcoat: 0.5,
    clearcoatRoughness: 0.28,
    ember: 0.3,
    scale: 1.07,
  },
  {
    at: 1.0,
    morph: 1,
    color: "#2b160c",
    groove: "#8a6240",
    grooveAmount: 0.38,
    roughness: 0.34,
    clearcoat: 0.72,
    clearcoatRoughness: 0.2,
    ember: 0,
    scale: 1.06,
  },
];

const cA = new THREE.Color();
const cB = new THREE.Color();

function lerp(a: number, b: number, t: number) {
  return a + (b - a) * t;
}

/** Estado interpolado em t ∈ [0,1] da linha de torra. */
export function coffeeStateAt(t: number, out: CoffeeState): CoffeeState {
  const x = Math.min(1, Math.max(0, t));
  let i = 0;
  while (i < RAMP.length - 2 && x > RAMP[i + 1].at) i++;
  const a = RAMP[i];
  const b = RAMP[i + 1];
  const span = Math.max(1e-5, b.at - a.at);
  const k = Math.min(1, Math.max(0, (x - a.at) / span));
  // suavização para não haver "degrau" entre estágios
  const s = k * k * (3 - 2 * k);

  out.morph = lerp(a.morph, b.morph, s);
  out.grooveAmount = lerp(a.grooveAmount, b.grooveAmount, s);
  out.roughness = lerp(a.roughness, b.roughness, s);
  out.clearcoat = lerp(a.clearcoat, b.clearcoat, s);
  out.clearcoatRoughness = lerp(a.clearcoatRoughness, b.clearcoatRoughness, s);
  out.ember = lerp(a.ember, b.ember, s);
  out.scale = lerp(a.scale, b.scale, s);

  cA.set(a.color);
  cB.set(b.color);
  out.color = `#${cA.lerp(cB, s).getHexString()}`;
  cA.set(a.groove);
  cB.set(b.groove);
  out.groove = `#${cA.lerp(cB, s).getHexString()}`;
  return out;
}

export function emptyState(): CoffeeState {
  return {
    morph: 0,
    color: "#9c1a12",
    groove: "#f0e3c9",
    grooveAmount: 0,
    roughness: 0.2,
    clearcoat: 1,
    clearcoatRoughness: 0.12,
    ember: 0,
    scale: 1,
  };
}

const tmpColor = new THREE.Color();

/** Aplica o estado ao material sem alocar objetos por frame. */
export function applyCoffeeState(
  material: THREE.MeshPhysicalMaterial & { uniformsRef: MorphUniforms },
  state: CoffeeState,
) {
  material.color.set(tmpColor.set(state.color));
  material.roughness = state.roughness;
  // clearcoat nunca chega a zero: evita recompilação do programa
  material.clearcoat = Math.max(0.06, state.clearcoat);
  material.clearcoatRoughness = state.clearcoatRoughness;
  const u = material.uniformsRef;
  u.uMorph.value = state.morph;
  u.uGroove.value = state.grooveAmount;
  u.uGrooveColor.value.set(state.groove);
  u.uEmber.value = state.ember;
}
