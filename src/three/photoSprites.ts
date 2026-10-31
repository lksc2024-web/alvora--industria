import * as THREE from "three";

import { photoTexture } from "./photoTextures";

/**
 * Fruto e grãos feitos das próprias fotos.
 *
 * Os recortes (public/textura/*-recorte.png) são a cereja, o grão cru e o grão
 * torrado exatamente como saíram das fotos, com fundo transparente. Eles viram
 * planos que encaram a câmera e fazem a mesma coreografia da versão 3D: a
 * cereja se abre em duas metades como portas e revela o grão; uma frente de
 * calor atravessa o grão cru até ele virar o torrado; na moagem o grão se parte
 * em lascas que voam, enquanto o pó sobe.
 *
 * A luz é a da própria foto. Nada é re-iluminado: é isso que mantém o realismo.
 */

const SHARED = /* glsl */ `
  uniform sampler2D tCherry;
  uniform sampler2D tGreen;
  uniform sampler2D tRoast;
  uniform float uStage;   // 0 = cereja, 1 = grão
  uniform float uRoast;   // 0 = cru, 1 = torrado
  uniform float uTime;

  float sp_h( vec2 p ) { return fract( sin( dot( p, vec2( 127.1, 311.7 ) ) ) * 43758.5453 ); }
  float sp_n( vec2 p ) {
    vec2 i = floor( p ); vec2 f = fract( p ); f = f * f * ( 3.0 - 2.0 * f );
    return mix( mix( sp_h( i ), sp_h( i + vec2( 1, 0 ) ), f.x ), mix( sp_h( i + vec2( 0, 1 ) ), sp_h( i + vec2( 1, 1 ) ), f.x ), f.y );
  }
  // frente de calor: a torra entra por baixo e pelas bordas, com contorno irregular
  vec4 beanAt( vec2 uv, float roast, out float edge ) {
    vec4 g = texture2D( tGreen, uv );
    vec4 r = texture2D( tRoast, ( uv - 0.5 ) * vec2( 0.86, 0.97 ) + 0.5 );
    float n = sp_n( uv * 3.0 + 1.7 ) * 0.55 + sp_n( uv * 9.0 ) * 0.3 + sp_n( uv * 31.0 ) * 0.15;
    float d = length( ( uv - 0.5 ) * vec2( 1.6, 1.0 ) );
    // a cor esquenta primeiro (palha → caramelo) e depois a superfície vira a do grão torrado
    float front = roast * 1.6 - 0.3 + d * 0.3 - ( 1.0 - uv.y ) * 0.15;
    float k = smoothstep( n - 0.22, n + 0.22, front );
    float warm = smoothstep( 0.0, 0.45, roast );
    g.rgb = mix( g.rgb, g.rgb * vec3( 0.95, 0.68, 0.42 ), warm * ( 1.0 - k ) * 0.8 );
    edge = smoothstep( 0.25, 0.5, k ) * ( 1.0 - smoothstep( 0.5, 0.8, k ) ) * step( 0.001, roast ) * step( roast, 0.97 ) * 0.6;
    vec4 c = mix( g, r, k );
    c.a = max( g.a * ( 1.0 - k ), r.a * k );
    return c;
  }
  vec4 subjectAt( vec2 uv, out float edge ) {
    edge = 0.0;
    vec4 cherry = texture2D( tCherry, uv );
    if ( uStage <= 0.0 ) return cherry;
    vec4 bean = beanAt( uv, uRoast, edge );
    return mix( cherry, bean, uStage );
  }
`;

function baseUniforms() {
  return {
    tCherry: { value: photoTexture("/textura/cereja-recorte.png") },
    tGreen: { value: photoTexture("/textura/grao-verde-recorte.png") },
    tRoast: { value: photoTexture("/textura/grao-torrado-recorte.png") },
    uStage: { value: 0 },
    uRoast: { value: 0 },
    uTime: { value: 0 },
    uOpacity: { value: 1 },
    uEmber: { value: new THREE.Color("#ff7a1c") },
  };
}

