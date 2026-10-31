import * as THREE from "three";

/**
 * Geometria única que carrega DOIS estados na mesma malha:
 *   aCherry  → o fruto (cereja) na planta
 *   aBean    → a semente/grão, com a fenda central característica
 *
 * O shader interpola entre os dois (uMorph). É isso que permite que
 * o MESMO objeto atravesse a narrativa inteira sem corte: fruto → semente
 * → grão cru → grão torrado, respeitando a sequência real de produção.
 */

type Vec = { x: number; y: number; z: number };

/** Ruído suave e determinístico, só para quebrar a perfeição da esfera. */
function organicNoise(x: number, y: number, z: number) {
  return (
    Math.sin(x * 5.3 + y * 2.1) * 0.5 +
    Math.sin(y * 6.7 - z * 3.4) * 0.3 +
    Math.sin(z * 4.9 + x * 3.8) * 0.2
  );
}

function cherryShape(d: Vec, out: Vec) {
  // Fruto levemente oblongo, mais largo na base
  const belly = 1 + 0.07 * (1 - d.y) * (1 - d.y);
  out.x = d.x * 0.93 * belly;
  out.y = d.y * 1.02;
  out.z = d.z * 0.93 * belly;

  // Depressão no topo, onde o pedúnculo se prende
  const top = Math.max(0, (d.y - 0.78) / 0.22);
  out.y -= top * top * 0.2;
  const radialPull = top * top * 0.12;
  out.x *= 1 - radialPull;
  out.z *= 1 - radialPull;

  // Pequena coroa (resto da flor) na base
  const bot = Math.max(0, (-d.y - 0.9) / 0.1);
  out.y -= bot * bot * 0.045;

  // Textura orgânica mínima
  const n = organicNoise(d.x, d.y, d.z) * 0.012;
  out.x += d.x * n;
  out.y += d.y * n;
  out.z += d.z * n;
}

function beanShape(d: Vec, out: Vec) {
  // Eixo longo em X, face chata (com a fenda) voltada para +Z
  out.x = d.x * 1.14;
  out.y = d.y * 0.84;
  out.z = d.z * (d.z > 0 ? 0.42 : 0.6);

  // Pontas levemente afinadas
  const taper = 1 - 0.1 * d.x * d.x;
  out.y *= taper;
  out.z *= taper;

  // A fenda central: sulco em S ao longo de X, apenas na face chata
  const wave = Math.sin(d.x * 2.1) * 0.08;
  const dy = d.y - wave;
  const groove =
    Math.exp(-(dy * dy) / 0.03) * 0.5 * (1 - 0.42 * d.x * d.x);
  if (d.z > 0) out.z -= groove * Math.min(1, d.z * 1.6);

  const n = organicNoise(d.x * 1.4, d.y * 1.4, d.z * 1.4) * 0.01;
  out.x += d.x * n;
  out.y += d.y * n;
  out.z += d.z * n;
}

/** Profundidade do sulco por vértice (0..1) — usada para pintar a película prateada. */
function grooveMask(d: Vec) {
  if (d.z <= 0) return 0;
  const wave = Math.sin(d.x * 2.1) * 0.08;
  const dy = d.y - wave;
  return (
    Math.exp(-(dy * dy) / 0.03) *
    (1 - 0.42 * d.x * d.x) *
    Math.min(1, d.z * 1.6)
  );
}

function normalsFor(
  index: THREE.BufferAttribute | null,
  positions: Float32Array,
) {
  const g = new THREE.BufferGeometry();
  g.setAttribute("position", new THREE.BufferAttribute(positions, 3));
  if (index) g.setIndex(index);
  g.computeVertexNormals();
  const n = (g.getAttribute("normal") as THREE.BufferAttribute)
    .array as Float32Array;
  const copy = new Float32Array(n);
  g.dispose();
  return copy;
}

export type MorphGeometry = THREE.BufferGeometry;

const cache = new Map<string, MorphGeometry>();

