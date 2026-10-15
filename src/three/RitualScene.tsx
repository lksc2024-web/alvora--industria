"use client";

import { useFrame, useThree } from "@react-three/fiber";
import { useEffect, useMemo, useRef } from "react";
import * as THREE from "three";

import type { ProgressRef } from "@/lib/hooks";
import {
  createBackdropMaterial,
  createCremaMaterial,
  createParticleGeometry,
  createParticleMaterial,
} from "./shaders";
import { useStudioEnv } from "./useStudioEnv";
import { clamp01, damp, fitFactor, lerp, smoothstep } from "./util";

const ENV_BANDS = [
  { x: 0.3, y: 0.24, w: 0.4, h: 0.44, color: "#ffd9a8", intensity: 1.2 },
  { x: 0.74, y: 0.56, w: 0.3, h: 0.4, color: "#8a4a18", intensity: 0.7 },
];
const ENV_BASE: [string, string, string] = ["#22150c", "#0d0806", "#040302"];

type Props = {
  progress: ProgressRef;
  particles: number;
  reduced: boolean;
};

/**
 * Momento 02 — Ritual do preparo.
 * Macro da superfície do espresso: a crema se forma em espiral, carrega os
 * óleos e estabiliza. A rolagem é o cronômetro da extração.
 */
export function RitualScene({ progress, particles, reduced }: Props) {
  const camera = useThree((s) => s.camera) as THREE.PerspectiveCamera;
  const size = useThree((s) => s.size);
  useStudioEnv(ENV_BANDS, ENV_BASE);

  const cremaMat = useMemo(() => createCremaMaterial(), []);
  const backdrop = useMemo(
    () => createBackdropMaterial("#1d1209", "#050302"),
    [],
  );
  const pGeo = useMemo(() => createParticleGeometry(particles), [particles]);
  const pMat = useMemo(() => createParticleMaterial(), []);

  const rig = useRef<THREE.Group>(null);
  const rim = useRef<THREE.Mesh>(null);
  const smoothed = useRef(0);

  useEffect(() => {
    const u = pMat.uniformsRef;
    u.uPixelRatio.value = Math.min(window.devicePixelRatio || 1, 1.75);
    u.uColorA.value.set("#fff3e2");
    u.uColorB.value.set("#c4a07a");
    u.uSize.value = 44;
    u.uSpread.value.set(2.6, 3.2, 2.0);
    u.uSpeed.value = 0.1;
    u.uSwirl.value = 0.16;
    u.uTurb.value = 0.42;
    u.uCenter.value.set(0, 1.5, 0.4);
    u.uOpacity.value = 0;

    const c = cremaMat.uniformsRef;
    c.uDark.value.set("#1a0b03");
    c.uCrema.value.set("#c08949");
    c.uHighlight.value.set("#f0d0a2");
  }, [pMat, cremaMat]);

  useEffect(
    () => () => {
      [cremaMat, backdrop, pMat].forEach((m) => m.dispose());
      pGeo.dispose();
    },
    [cremaMat, backdrop, pMat, pGeo],
  );

  useFrame((_, delta) => {
    const dt = Math.min(delta, 0.05);
    const raw = clamp01(progress.current);
    smoothed.current = reduced ? raw : damp(smoothed.current, raw, 6, dt);
    const p = smoothed.current;
    const time = reduced ? p * 8 : performance.now() / 1000;

    // a extração: primeiras gotas → corpo → crema estabilizada
    const c = cremaMat.uniformsRef;
    c.uTime.value = time;
    c.uFill.value = lerp(0.3, 0.99, smoothstep(0.0, 0.55, p));
    c.uFoam.value = smoothstep(0.1, 0.78, p);
    c.uSwirl.value = lerp(1.6, 0.14, smoothstep(0.2, 1, p));
    c.uOpacity.value = 1;

    // a câmera desce sobre a xícara e depois se afasta um pouco
    const dive = smoothstep(0, 0.6, p);
    const fit = fitFactor(size.width, size.height);
    camera.position.set(
      Math.sin(p * 2.2) * 0.22 * fit,
      (lerp(2.6, 1.15, dive) + smoothstep(0.75, 1, p) * 0.35) * fit,
      (lerp(2.2, 0.95, dive) + smoothstep(0.75, 1, p) * 0.5) * fit,
    );
    camera.lookAt(0, 0, 0);
    const fov = lerp(40, 30, smoothstep(0.3, 1, p));
    if (Math.abs(camera.fov - fov) > 0.01) {
      camera.fov = fov;
      camera.updateProjectionMatrix();
    }

    if (rig.current) {
      rig.current.rotation.z = time * 0.02 + p * 0.3;
      rig.current.rotation.x = -Math.PI / 2;
    }
    if (rim.current) {
      const m = rim.current.material as THREE.MeshStandardMaterial;
      m.opacity = 1;
    }

    const u = pMat.uniformsRef;
    u.uTime.value = time;
    u.uOpacity.value = smoothstep(0.18, 0.6, p) * 0.45 * (1 - smoothstep(0.9, 1, p) * 0.3);

    backdrop.uniforms.uTime.value = time;
    backdrop.uniforms.uGlow.value = 0.35 + p * 0.3;
  });

  return (
    <>
      <ambientLight intensity={0.34} color="#ffd9b0" />
      <directionalLight position={[2.2, 3.6, 2.0]} intensity={3.2} color="#ffe2c0" />
      <directionalLight position={[-2.6, 1.4, -1.6]} intensity={1.2} color="#a6602a" />

      <mesh scale={36} renderOrder={-10}>
        <sphereGeometry args={[1, 32, 24]} />
        <primitive object={backdrop} attach="material" />
      </mesh>

      {/* superfície do espresso — ocupa quase todo o enquadramento */}
      <group ref={rig} rotation={[-Math.PI / 2, 0, 0]}>
        <mesh>
          <circleGeometry args={[1.0, 96]} />
          <primitive object={cremaMat} attach="material" />
        </mesh>
      </group>

      {/* borda da xícara, logo acima da bebida */}
      <mesh ref={rim} position={[0, 0.03, 0]} rotation={[Math.PI / 2, 0, 0]}>
        <torusGeometry args={[1.035, 0.055, 16, 96]} />
        <meshPhysicalMaterial
          color="#f0e7da"
          roughness={0.2}
          metalness={0.02}
          clearcoat={0.95}
          clearcoatRoughness={0.1}
          transparent
        />
      </mesh>
      {/* parede interna, para a bebida não parecer colada no vazio */}
      <mesh position={[0, -0.42, 0]}>
        <cylinderGeometry args={[1.03, 0.78, 0.9, 72, 1, true]} />
        <meshPhysicalMaterial
          color="#e9ded0"
          roughness={0.3}
          metalness={0.02}
          side={THREE.BackSide}
        />
      </mesh>

      <points geometry={pGeo} material={pMat} frustumCulled={false} />
    </>
  );
}
