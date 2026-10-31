import * as THREE from "three";

import { photoTexture } from "./photoTextures";

let fio: THREE.Texture | null = null;
function fioTexture() {
  if (!fio) {
    fio = new THREE.TextureLoader().load("/textura/fio.jpg");
    fio.colorSpace = THREE.SRGBColorSpace;
    fio.wrapS = THREE.ClampToEdgeWrapping;
    fio.wrapT = THREE.MirroredRepeatWrapping;
  }
  return fio;
}

/** Ruído de gradiente compartilhado por todos os shaders da experiência. */
export const NOISE_GLSL = /* glsl */ `
vec3 aln_hash3( vec3 p ) {
  p = vec3(
    dot( p, vec3( 127.1, 311.7, 74.7 ) ),
    dot( p, vec3( 269.5, 183.3, 246.1 ) ),
    dot( p, vec3( 113.5, 271.9, 124.6 ) )
  );
  return fract( sin( p ) * 43758.5453123 ) * 2.0 - 1.0;
}

float aln_noise( vec3 p ) {
  vec3 i = floor( p );
  vec3 f = fract( p );
  vec3 u = f * f * ( 3.0 - 2.0 * f );
  return mix(
    mix(
      mix( dot( aln_hash3( i + vec3(0,0,0) ), f - vec3(0,0,0) ),
           dot( aln_hash3( i + vec3(1,0,0) ), f - vec3(1,0,0) ), u.x ),
      mix( dot( aln_hash3( i + vec3(0,1,0) ), f - vec3(0,1,0) ),
           dot( aln_hash3( i + vec3(1,1,0) ), f - vec3(1,1,0) ), u.x ), u.y ),
    mix(
      mix( dot( aln_hash3( i + vec3(0,0,1) ), f - vec3(0,0,1) ),
           dot( aln_hash3( i + vec3(1,0,1) ), f - vec3(1,0,1) ), u.x ),
      mix( dot( aln_hash3( i + vec3(0,1,1) ), f - vec3(0,1,1) ),
           dot( aln_hash3( i + vec3(1,1,1) ), f - vec3(1,1,1) ), u.x ), u.y ), u.z );
}

float aln_fbm( vec3 p ) {
  float a = 0.5;
  float s = 0.0;
  for ( int i = 0; i < 4; i++ ) {
    s += a * aln_noise( p );
    p *= 2.03;
    a *= 0.5;
  }
  return s;
}
`;

/* ------------------------------------------------------------------ */
/* Fundo: esfera invertida com gradiente, brilho direcional e grão      */
/* ------------------------------------------------------------------ */

