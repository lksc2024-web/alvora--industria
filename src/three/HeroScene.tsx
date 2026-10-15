"use client";

import { useFrame, useThree } from "@react-three/fiber";
import { useEffect, useMemo, useRef } from "react";
import * as THREE from "three";

import { buildLeafGeometry, buildMorphGeometry } from "./coffeeGeometry";
import {
  applyCoffeeState,
  coffeeStateAt,
  createMorphMaterial,
  emptyState,
} from "./morphMaterial";
import {
  createBackdropMaterial,
  createParticleGeometry,
  createParticleMaterial,
} from "./shaders";
import { useStudioEnv } from "./useStudioEnv";
import { damp, fitFactor, makeRandom, smoothstep } from "./util";

const ENV_BANDS = [
  { x: 0.2, y: 0.18, w: 0.46, h: 0.5, color: "#ffdcb0", intensity: 1.35 },
  { x: 0.78, y: 0.4, w: 0.3, h: 0.44, color: "#b4551a", intensity: 0.8 },
  { x: 0.5, y: 0.86, w: 0.9, h: 0.26, color: "#1a2a18", intensity: 0.5 },
];
const ENV_BASE: [string, string, string] = ["#241a12", "#0e0a07", "#050302"];

type Props = {
  /** 0..1 da rolagem do próprio hero, para o parallax de saída */
  progress: { current: number };
  pointer: { current: { x: number; y: number } };
  reduced: boolean;
  particles: number;
};

export function HeroScene({ progress, pointer, reduced, particles }: Props) {
  const camera = useThree((s) => s.camera) as THREE.PerspectiveCamera;
  const size = useThree((s) => s.size);
  useStudioEnv(ENV_BANDS, ENV_BASE);

  const geo = useMemo(() => buildMorphGeometry([120, 84]), []);
  const leafGeo = useMemo(() => buildLeafGeometry(), []);
  const mat = useMemo(() => createMorphMaterial(), []);
  const backdrop = useMemo(
    () => createBackdropMaterial("#1b2a1a", "#060403"),
    [],
  );
  const pGeo = useMemo(() => createParticleGeometry(particles), [particles]);
  const pMat = useMemo(() => createParticleMaterial(), []);

  const fruit = useRef<THREE.Mesh>(null);
  const rig = useRef<THREE.Group>(null);
  const leaves = useRef<THREE.Group>(null);
  const intro = useRef(0);
  const px = useRef(0);
  const py = useRef(0);
  const state = useMemo(() => emptyState(), []);

  const leafList = useMemo(() => {
    const rnd = makeRandom(991);
    return Array.from({ length: 7 }, (_, i) => ({
      pos: [
        (rnd() - 0.5) * 5.4,
        (rnd() - 0.5) * 3.4,
        -2.0 - rnd() * 3.4,
      ] as [number, number, number],
      rot: [rnd() * 0.8 - 0.4, rnd() * 6.28, rnd() * 6.28] as [
        number,
        number,
        number,
      ],
      scale: 0.55 + rnd() * 0.65,
      phase: i * 1.3,
    }));
  }, []);

  useEffect(() => {
    coffeeStateAt(0.02, state);
    applyCoffeeState(mat, state);
    const u = pMat.uniformsRef;
    u.uPixelRatio.value = Math.min(window.devicePixelRatio || 1, 1.75);
    u.uColorA.value.set("#ffd9a0");
    u.uColorB.value.set("#7c9a4e");
    u.uOpacity.value = 0.34;
    u.uSize.value = 17;
    u.uSpread.value.set(11, 7, 6);
    u.uSpeed.value = 0.035;
    u.uSwirl.value = 0.045;
    u.uTurb.value = 0.7;
    u.uCenter.value.set(0, 0, -1.2);
    backdrop.uniforms.uGlow.value = 0.85;
    (backdrop.uniforms.uGlowColor.value as THREE.Color).set("#ffbe72");
  }, [mat, pMat, backdrop, state]);

  useEffect(
    () => () => {
      [mat, backdrop, pMat].forEach((m) => m.dispose());
      [pGeo, leafGeo].forEach((g) => g.dispose());
    },
    [mat, backdrop, pMat, pGeo, leafGeo],
  );

  useFrame((_, delta) => {
    const dt = Math.min(delta, 0.05);
    const time = reduced ? 0 : performance.now() / 1000;
    const p = progress.current;

    // entrada: o fruto emerge do escuro em vez de simplesmente aparecer
    intro.current = reduced ? 1 : damp(intro.current, 1, 1.5, dt);
    const i = smoothstep(0, 1, intro.current);

    if (!reduced) {
      px.current = damp(px.current, pointer.current.x, 3.2, dt);
      py.current = damp(py.current, pointer.current.y, 3.2, dt);
    }

    if (rig.current) {
      // parallax de ponteiro + deriva lenta de câmera
      rig.current.rotation.y = px.current * 0.2 + Math.sin(time * 0.17) * 0.05;
      rig.current.rotation.x = py.current * 0.12 + Math.cos(time * 0.21) * 0.03;
      rig.current.position.y = -p * 1.4;
    }

    if (fruit.current) {
      fruit.current.rotation.y = time * 0.14 + px.current * 0.1;
      fruit.current.rotation.z = Math.sin(time * 0.3) * 0.06 - 0.12;
      fruit.current.rotation.x = Math.sin(time * 0.24) * 0.05;
      const s = (1.12 + Math.sin(time * 0.6) * 0.012) * (0.6 + i * 0.4);
      fruit.current.scale.setScalar(s);
      fruit.current.position.y = Math.sin(time * 0.5) * 0.035 + (1 - i) * -0.4;
    }

    if (leaves.current) {
      leaves.current.children.forEach((c, k) => {
        c.rotation.z = leafList[k].rot[2] + Math.sin(time * 0.6 + leafList[k].phase) * 0.1;
      });
      leaves.current.position.z = -p * 2;
    }

    mat.uniformsRef.uTime.value = time;
    pMat.uniformsRef.uTime.value = time;
    pMat.uniformsRef.uOpacity.value = 0.34 * i * (1 - p * 0.8);

    camera.position.z = (4.2 + p * 1.6) * fitFactor(size.width, size.height);
    camera.lookAt(0, 0, 0);
  });

  return (
    <>
      <ambientLight intensity={0.32} />
      <directionalLight position={[3.4, 3.0, 2.6]} intensity={3.4} color="#ffdeb4" />
      <directionalLight position={[-3.6, 0.8, -2.4]} intensity={1.8} color="#5f9a52" />
      <pointLight position={[-1.4, -1.2, 2.2]} intensity={2.2} color="#c8641e" distance={10} decay={2} />

      <mesh scale={44} renderOrder={-10}>
        <sphereGeometry args={[1, 32, 24]} />
        <primitive object={backdrop} attach="material" />
      </mesh>

      <group ref={rig}>
        <group ref={leaves}>
          {leafList.map((l, i) => (
            <mesh key={i} geometry={leafGeo} position={l.pos} rotation={l.rot} scale={l.scale}>
              <meshStandardMaterial
                color={i % 2 === 0 ? "#3d7342" : "#285432"}
                roughness={0.5}
                envMapIntensity={1.4}
                side={THREE.DoubleSide}
              />
            </mesh>
          ))}
        </group>
        <mesh ref={fruit} geometry={geo} material={mat} />
        <points geometry={pGeo} material={pMat} frustumCulled={false} />
      </group>
    </>
  );
}
