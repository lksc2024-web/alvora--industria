import * as THREE from "three";

import { photoTexture } from "./photoTextures";

export type MorphUniforms = {
  uMorph: { value: number };
  uTime: { value: number };
  uGroove: { value: number };
  uGrooveColor: { value: THREE.Color };
  uEmber: { value: number };
  uEmberColor: { value: THREE.Color };
  /** quanto da foto real aparece na superfície (0 = só a cor da rampa) */
  uPhoto: { value: number };
  /** 0 = grão cru/pergaminho, 1 = grão torrado */
  uRoastT: { value: number };
  uBump: { value: number };
  /** 1 = a luz vem da própria foto (realismo); 0 = luz 3D do three.js */
  uPhotoLit: { value: number };
  /** metade da cereja: -1 esquerda, +1 direita, 0 inteira */
  uHalf: { value: number };
  /** o grão se desfaz em pó (moagem) */
  uShatter: { value: number };
  uGloss: { value: number };
  tCherry: { value: THREE.Texture };
  tGreen: { value: THREE.Texture };
  tRoast: { value: THREE.Texture };
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
    uPhoto: { value: 1 },
    uRoastT: { value: 0 },
    uBump: { value: 1 },
    uPhotoLit: { value: 1 },
    uHalf: { value: 0 },
    uShatter: { value: 0 },
    uGloss: { value: 0.6 },
    tCherry: { value: photoTexture("/textura/cereja.jpg") },
    tGreen: { value: photoTexture("/textura/grao-verde.jpg") },
    tRoast: { value: photoTexture("/textura/grao-torrado.jpg") },
  };

  const material = new THREE.MeshPhysicalMaterial({
    color: new THREE.Color("#8e1410"),
    roughness: 0.2,
    metalness: 0.0,
    clearcoat: 0.9,
    clearcoatRoughness: 0.18,
    envMapIntensity: 1.1,
  });

  material.toneMapped = false;
  material.side = THREE.DoubleSide;
  material.onBeforeCompile = (shader) => {
    Object.assign(shader.uniforms, uniforms);

    shader.vertexShader =
      `
      attribute vec3 aCherry;
      attribute vec3 aBean;
      attribute vec3 aCherryN;
      attribute vec3 aBeanN;
      attribute float aGroove;
      attribute vec3 aDir;
      uniform float uMorph;
      uniform float uTime;
      varying float vGrooveV;
      varying vec3 vDir;
      varying vec3 vObj;
    ` + shader.vertexShader;

    shader.vertexShader = shader.vertexShader
      .replace(
        "#include <beginnormal_vertex>",
        `
        vec3 objectNormal = normalize( mix( aCherryN, aBeanN, uMorph ) );
        vGrooveV = aGroove * uMorph;
        vDir = aDir;
        `,
      )
      .replace(
        "#include <begin_vertex>",
        `
        vec3 transformed = mix( aCherry, aBean, uMorph );
        transformed += objectNormal * sin( transformed.x * 9.0 + transformed.y * 7.0 + uTime * 0.7 ) * 0.0035;
        vObj = transformed;
        `,
      );

    shader.fragmentShader =
      `
      uniform float uGroove;
      uniform vec3 uGrooveColor;
      uniform float uEmber;
      uniform vec3 uEmberColor;
      uniform float uMorph;
      uniform float uPhoto;
      uniform float uRoastT;
      uniform float uBump;
      uniform sampler2D tCherry;
      uniform sampler2D tGreen;
      uniform sampler2D tRoast;
      uniform float uPhotoLit;
      uniform float uHalf;
      uniform float uShatter;
      uniform float uGloss;
      varying float vGrooveV;
      varying vec3 vDir;
      varying vec3 vObj;
      float aln_h3( vec3 p ) { return fract( sin( dot( p, vec3( 127.1, 311.7, 74.7 ) ) ) * 43758.5453 ); }
      float aln_n3( vec3 p ) {
        vec3 i = floor( p ); vec3 f = fract( p ); f = f * f * ( 3.0 - 2.0 * f );
        return mix( mix( mix( aln_h3( i ), aln_h3( i + vec3( 1, 0, 0 ) ), f.x ), mix( aln_h3( i + vec3( 0, 1, 0 ) ), aln_h3( i + vec3( 1, 1, 0 ) ), f.x ), f.y ),
                    mix( mix( aln_h3( i + vec3( 0, 0, 1 ) ), aln_h3( i + vec3( 1, 0, 1 ) ), f.x ), mix( aln_h3( i + vec3( 0, 1, 1 ) ), aln_h3( i + vec3( 1, 1, 1 ) ), f.x ), f.y ), f.z );
      }
    ` + shader.fragmentShader;

    shader.fragmentShader = shader.fragmentShader
      .replace(
        "#include <color_fragment>",
        `
        #include <color_fragment>
        // Superfície real tirada das fotos. A face chata do grão (+Z) recebe o
        // grão fotografado de frente, com a fenda; o dorso usa a metade de cima
        // da mesma foto, esticada, para não repetir a fenda nas costas.
        vec3 dd = normalize( vDir );
        vec2 uvF = dd.xy * 0.5 + 0.5;
        vec2 uvB = vec2( 1.0 - uvF.x, 0.74 + dd.y * 0.2 );
        float front = smoothstep( -0.2, 0.3, dd.z );
        // a cereja é quase uma esfera: a foto é projetada a partir da câmera,
        // então ela sempre mostra a face fotografada, sem esticar nas bordas
        vec3 vn = normalize( vNormal );
        vec3 cherryC = texture2D( tCherry, vn.xy * 0.47 + 0.5 ).rgb;
        vec3 greenC = mix( texture2D( tGreen, uvB ).rgb, texture2D( tGreen, uvF ).rgb, front );
        vec3 roastC = mix( texture2D( tRoast, uvB ).rgb, texture2D( tRoast, uvF ).rgb, front );
        // a torra não é um esmaecer: uma frente de calor atravessa o grão
        float rn = aln_n3( dd * 1.6 + 2.0 ) * 0.75 + aln_n3( dd * 4.5 ) * 0.25;
        float rf = smoothstep( rn - 0.07, rn + 0.07, uRoastT * 1.25 - 0.12 );
        vec3 beanC = mix( greenC, roastC, rf );
        float roastEdge = ( 1.0 - abs( rf - 0.5 ) * 2.0 ) * step( 0.001, uRoastT ) * step( uRoastT, 0.999 );
        float beanL = dot( beanC, vec3( 0.299, 0.587, 0.114 ) );
        // a cor da rampa dá o tom de cada estágio; a foto dá o detalhe
        vec3 toned = diffuseColor.rgb * clamp( beanL / 0.32, 0.25, 2.2 );
        vec3 bean = mix( toned, beanC, 0.82 );
        float isBean = smoothstep( 0.05, 0.6, uMorph );
        vec3 realC = mix( cherryC * 1.05, bean, isBean );
        // a cereja aberta ao meio: só uma metade, com a polpa por dentro
        if ( uHalf != 0.0 && vObj.x * uHalf < -0.004 ) discard;
        if ( !gl_FrontFacing && ( uHalf != 0.0 || uShatter > 0.0 ) ) {
          float cy = clamp( length( vObj.yz ), 0.0, 1.0 );
          vec3 flesh = mix( vec3( 0.86, 0.72, 0.42 ), vec3( 0.62, 0.12, 0.08 ), smoothstep( 0.55, 0.95, cy ) );
          realC = mix( flesh, vec3( 0.24, 0.13, 0.07 ), isBean );
        }
        // moagem: o grão se parte em pó a partir de rachaduras
        float sh = aln_n3( dd * 4.5 + 3.0 ) * 0.65 + aln_n3( dd * 13.0 ) * 0.35;
        if ( uShatter > 0.0 && sh < uShatter * 1.15 - 0.08 ) discard;
        float shEdge = uShatter > 0.0 ? 1.0 - smoothstep( 0.0, 0.06, sh - ( uShatter * 1.15 - 0.08 ) ) : 0.0;
        realC = mix( realC, vec3( 0.36, 0.2, 0.1 ), shEdge );
        diffuseColor.rgb = mix( diffuseColor.rgb, realC, uPhoto );
        float photoH = beanL * isBean;
        float gm = smoothstep( 0.22, 0.92, vGrooveV );
        diffuseColor.rgb = mix( diffuseColor.rgb, uGrooveColor, gm * uGroove * ( 1.0 - 0.8 * uPhoto ) );
        `,
      )
      .replace(
        "#include <normal_fragment_maps>",
        `
        #include <normal_fragment_maps>
        // relevo da foto: rugas do grão, gotas da cereja
        {
          vec3 sx = dFdx( -vViewPosition );
          vec3 sy = dFdy( -vViewPosition );
          float bx = dFdx( photoH );
          float by = dFdy( photoH );
          vec3 r1 = cross( sy, normal );
          vec3 r2 = cross( normal, sx );
          float det = dot( sx, r1 );
          vec3 grad = sign( det ) * ( bx * r1 + by * r2 );
          normal = normalize( abs( det ) * normal - grad * 0.3 * uBump * uPhoto );
        }
        `,
      )
      .replace(
        "#include <opaque_fragment>",
        `
        {
          // a foto já traz a luz certa: o 3D só modula de leve e põe o brilho
          vec3 L = normalize( vec3( 0.45, 0.62, 0.64 ) );
          vec3 V = normalize( vViewPosition );
          float ndl = max( dot( normal, L ), 0.0 );
          float spec = pow( max( dot( normal, normalize( L + V ) ), 0.0 ), mix( 18.0, 90.0, uGloss ) ) * uGloss * 0.55;
          float rim = pow( 1.0 - max( dot( normal, V ), 0.0 ), 3.0 );
          vec3 lit = diffuseColor.rgb * ( 0.78 + 0.42 * ndl ) + vec3( 1.0, 0.9, 0.76 ) * spec + vec3( 1.0, 0.78, 0.5 ) * rim * 0.22;
          outgoingLight = mix( outgoingLight, lit + totalEmissiveRadiance, uPhotoLit );
        }
        #include <opaque_fragment>
        `,
      )
      .replace(
        "#include <emissivemap_fragment>",
        `
        #include <emissivemap_fragment>
        // expoente alto: a brasa fica presa à silhueta em vez de tingir a face
        float fres = pow( 1.0 - clamp( dot( normal, normalize( vViewPosition ) ), 0.0, 1.0 ), 3.6 );
        totalEmissiveRadiance += uEmberColor * fres * uEmber;
        totalEmissiveRadiance += uEmberColor * roastEdge * 0.55;
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
  /** 0 = superfície do grão cru, 1 = do grão torrado (fotos) */
  roast: number;
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
    roast: 0,
    scale: 1.0,
  },
  {
    at: 0.15,
    morph: 0.03,
    color: "#7d1210",
    groove: "#f0e3c9",
    grooveAmount: 0.05,
    roughness: 0.2,
    clearcoat: 0.95,
    clearcoatRoughness: 0.14,
    ember: 0,
    roast: 0,
    scale: 0.99,
  },
  {
    // despolpa: a casca sai e aparece a semente ainda em pergaminho
    at: 0.23,
    morph: 0.5,
    color: "#b0744f",
    groove: "#f2e6cf",
    grooveAmount: 0.3,
    roughness: 0.52,
    clearcoat: 0.45,
    clearcoatRoughness: 0.4,
    ember: 0,
    roast: 0,
    scale: 0.94,
  },
  {
    at: 0.29,
    morph: 0.88,
    color: "#d8c49b",
    groove: "#f6ecd8",
    grooveAmount: 0.58,
    roughness: 0.78,
    clearcoat: 0.12,
    clearcoatRoughness: 0.7,
    ember: 0,
    roast: 0,
    scale: 0.9,
  },
  {
    at: 0.41,
    morph: 1,
    color: "#93a471",
    groove: "#e9e3cb",
    grooveAmount: 0.75,
    roughness: 0.72,
    clearcoat: 0.14,
    clearcoatRoughness: 0.62,
    ember: 0,
    roast: 0,
    scale: 0.92,
  },
  {
    at: 0.54,
    morph: 1,
    color: "#b5773c",
    groove: "#e6d3ae",
    grooveAmount: 0.6,
    roughness: 0.6,
    clearcoat: 0.2,
    clearcoatRoughness: 0.5,
    ember: 0.45,
    roast: 0.35,
    scale: 1.0,
  },
  {
    at: 0.62,
    morph: 1,
    color: "#7c431f",
    groove: "#d6b589",
    grooveAmount: 0.5,
    roughness: 0.5,
    clearcoat: 0.3,
    clearcoatRoughness: 0.38,
    ember: 0.6,
    roast: 0.7,
    scale: 1.05,
  },
  {
    at: 0.7,
    morph: 1,
    color: "#44230f",
    groove: "#a97f52",
    grooveAmount: 0.42,
    roughness: 0.42,
    clearcoat: 0.5,
    clearcoatRoughness: 0.28,
    ember: 0.35,
    roast: 1,
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
    roast: 1,
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
  out.roast = lerp(a.roast, b.roast, s);

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
    roast: 0,
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
  u.uRoastT.value = state.roast;
  u.uGloss.value = 1 - state.roughness;
}