export type SpriteMaterial = THREE.ShaderMaterial & {
  uniforms: ReturnType<typeof baseUniforms> & {
    uHalf: { value: number };
    uFlesh: { value: THREE.Color };
  };
};

/** Um plano com o fruto/grão. `uHalf` corta a metade (-1 esquerda, +1 direita). */
export function createSpriteMaterial(): SpriteMaterial {
  const uniforms = {
    ...baseUniforms(),
    uHalf: { value: 0 },
    uFlesh: { value: new THREE.Color("#e9cf8e") },
  };
  return new THREE.ShaderMaterial({
    uniforms,
    transparent: true,
    depthWrite: false,
    side: THREE.DoubleSide,
    vertexShader: /* glsl */ `
      varying vec2 vUv;
      void main() {
        vUv = uv;
        gl_Position = projectionMatrix * modelViewMatrix * vec4( position, 1.0 );
      }
    `,
    fragmentShader: /* glsl */ `
      ${SHARED}
      uniform float uOpacity;
      uniform float uHalf;
      uniform vec3 uFlesh;
      uniform vec3 uEmber;
      varying vec2 vUv;
      void main() {
        vec2 uv = vUv;
        if ( uHalf != 0.0 && ( uv.x - 0.5 ) * uHalf < 0.0 ) discard;
        float edge;
        vec4 c = subjectAt( uv, edge );
        if ( !gl_FrontFacing ) {
          // o lado de dentro da cereja: polpa clara com veios, mais vermelha na borda
          float r = length( ( uv - 0.5 ) * 2.0 );
          vec3 flesh = mix( uFlesh, vec3( 0.55, 0.1, 0.07 ), smoothstep( 0.72, 0.95, r ) );
          flesh *= 0.85 + 0.25 * sp_n( uv * 22.0 );
          c.rgb = flesh;
        }
        c.rgb += uEmber * edge * 0.9;
        float a = c.a * uOpacity;
        if ( a < 0.01 ) discard;
        gl_FragColor = vec4( c.rgb, a );
        #include <colorspace_fragment>
      }
    `,
  }) as SpriteMaterial;
}

/**
 * O lote inteiro: muitos frutos/grãos fotografados, cada um encarando a câmera,
 * girando só no próprio plano. Usa a matriz de instância de cada grão.
 */
export function createSwarmMaterial() {
  const uniforms = { ...baseUniforms(), uSize: { value: 1 } };
  return new THREE.ShaderMaterial({
    uniforms,
    transparent: true,
    depthWrite: false,
    vertexShader: /* glsl */ `
      uniform float uSize;
      varying vec2 vUv;
      varying float vSeed;
      void main() {
        vUv = uv;
        vec4 center = instanceMatrix * vec4( 0.0, 0.0, 0.0, 1.0 );
        float s = length( instanceMatrix[ 0 ].xyz );
        float a = atan( instanceMatrix[ 0 ].y, instanceMatrix[ 0 ].x ) + instanceMatrix[ 2 ].x * 2.0;
        vec2 q = mat2( cos( a ), sin( a ), -sin( a ), cos( a ) ) * position.xy * s * uSize;
        vSeed = fract( center.x * 3.17 + center.y * 7.31 );
        vec4 mv = modelViewMatrix * center;
        mv.xy += q;
        gl_Position = projectionMatrix * mv;
      }
    `,
    fragmentShader: /* glsl */ `
      ${SHARED}
      uniform float uOpacity;
      uniform vec3 uEmber;
      varying vec2 vUv;
      varying float vSeed;
      void main() {
        float edge;
        vec4 c = subjectAt( vUv, edge );
        // cada grão tem um tom levemente diferente, como num lote real
        c.rgb *= 0.86 + vSeed * 0.24;
        c.rgb += uEmber * edge * 0.6;
        float a = c.a * uOpacity;
        if ( a < 0.02 ) discard;
        gl_FragColor = vec4( c.rgb, a );
        #include <colorspace_fragment>
      }
    `,
  });
}

/**
 * Lascas do grão torrado na moagem: o recorte é dividido numa grade e cada
 * pedaço voa para fora girando, mostrando o pedaço certo da foto.
 */