export function createBackdropMaterial(top = "#120b07", bottom = "#060403") {
  return new THREE.ShaderMaterial({
    side: THREE.BackSide,
    depthWrite: false,
    uniforms: {
      uTop: { value: new THREE.Color(top) },
      uBottom: { value: new THREE.Color(bottom) },
      uGlowColor: { value: new THREE.Color("#ffae5c") },
      uGlowPos: { value: new THREE.Vector3(0.45, 0.1, -1).normalize() },
      uGlow: { value: 0.5 },
      uTime: { value: 0 },
      uGrain: { value: 0.035 },
      // foto real ao fundo, desfocada (troca suave entre duas)
      tPhotoA: { value: null as THREE.Texture | null },
      tPhotoB: { value: null as THREE.Texture | null },
      uRectA: { value: new THREE.Vector4(0, 0, 1, 1) },
      uRectB: { value: new THREE.Vector4(0, 0, 1, 1) },
      uPhotoMix: { value: 0 },
      uPhotoAmt: { value: 0 },
      uPhotoBlur: { value: 3 },
      uPhotoGain: { value: 0.8 },
      uRes: { value: new THREE.Vector2(1, 1) },
    },
    vertexShader: /* glsl */ `
      varying vec3 vDir;
      void main() {
        vDir = normalize( position );
        gl_Position = projectionMatrix * modelViewMatrix * vec4( position, 1.0 );
      }
    `,
    fragmentShader: /* glsl */ `
      ${NOISE_GLSL}
      uniform vec3 uTop;
      uniform vec3 uBottom;
      uniform vec3 uGlowColor;
      uniform vec3 uGlowPos;
      uniform float uGlow;
      uniform float uTime;
      uniform float uGrain;
      uniform sampler2D tPhotoA;
      uniform sampler2D tPhotoB;
      uniform vec4 uRectA;
      uniform vec4 uRectB;
      uniform float uPhotoMix;
      uniform float uPhotoAmt;
      uniform float uPhotoBlur;
      uniform float uPhotoGain;
      uniform vec2 uRes;
      varying vec3 vDir;

      // recorte da foto cobrindo a tela inteira (origem do recorte no topo)
      vec3 photoAt( sampler2D t, vec4 r, vec2 s ) {
        float ra = ( r.z * 940.0 ) / ( r.w * 1672.0 );
        float sa = uRes.x / uRes.y;
        vec2 c = s;
        if ( sa > ra ) c.y = 0.5 + ( s.y - 0.5 ) * ( ra / sa );
        else c.x = 0.5 + ( s.x - 0.5 ) * ( sa / ra );
        vec2 uv = vec2( r.x + c.x * r.z, 1.0 - ( r.y + ( 1.0 - c.y ) * r.w ) );
        return texture2D( t, uv, uPhotoBlur ).rgb;
      }

      void main() {
        vec3 d = normalize( vDir );
        float h = clamp( d.y * 0.5 + 0.5, 0.0, 1.0 );
        vec3 col = mix( uBottom, uTop, pow( h, 0.85 ) );

        // Halo direcional quente — a fonte de luz que atravessa a cena.
        // O núcleo é estreito de propósito: um lobo largo transformaria o
        // fundo inteiro em bege e mataria a leitura cinematográfica.
        float ndl = clamp( dot( d, normalize( uGlowPos ) ), 0.0, 1.0 );
        col += uGlowColor * pow( ndl, 26.0 ) * uGlow;
        col += uGlowColor * pow( ndl, 6.0 ) * uGlow * 0.16;

        // Nuvem lenta para o fundo nunca parecer um gradiente chapado.
        // Duas oitavas bastam nesta escala e o fundo cobre a tela inteira —
        // quatro oitavas aqui custariam mais que o resto da cena somado.
        float n = aln_noise( d * 2.4 + vec3( 0.0, uTime * 0.012, 0.0 ) )
                + aln_noise( d * 5.1 + vec3( 3.0, uTime * 0.02, 0.0 ) ) * 0.5;
        col *= 1.0 + n * 0.1;

        if ( uPhotoAmt > 0.001 ) {
          vec2 s = gl_FragCoord.xy / uRes;
          vec3 ph = photoAt( tPhotoA, uRectA, s );
          if ( uPhotoMix > 0.001 ) ph = mix( ph, photoAt( tPhotoB, uRectB, s ), uPhotoMix );
          col = mix( col, ph * uPhotoGain + uGlowColor * pow( ndl, 26.0 ) * uGlow * 0.4, uPhotoAmt );
        }

        // vinheta esférica: escurece atrás da câmera e nas bordas do domo
        col *= 0.55 + 0.45 * smoothstep( -0.85, 0.25, d.y );

        // grão fino evita banding em telas de 8 bits
        float gr = fract( sin( dot( gl_FragCoord.xy, vec2( 12.9898, 78.233 ) ) ) * 43758.5453 );
        col += ( gr - 0.5 ) * uGrain;

        gl_FragColor = vec4( max( col, vec3( 0.0 ) ), 1.0 );
        #include <tonemapping_fragment>
        #include <colorspace_fragment>
      }
    `,
  });
}

/* ------------------------------------------------------------------ */
/* Partículas: um único sistema que muda de papel ao longo da narrativa */
/* poeira do terreiro → brasa da torra → pó da moagem → vapor da xícara */
/* ------------------------------------------------------------------ */

export type ParticleUniforms = {
  uTime: { value: number };
  uSize: { value: number };
  uOpacity: { value: number };
  uColorA: { value: THREE.Color };
  uColorB: { value: THREE.Color };
  uSpread: { value: THREE.Vector3 };
  uSpeed: { value: number };
  uSwirl: { value: number };
  uTurb: { value: number };
  uCenter: { value: THREE.Vector3 };
  uPixelRatio: { value: number };
  /** 2.2 = brasa com núcleo marcado · 1.0 = vapor difuso */
  uSoft: { value: number };
};