export function buildMorphGeometry(
  segments: [number, number] = [96, 64],
): MorphGeometry {
  const key = segments.join("x");
  const cached = cache.get(key);
  if (cached) return cached;

  const base = new THREE.SphereGeometry(1, segments[0], segments[1]);
  const pos = base.getAttribute("position") as THREE.BufferAttribute;
  const count = pos.count;

  const cherry = new Float32Array(count * 3);
  const bean = new Float32Array(count * 3);
  const groove = new Float32Array(count);

  const d: Vec = { x: 0, y: 0, z: 0 };
  const out: Vec = { x: 0, y: 0, z: 0 };

  for (let i = 0; i < count; i++) {
    d.x = pos.getX(i);
    d.y = pos.getY(i);
    d.z = pos.getZ(i);

    cherryShape(d, out);
    cherry[i * 3] = out.x;
    cherry[i * 3 + 1] = out.y;
    cherry[i * 3 + 2] = out.z;

    beanShape(d, out);
    bean[i * 3] = out.x;
    bean[i * 3 + 1] = out.y;
    bean[i * 3 + 2] = out.z;

    groove[i] = grooveMask(d);
  }

  const index = base.getIndex();
  const cherryN = normalsFor(index, cherry);
  const beanN = normalsFor(index, bean);

  const geo = new THREE.BufferGeometry();
  if (index) geo.setIndex(index);
  // position precisa existir para o three calcular bounding/raycast
  geo.setAttribute("position", new THREE.BufferAttribute(cherry.slice(), 3));
  geo.setAttribute("normal", new THREE.BufferAttribute(cherryN.slice(), 3));
  geo.setAttribute("uv", base.getAttribute("uv"));
  geo.setAttribute("aCherry", new THREE.BufferAttribute(cherry, 3));
  geo.setAttribute("aBean", new THREE.BufferAttribute(bean, 3));
  geo.setAttribute("aCherryN", new THREE.BufferAttribute(cherryN, 3));
  geo.setAttribute("aBeanN", new THREE.BufferAttribute(beanN, 3));
  geo.setAttribute("aGroove", new THREE.BufferAttribute(groove, 1));
  // direção original na esfera: é por ela que a foto do fruto/grão é projetada
  geo.setAttribute("aDir", new THREE.BufferAttribute((pos.array as Float32Array).slice(), 3));

  geo.boundingSphere = new THREE.Sphere(new THREE.Vector3(), 1.35);
  geo.boundingBox = new THREE.Box3(
    new THREE.Vector3(-1.2, -1.2, -1.2),
    new THREE.Vector3(1.2, 1.2, 1.2),
  );

  base.dispose();
  cache.set(key, geo);
  return geo;
}

/** Xícara em torno (lathe) — porcelana de parede fina, perfil sóbrio. */
export function buildCupGeometry(segments = 64) {
  const pts: THREE.Vector2[] = [];
  const outer: [number, number][] = [
    [0.0, 0.0],
    [0.3, 0.0],
    [0.44, 0.02],
    [0.54, 0.1],
    [0.62, 0.26],
    [0.68, 0.46],
    [0.72, 0.66],
    [0.745, 0.8],
  ];
  const inner: [number, number][] = [
    [0.715, 0.8],
    [0.69, 0.66],
    [0.645, 0.46],
    [0.58, 0.26],
    [0.48, 0.11],
    [0.36, 0.05],
    [0.0, 0.045],
  ];
  for (const [r, y] of outer) pts.push(new THREE.Vector2(r, y));
  for (const [r, y] of inner) pts.push(new THREE.Vector2(r, y));
  const geo = new THREE.LatheGeometry(pts, segments);
  geo.computeVertexNormals();
  return geo;
}

/** Pires simples que acompanha a xícara. */
export function buildSaucerGeometry(segments = 64) {
  const pts: THREE.Vector2[] = [];
  const profile: [number, number][] = [
    [0.0, 0.0],
    [0.9, 0.0],
    [1.12, 0.07],
    [1.14, 0.1],
    [1.1, 0.085],
    [0.88, 0.028],
    [0.0, 0.026],
  ];
  for (const [r, y] of profile) pts.push(new THREE.Vector2(r, y));
  const geo = new THREE.LatheGeometry(pts, segments);
  geo.computeVertexNormals();
  return geo;
}

/** Folha de cafeeiro: contorno lanceolado com nervura, levemente curvada. */
export function buildLeafGeometry() {
  const shape = new THREE.Shape();
  shape.moveTo(0, 0);
  shape.bezierCurveTo(0.34, 0.3, 0.42, 0.95, 0, 1.6);
  shape.bezierCurveTo(-0.42, 0.95, -0.34, 0.3, 0, 0);
  const geo = new THREE.ShapeGeometry(shape, 28);
  const pos = geo.getAttribute("position") as THREE.BufferAttribute;
  for (let i = 0; i < pos.count; i++) {
    const x = pos.getX(i);
    const y = pos.getY(i);
    // calha central + leve torção, para a folha não parecer um recorte plano
    const z = -x * x * 0.55 + Math.sin(y * 1.6) * 0.07;
    pos.setZ(i, z);
  }
  pos.needsUpdate = true;
  // uv cobre a folha inteira: nervura no centro (u = 0.5), base embaixo
  const uv = geo.getAttribute("uv") as THREE.BufferAttribute;
  for (let i = 0; i < uv.count; i++) {
    uv.setXY(i, 0.5 + pos.getX(i) / 0.7, pos.getY(i) / 1.6);
  }
  uv.needsUpdate = true;
  geo.computeVertexNormals();
  geo.translate(0, -0.1, 0);
  return geo;
}