export function createShardsGeometry(cols = 13, rows = 20) {
  const base = new THREE.PlaneGeometry(1 / cols, 1 / rows);
  const geo = new THREE.InstancedBufferGeometry();
  geo.index = base.index;
  geo.setAttribute("position", base.getAttribute("position"));
  geo.setAttribute("uv", base.getAttribute("uv"));
  const n = cols * rows;
  const cell = new Float32Array(n * 2);
  const rnd = new Float32Array(n * 4);
  let s = 7;
  const r = () => ((s = (s * 16807) % 2147483647) - 1) / 2147483646;
  for (let i = 0; i < n; i++) {
    cell[i * 2] = (i % cols) / cols;
    cell[i * 2 + 1] = Math.floor(i / cols) / rows;
    rnd[i * 4] = r();
    rnd[i * 4 + 1] = r();
    rnd[i * 4 + 2] = r();
    rnd[i * 4 + 3] = r();
  }
  geo.setAttribute("aCell", new THREE.InstancedBufferAttribute(cell, 2));
  geo.setAttribute("aRnd", new THREE.InstancedBufferAttribute(rnd, 4));
  geo.instanceCount = n;
  (geo as THREE.InstancedBufferGeometry & { grid: [number, number] }).grid = [cols, rows];
  return geo;
}

export function createShardsMaterial(cols = 13, rows = 20) {
  return new THREE.ShaderMaterial({
    uniforms: {
      tRoast: { value: photoTexture("/textura/grao-torrado-recorte.png") },
      uBreak: { value: 0 },
      uTime: { value: 0 },
      uGrid: { value: new THREE.Vector2(cols, rows) },
      uOpacity: { value: 1 },
    },
    transparent: true,
    depthWrite: false,
    side: THREE.DoubleSide,
    vertexShader: /* glsl */ `
      attribute vec2 aCell;
      attribute vec4 aRnd;
      uniform float uBreak;
      uniform vec2 uGrid;
      varying vec2 vUv;
      varying vec2 vLocal;
      varying float vSeedS;
      varying float vFade;
      void main() {
        vLocal = uv;
        vSeedS = aRnd.w;
        vec2 cellCenter = aCell + 0.5 / uGrid;
        vUv = aCell + uv / uGrid;
        // cada lasca parte do seu lugar no grão e é lançada para fora
        vec2 from = cellCenter - 0.5;
        float t = clamp( ( uBreak - aRnd.x * 0.35 ) / 0.65, 0.0, 1.0 );
        vec2 dir = normalize( from + ( aRnd.yz - 0.5 ) * 0.6 + 1e-4 );
        float dist = t * ( 0.6 + aRnd.w * 1.4 );
        float ang = t * ( aRnd.y - 0.5 ) * 9.0;
        vec2 p = mat2( cos( ang ), sin( ang ), -sin( ang ), cos( ang ) ) * position.xy * 1.35 * ( 1.0 - t * 0.7 );
        vec3 pos = vec3( from + p + dir * dist + vec2( 0.0, -t * t * 0.6 ), ( aRnd.z - 0.5 ) * t * 0.8 );
        vFade = 1.0 - smoothstep( 0.55, 1.0, t );
        gl_Position = projectionMatrix * modelViewMatrix * vec4( pos, 1.0 );
      }
    `,
    fragmentShader: /* glsl */ `
      uniform sampler2D tRoast;
      uniform float uOpacity;
      varying vec2 vUv;
      varying vec2 vLocal;
      varying float vSeedS;
      varying float vFade;
      void main() {
        // cada lasca é um torrão irregular, não um quadrado
        vec2 q = vLocal - 0.5;
        float ang = atan( q.y, q.x );
        float rad = 0.36 + 0.12 * sin( ang * 3.0 + vSeedS * 20.0 ) + 0.06 * sin( ang * 7.0 + vSeedS * 41.0 );
        if ( length( q ) > rad ) discard;
        vec4 c = texture2D( tRoast, vUv );
        float a = c.a * vFade * uOpacity;
        if ( a < 0.02 ) discard;
        gl_FragColor = vec4( c.rgb, a );
        #include <colorspace_fragment>
      }
    `,
  });
}