export function createParticleGeometry(count: number) {
  const geo = new THREE.BufferGeometry();
  const seeds = new Float32Array(count * 3);
  const rand = new Float32Array(count);
  for (let i = 0; i < count; i++) {
    seeds[i * 3] = Math.random();
    seeds[i * 3 + 1] = Math.random();
    seeds[i * 3 + 2] = Math.random();
    rand[i] = Math.random();
  }
  // position é obrigatório para o three montar o draw call
  geo.setAttribute("position", new THREE.BufferAttribute(new Float32Array(count * 3), 3));
  geo.setAttribute("aSeed", new THREE.BufferAttribute(seeds, 3));
  geo.setAttribute("aRand", new THREE.BufferAttribute(rand, 1));
  geo.boundingSphere = new THREE.Sphere(new THREE.Vector3(), 40);
  return geo;
}

export function createParticleMaterial() {
  const uniforms: ParticleUniforms = {
    uTime: { value: 0 },
    uSize: { value: 26 },
    uOpacity: { value: 0 },
    uColorA: { value: new THREE.Color("#d8a765") },
    uColorB: { value: new THREE.Color("#8c4a1e") },
    uSpread: { value: new THREE.Vector3(9, 6, 7) },
    uSpeed: { value: 0.08 },
    uSwirl: { value: 0.1 },
    uTurb: { value: 0.6 },
    uCenter: { value: new THREE.Vector3(0, 0, 0) },
    uPixelRatio: { value: 1 },
    uSoft: { value: 2.2 },
  };

  const material = new THREE.ShaderMaterial({
    uniforms: uniforms as unknown as Record<string, THREE.IUniform>,
    transparent: true,
    depthWrite: false,
    blending: THREE.AdditiveBlending,
    vertexShader: /* glsl */ `
      ${NOISE_GLSL}
      attribute vec3 aSeed;
      attribute float aRand;
      uniform float uTime;
      uniform float uSize;
      uniform vec3 uSpread;
      uniform float uSpeed;
      uniform float uSwirl;
      uniform float uTurb;
      uniform vec3 uCenter;
      uniform float uPixelRatio;
      varying float vFade;
      varying float vRand;

      void main() {
        vRand = aRand;

        // ciclo de vida contínuo: a partícula renasce ao sair do volume
        float life = fract( aSeed.y + uTime * uSpeed * ( 0.6 + aSeed.z * 0.8 ) );

        vec3 p;
        p.x = ( aSeed.x - 0.5 ) * uSpread.x;
        p.y = ( life - 0.5 ) * uSpread.y;
        p.z = ( aSeed.z - 0.5 ) * uSpread.z;

        // rotação em torno do eixo vertical (tambor, redemoinho de vapor)
        float ang = uTime * uSwirl * ( 0.5 + aRand ) + aRand * 6.2831;
        float c = cos( ang );
        float s = sin( ang );
        p.xz = mat2( c, -s, s, c ) * p.xz;

        // turbulência: nada se move em linha reta
        vec3 t = vec3(
          aln_noise( p * 0.35 + vec3( uTime * 0.12, 0.0, 0.0 ) ),
          aln_noise( p * 0.3 + vec3( 0.0, uTime * 0.1, 11.0 ) ),
          aln_noise( p * 0.32 + vec3( 5.0, 0.0, uTime * 0.11 ) )
        );
        p += t * uTurb;
        p += uCenter;

        vec4 mv = modelViewMatrix * vec4( p, 1.0 );
        gl_Position = projectionMatrix * mv;

        // some nas extremidades do ciclo para não "piscar" ao renascer
        vFade = smoothstep( 0.0, 0.18, life ) * ( 1.0 - smoothstep( 0.76, 1.0, life ) );

        // Teto de tamanho: sem ele, uma partícula de vapor perto da câmera
        // passa de 200 px e, com blending aditivo, o overdraw derruba o
        // frame rate em GPU móvel.
        float size = uSize * ( 0.35 + aRand * 0.9 );
        gl_PointSize = clamp(
          size * uPixelRatio * ( 8.0 / max( 0.6, -mv.z ) ),
          1.0,
          110.0 * uPixelRatio
        );
      }
    `,
    fragmentShader: /* glsl */ `
      uniform vec3 uColorA;
      uniform vec3 uColorB;
      uniform float uOpacity;
      uniform float uSoft;
      varying float vFade;
      varying float vRand;

      void main() {
        vec2 uv = gl_PointCoord - 0.5;
        float d = length( uv );
        if ( d > 0.5 ) discard;
        // Brasa pede núcleo marcado; vapor pede massa difusa. O mesmo sistema
        // atende os dois trocando só o expoente.
        float r = 1.0 - d * 2.0;
        float a = pow( r, uSoft );
        vec3 col = mix( uColorA, uColorB, vRand );
        // realce central contido: um núcleo forte demais estoura para branco
        // e a brasa perde a cor que a define
        col += uColorA * pow( r, 7.0 ) * 0.28 * smoothstep( 1.0, 2.0, uSoft );
        gl_FragColor = vec4( col, a * vFade * uOpacity );
        #include <colorspace_fragment>
      }
    `,
  });

  (material as THREE.ShaderMaterial & { uniformsRef: ParticleUniforms }).uniformsRef =
    uniforms;
  return material as THREE.ShaderMaterial & { uniformsRef: ParticleUniforms };
}

