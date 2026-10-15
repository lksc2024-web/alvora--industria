"use client";

import { useFrame, useThree } from "@react-three/fiber";
import { useEffect, useMemo, useRef } from "react";
import * as THREE from "three";

import type { ProgressRef } from "@/lib/hooks";
import { buildMorphGeometry } from "./coffeeGeometry";
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
import { clamp01, damp, fitFactor, lerp, makeRandom, smoothstep } from "./util";

const ENV_BANDS = [
  { x: 0.3, y: 0.3, w: 0.4, h: 0.5, color: "#ff9d3c", intensity: 1.4 },
  { x: 0.8, y: 0.5, w: 0.3, h: 0.5, color: "#ff4e05", intensity: 1.0 },
];
const ENV_BASE: [string, string, string] = ["#331405", "#140803", "#050201"];

type Props = {
  progress: ProgressRef;
  count: number;
  particles: number;
  reduced: boolean;
};

/**
 * Momento 01 — Torrefação imersiva.
 * A rolagem controla a aproximação da câmera, a rotação do tambor e o
 * próprio ponto de torra dos grãos (claro → cobre → castanho profundo).
 */
export function RoastScene({ progress, count, particles, reduced }: Props) {
  const camera = useThree((s) => s.camera) as THREE.PerspectiveCamera;
  const size = useThree((s) => s.size);
  useStudioEnv(ENV_BANDS, ENV_BASE);

  const geo = useMemo(
    () => buildMorphGeometry(count > 260 ? [72, 48] : [48, 32]),
    [count],
  );
  const mat = useMemo(() => createMorphMaterial(), []);
  const backdrop = useMemo(
    () => createBackdropMaterial("#3a1606", "#060302"),
    [],
  );
  const pGeo = useMemo(() => createParticleGeometry(particles), [particles]);
  const pMat = useMemo(() => createParticleMaterial(), []);

  const seeds = useMemo(() => {
    const rnd = makeRandom(4242);
    const a = new Float32Array(count * 4);
    for (let i = 0; i < a.length; i++) a[i] = rnd();
    return a;
  }, [count]);

  const beans = useRef<THREE.InstancedMesh>(null);
  const drum = useRef<THREE.Group>(null);
  const ember = useRef<THREE.PointLight>(null);
  const key = useRef<THREE.SpotLight>(null);
  const smoothed = useRef(0);
  const state = useMemo(() => emptyState(), []);
  const dummy = useMemo(() => new THREE.Object3D(), []);

  useEffect(() => {
    const u = pMat.uniformsRef;
    u.uPixelRatio.value = Math.min(window.devicePixelRatio || 1, 1.75);
    u.uColorA.value.set("#ffb14a");
    u.uColorB.value.set("#ff4205");
    u.uSize.value = 10;
    u.uSpread.value.set(7, 7.5, 5.5);
    u.uSpeed.value = 0.3;
    u.uSwirl.value = 0.5;
    u.uTurb.value = 0.5;
  }, [pMat]);

  useEffect(
    () => () => {
      [mat, backdrop, pMat].forEach((m) => m.dispose());
      pGeo.dispose();
    },
    [mat, backdrop, pMat, pGeo],
  );

  useFrame((_, delta) => {
    const dt = Math.min(delta, 0.05);
    const raw = clamp01(progress.current);
    smoothed.current = reduced ? raw : damp(smoothed.current, raw, 6.5, dt);
    const p = smoothed.current;
    const time = reduced ? 0 : performance.now() / 1000;

    // 0 → 1 do perfil de torra: secagem, primeiro crack, desenvolvimento, descarga
    const roast = lerp(0.46, 0.98, p);
    coffeeStateAt(roast, state);
    applyCoffeeState(mat, state);
    mat.uniformsRef.uTime.value = time;

    // o calor sobe até o crack e cai na descarga
    const heat = Math.sin(smoothstep(0, 0.85, p) * Math.PI) * 0.9 + 0.1;
    mat.uniformsRef.uEmber.value = state.ember * (0.4 + heat);

    const fit = fitFactor(size.width, size.height);
    camera.position.set(
      Math.sin(p * 0.9) * 0.9 * fit,
      lerp(1.1, 0.05, smoothstep(0, 0.6, p)) * fit,
      lerp(6.4, 2.5, smoothstep(0, 0.9, p)) * fit,
    );
    camera.lookAt(0, lerp(0.1, -0.05, p), 0);
    const fov = lerp(36, 52, smoothstep(0.2, 1, p));
    if (Math.abs(camera.fov - fov) > 0.01) {
      camera.fov = fov;
      camera.updateProjectionMatrix();
    }

    const bu = backdrop.uniforms;
    bu.uGlow.value = 0.5 + heat * 0.9;
    bu.uTime.value = time;
    (bu.uTop.value as THREE.Color).setRGB(
      lerp(0.14, 0.3, heat),
      lerp(0.05, 0.08, heat),
      0.02,
    );

    if (drum.current) {
      drum.current.rotation.z = time * (0.35 + p * 0.5);
    }
    if (ember.current) {
      ember.current.intensity = 6 + heat * 14;
      ember.current.position.set(
        Math.sin(time * 1.6) * 0.5,
        -0.5 + Math.cos(time * 1.9) * 0.2,
        0.6,
      );
    }
    if (key.current) {
      key.current.intensity = 14 + heat * 10;
    }

    const mesh = beans.current;
    if (mesh) {
      for (let i = 0; i < count; i++) {
        const s0 = seeds[i * 4];
        const s1 = seeds[i * 4 + 1];
        const s2 = seeds[i * 4 + 2];
        const s3 = seeds[i * 4 + 3];
        // massa que gira e desaba: a pá levanta, a gravidade devolve
        const spin = time * (0.55 + p * 0.75) + s0 * 6.2831;
        const rad = 0.3 + s1 * 1.28;
        const sag = Math.max(0, Math.sin(spin)) * 0.22;
        dummy.position.set(
          Math.cos(spin) * rad * 1.42,
          Math.sin(spin) * rad * 1.02 - 0.1 - sag,
          (s2 - 0.5) * 2.3,
        );
        dummy.rotation.set(spin * 1.5 + s3 * 6.28, spin * 0.9, s2 * 6.28);
        dummy.scale.setScalar((0.11 + s2 * 0.05) * state.scale);
        dummy.updateMatrix();
        mesh.setMatrixAt(i, dummy.matrix);
      }
      mesh.instanceMatrix.needsUpdate = true;
    }

    const u = pMat.uniformsRef;
    u.uTime.value = time;
    u.uOpacity.value = 0.25 + heat * 0.75;
    u.uSpeed.value = 0.22 + heat * 0.2;
  });

  return (
    <>
      <ambientLight intensity={0.22} color="#ff9e55" />
      <spotLight
        ref={key}
        position={[3.2, 4.4, 4.2]}
        angle={0.7}
        penumbra={0.9}
        intensity={16}
        color="#ffa047"
        distance={22}
        decay={2}
      />
      <directionalLight position={[-3.4, -0.6, -3.2]} intensity={1.6} color="#ff4d08" />
      <pointLight ref={ember} color="#ff5500" intensity={10} distance={10} decay={2} />

      <mesh scale={40} renderOrder={-10}>
        <sphereGeometry args={[1, 32, 24]} />
        <primitive object={backdrop} attach="material" />
      </mesh>

      <group ref={drum} scale={2.3}>
        <mesh rotation={[Math.PI / 2, 0, 0]}>
          <cylinderGeometry args={[1, 1, 1.7, 56, 1, true]} />
          <meshStandardMaterial
            color="#2a211c"
            metalness={0.96}
            roughness={0.38}
            side={THREE.BackSide}
          />
        </mesh>
        {[0.85, -0.85].map((z) => (
          <mesh key={z} position={[0, 0, z]}>
            <torusGeometry args={[1.0, 0.04, 12, 72]} />
            <meshStandardMaterial color="#8a6336" metalness={1} roughness={0.26} />
          </mesh>
        ))}
        {/* pás internas */}
        {[0, 1, 2, 3].map((i) => (
          <mesh key={i} rotation={[0, 0, (i * Math.PI) / 2]}>
            <boxGeometry args={[1.94, 0.022, 1.6]} />
            <meshStandardMaterial color="#3c2f26" metalness={0.92} roughness={0.46} />
          </mesh>
        ))}
        {/* aro externo com rebites */}
        {Array.from({ length: 22 }, (_, i) => {
          const a = (i / 22) * Math.PI * 2;
          return (
            <mesh key={`r${i}`} position={[Math.cos(a) * 1.0, Math.sin(a) * 1.0, 0.85]}>
              <sphereGeometry args={[0.028, 8, 6]} />
              <meshStandardMaterial color="#c08b50" metalness={1} roughness={0.22} />
            </mesh>
          );
        })}
      </group>

      <instancedMesh ref={beans} args={[geo, mat, count]} frustumCulled={false} />
      <points geometry={pGeo} material={pMat} frustumCulled={false} />
    </>
  );
}