/* ------------------------------------------------------------------ */
/* Porcelana com a luz da foto: a xícara e o pires vestem a foto real    */
/* ------------------------------------------------------------------ */

export function createPorcelainMaterial(height = 0.8) {
  const uniforms = {
    tPorc: { value: photoTexture("/textura/porcelana.jpg") },
    uHeight: { value: height },
    uOpacity: { value: 1 },
    uFlat: { value: 0 },
  };
  const material = new THREE.ShaderMaterial({
    uniforms,
    transparent: true,
    side: THREE.DoubleSide,
    vertexShader: /* glsl */ `
      varying vec3 vN;
      varying vec3 vV;
      varying float vY;
      void main() {
        vN = normalize( normalMatrix * normal );
        vec4 mv = modelViewMatrix * vec4( position, 1.0 );
        vV = -mv.xyz;
        vY = position.y;
        gl_Position = projectionMatrix * mv;
      }
    `,
    fragmentShader: /* glsl */ `
      uniform sampler2D tPorc;
      uniform float uHeight;
      uniform float uOpacity;
      uniform float uFlat;
      varying vec3 vN;
      varying vec3 vV;
      varying float vY;
      void main() {
        vec3 n = normalize( vN );
        if ( !gl_FrontFacing ) n = -n;
        // a coordenada horizontal vem da curvatura vista pela câmera: o
        // degradê de luz da porcelana fotografada acompanha o volume da peça
        float u = clamp( n.x * 0.48 + 0.5, 0.02, 0.98 );
        float v = uFlat > 0.5 ? clamp( 0.35 + n.y * 0.3, 0.02, 0.98 ) : clamp( vY / uHeight, 0.02, 0.98 );
        vec3 col = texture2D( tPorc, vec2( u, v ) ).rgb;
        // a xícara da foto está na sombra; aqui ela precisa ler como porcelana clara
        float lum = dot( col, vec3( 0.299, 0.587, 0.114 ) );
        col = mix( col, vec3( lum ) * vec3( 1.0, 0.96, 0.9 ), 0.35 ) * 1.55;
        if ( !gl_FrontFacing ) col *= 0.8;
        vec3 V = normalize( vV );
        float spec = pow( max( dot( n, normalize( vec3( 0.45, 0.62, 0.64 ) + V ) ), 0.0 ), 70.0 );
        col += vec3( 1.0, 0.93, 0.82 ) * spec * 0.5;
        gl_FragColor = vec4( col, uOpacity );
        #include <colorspace_fragment>
      }
    `,
  });
  // as cenas mexem em material.opacity: repassa para o shader
  Object.defineProperty(material, "opacity", {
    get: () => uniforms.uOpacity.value,
    set: (v: number) => {
      uniforms.uOpacity.value = v;
    },
  });
  return material;
}

/* ------------------------------------------------------------------ */
/* Fio de café: cilindro afinado com silhueta viva, brilho e viscosidade */
/* ------------------------------------------------------------------ */

export type StreamUniforms = {
  tFio: { value: THREE.Texture };
  uTime: { value: number };
  uProgress: { value: number };
  uWobble: { value: number };
  uDark: { value: THREE.Color };
  uLight: { value: THREE.Color };
  uOpacity: { value: number };
};

export function createStreamMaterial() {
  const uniforms: StreamUniforms = {
    uTime: { value: 0 },
    uProgress: { value: 0 },
    uWobble: { value: 1 },
    uDark: { value: new THREE.Color("#1b0d06") },
    uLight: { value: new THREE.Color("#c87f45") },
    uOpacity: { value: 1 },
    tFio: { value: fioTexture() },
  };

  const material = new THREE.ShaderMaterial({
    uniforms: uniforms as unknown as Record<string, THREE.IUniform>,
    transparent: true,
    side: THREE.DoubleSide,
    depthWrite: false,
    vertexShader: /* glsl */ `
      ${NOISE_GLSL}
      uniform float uTime;
      uniform float uWobble;
      varying vec2 vUv;
      varying vec3 vNrm;
      varying vec3 vView;

      void main() {
        vUv = uv;
        vec3 p = position;

        // o fio acelera ao cair: afina de cima para baixo
        float fall = 1.0 - uv.y;
        float thin = mix( 1.0, 0.52, fall * fall );

        // ondulação: ruído baixo em frequência, alto em amplitude perto do fim
        float n = aln_noise( vec3( p.xz * 1.4, uv.y * 3.0 - uTime * 1.6 ) );
        float amp = ( 0.035 + fall * 0.075 ) * uWobble;

        p.xz *= thin;
        p.x += n * amp;
        p.z += aln_noise( vec3( p.zx * 1.4, uv.y * 3.0 - uTime * 1.4 + 9.0 ) ) * amp;

        vNrm = normalize( normalMatrix * normalize( vec3( position.x, 0.0, position.z ) ) );
        vec4 mv = modelViewMatrix * vec4( p, 1.0 );
        vView = -mv.xyz;
        gl_Position = projectionMatrix * mv;
      }
    `,
    fragmentShader: /* glsl */ `
      ${NOISE_GLSL}
      uniform float uTime;
      uniform float uProgress;
      uniform vec3 uDark;
      uniform vec3 uLight;
      uniform float uOpacity;
      uniform sampler2D tFio;
      varying vec2 vUv;
      varying vec3 vNrm;
      varying vec3 vView;

      void main() {
        // o líquido desce: revela de cima (uv.y = 1) para baixo
        float head = 1.0 - uProgress;
        float reveal = smoothstep( head - 0.06, head + 0.02, vUv.y );
        if ( reveal < 0.01 ) discard;

        float fres = pow( 1.0 - clamp( dot( normalize( vNrm ), normalize( vView ) ), 0.0, 1.0 ), 1.6 );

        // corpo escuro, bordas âmbar: é assim que café denso lê contra a luz
        vec3 col = mix( uDark, uLight, fres * 0.85 );

        // faixas de fluxo descendo pelo fio dão a leitura de viscosidade
        float flow = aln_fbm( vec3( vUv.x * 6.0, vUv.y * 9.0 - uTime * 3.4, uTime * 0.5 ) );
        col += uLight * smoothstep( 0.18, 0.62, flow ) * 0.3;

        // realce especular fixo — o reflexo da luz da cafeteria no fio
        float spec = pow( max( 0.0, 1.0 - abs( vUv.x - 0.22 ) * 9.0 ), 3.0 );
        col += vec3( 1.0, 0.82, 0.58 ) * spec * 0.5;

        // o fio fotografado escorrendo: a faixa de café da foto desce pelo cilindro
        {
          float across = clamp( dot( normalize( vNrm ), vec3( 1.0, 0.0, 0.0 ) ) * 0.46 + 0.5, 0.03, 0.97 );
          float down = vUv.y * 0.9 + uTime * 0.85;
          vec3 real = texture2D( tFio, vec2( across, down ) ).rgb;
          col = mix( col, real * 1.1, 0.85 );
        }

        // ponta do fio um pouco mais clara, como respingo iminente
        col += uLight * ( 1.0 - smoothstep( head, head + 0.12, vUv.y ) ) * 0.25;

        float alpha = reveal * uOpacity * ( 0.78 + fres * 0.22 );
        gl_FragColor = vec4( col, alpha );
        #include <colorspace_fragment>
      }
    `,
  });

  (material as THREE.ShaderMaterial & { uniformsRef: StreamUniforms }).uniformsRef =
    uniforms;
  return material as THREE.ShaderMaterial & { uniformsRef: StreamUniforms };
}

/* ------------------------------------------------------------------ */
/* Crema: superfície viva do café na xícara (espirais, óleos, menisco)  */
/* ------------------------------------------------------------------ */

export type CremaUniforms = {
  uTime: { value: number };
  uFill: { value: number };
  uFoam: { value: number };
  uSwirl: { value: number };
  uDark: { value: THREE.Color };
  uCrema: { value: THREE.Color };
  uHighlight: { value: THREE.Color };
  uOpacity: { value: number };
  tCrema: { value: THREE.Texture };
  uPhoto: { value: number };
};

export function createCremaMaterial() {
  const uniforms: CremaUniforms = {
    uTime: { value: 0 },
    uFill: { value: 0 },
    uFoam: { value: 0 },
    uSwirl: { value: 0.35 },
    uDark: { value: new THREE.Color("#120802") },
    uCrema: { value: new THREE.Color("#b5793c") },
    uHighlight: { value: new THREE.Color("#e8c08a") },
    uOpacity: { value: 1 },
    tCrema: { value: photoTexture("/textura/crema.jpg") },
    uPhoto: { value: 1 },
  };

  const material = new THREE.ShaderMaterial({
    uniforms: uniforms as unknown as Record<string, THREE.IUniform>,
    transparent: true,
    side: THREE.DoubleSide,
    vertexShader: /* glsl */ `
      varying vec2 vUv;
      void main() {
        vUv = uv;
        gl_Position = projectionMatrix * modelViewMatrix * vec4( position, 1.0 );
      }
    `,
    fragmentShader: /* glsl */ `
      ${NOISE_GLSL}
      uniform float uTime;
      uniform float uFill;
      uniform float uFoam;
      uniform float uSwirl;
      uniform vec3 uDark;
      uniform vec3 uCrema;
      uniform vec3 uHighlight;
      uniform float uOpacity;
      uniform sampler2D tCrema;
      uniform float uPhoto;
      varying vec2 vUv;

      void main() {
        vec2 c = vUv * 2.0 - 1.0;
        float r = length( c );
        if ( r > 1.0 ) discard;

        // A superfície cresce conforme a xícara enche.
        // Atenção: smoothstep com edge0 > edge1 é indefinido em GLSL — em
        // alguns drivers devolve 0 e a bebida simplesmente não aparece.
        float edge = 1.0 - smoothstep( uFill - 0.08, uFill, r );
        if ( edge < 0.01 ) discard;

        // coordenada em espiral: é o que faz a crema "girar" como no espresso
        float ang = atan( c.y, c.x ) + r * 2.6 - uTime * uSwirl;
        vec2 sp = vec2( cos( ang ), sin( ang ) ) * r;

        float f = aln_fbm( vec3( sp * 3.2, uTime * 0.16 ) );
        float f2 = aln_fbm( vec3( sp * 7.5 + f * 1.4, uTime * 0.22 + 4.0 ) );

        vec3 col = mix( uDark, uCrema, clamp( uFoam * ( 0.5 + f * 0.9 ), 0.0, 1.0 ) );
        col = mix( col, uHighlight, smoothstep( 0.25, 0.75, f2 ) * uFoam * 0.5 );

        // a crema fotografada, girando devagar em espiral
        {
          float a2 = -uTime * uSwirl * 0.35 + ( 1.0 - r ) * 0.6 * sin( uTime * 0.25 );
          vec2 q = mat2( cos( a2 ), -sin( a2 ), sin( a2 ), cos( a2 ) ) * c;
          vec3 real = texture2D( tCrema, q * 0.45 + 0.5 ).rgb;
          // antes da espuma formar, o café é escuro: a foto entra com a espuma
          vec3 darkReal = real * vec3( 0.32, 0.26, 0.22 );
          col = mix( col, mix( darkReal, real, uFoam ), uPhoto * 0.9 );
        }

        // menisco: anel mais claro encostado na parede da xícara
        col = mix( col, uHighlight, smoothstep( 0.82, 1.0, r ) * 0.35 * uFoam );
        // sombra interna junto à borda, para a superfície ter profundidade
        col *= 1.0 - smoothstep( 0.9, 1.0, r ) * 0.45;

        // reflexo da luz ambiente no líquido
        float gloss = pow( max( 0.0, 1.0 - length( c - vec2( -0.3, 0.34 ) ) * 1.5 ), 3.0 );
        col += vec3( 1.0, 0.86, 0.66 ) * gloss * 0.18;

        gl_FragColor = vec4( col, edge * uOpacity );
        #include <colorspace_fragment>
      }
    `,
  });

  (material as THREE.ShaderMaterial & { uniformsRef: CremaUniforms }).uniformsRef =
    uniforms;
  return material as THREE.ShaderMaterial & { uniformsRef: CremaUniforms };
}
