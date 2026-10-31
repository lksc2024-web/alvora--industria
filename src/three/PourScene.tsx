"use client";

import { useFrame, useThree } from "@react-three/fiber";
import { useEffect, useMemo, useRef } from "react";
import * as THREE from "three";

import type { ProgressRef } from "@/lib/hooks";
import { buildCupGeometry, buildSaucerGeometry } from "./coffeeGeometry";
import {
  createBackdropMaterial,
  createCremaMaterial,
  createParticleGeometry,
  createParticleMaterial,
  createStreamMaterial,
} from "./shaders";
import { applyBackdropPhoto, BG } from "./photoTextures";
import { useStudioEnv } from "./useStudioEnv";
import { clamp01, damp, fitFactor, lerp, smoothstep } from "./util";

const ENV_BANDS = [
  { x: 0.22, y: 0.22, w: 0.44, h: 0.46, color: "#ffe0b8", intensity: 1.3 },
  { x: 0.76, y: 0.46, w: 0.28, h: 0.4, color: "#a85d22", intensity: 0.8 },
  { x: 0.5, y: 0.88, w: 0.9, h: 0.24, color: "#241a12", intensity: 0.5 },
];
const ENV_BASE: [string, string, string] = ["#2a1b11", "#120b07", "#050302"];

type Props = {
  progress: ProgressRef;
  particles: number;
  reduced: boolean;
};

/**
 * Ato III — o café sendo servido.
 * Nada de simulação de fluidos: o fio é um cilindro com silhueta animada em
 * shader e a bebida é uma superfície com ruído em espiral. Custo baixo,
 * leitura de viscosidade e brilho alta.
 */
export function PourScene({ progress, particles, reduced }: Props) {
  const camera = useThree((s) => s.camera) as THREE.PerspectiveCamera;
  const size = useThree((s) => s.size);
  const gl = useThree((s) => s.gl);
  useStudioEnv(ENV_BANDS, ENV_BASE);

  const cupGeo = useMemo(() => buildCupGeometry(84), []);
  const saucerGeo = useMemo(() => buildSaucerGeometry(84), []);
  const streamMat = useMemo(() => createStreamMaterial(), []);
  const cremaMat = useMemo(() => createCremaMaterial(), []);
  const backdrop = useMemo(
    () => createBackdropMaterial("#231509", "#060403"),
    [],
  );
  const pGeo = useMemo(() => createParticleGeometry(particles), [particles]);
  const pMat = useMemo(() => createParticleMaterial(), []);

  const stream = useRef<THREE.Mesh>(null);
  const cup = useRef<THREE.Group>(null);
  const splash = useRef<THREE.Points>(null);
  const smoothed = useRef(0);

  useEffect(() => {
    const u = pMat.uniformsRef;
    u.uPixelRatio.value = Math.min(window.devicePixelRatio || 1, 1.75);
    u.uColorA.value.set("#fff0dc");
    u.uColorB.value.set("#b7956f");
    u.uSize.value = 34;
    u.uSpread.value.set(1.3, 2.2, 1.3);
    u.uSpeed.value = 0.13;
    u.uSwirl.value = 0.2;
    u.uTurb.value = 0.3;
    u.uCenter.value.set(0, 1.3, 0);
    u.uOpacity.value = 0;
  }, [pMat]);

  useEffect(
    () => () => {
      [streamMat, cremaMat, backdrop, pMat].forEach((m) => m.dispose());
      [cupGeo, saucerGeo, pGeo].forEach((g) => g.dispose());
    },
    [streamMat, cremaMat, backdrop, pMat, cupGeo, saucerGeo, pGeo],
  );

  useFrame((_, delta) => {
    const dt = Math.min(delta, 0.05);
    const raw = clamp01(progress.current);
    smoothed.current = reduced ? raw : damp(smoothed.current, raw, 7, dt);
    const p = smoothed.current;
    const time = reduced ? p * 8 : performance.now() / 1000;

    // 0.00–0.18 aproximação · 0.18–0.62 o fio cai · 0.55–1.00 a crema fecha
    const approach = smoothstep(0, 0.2, p);
    const pouring = smoothstep(0.16, 0.62, p);
    const settle = smoothstep(0.55, 1.0, p);

    // A câmera precisa olhar PARA DENTRO da xícara: num ângulo raso a borda
    // esconde a bebida e o objeto lê como um pote vazio. ~30° resolve, e o
    // fator de enquadramento multiplica a distância sem alterar o ângulo.
    const fit = fitFactor(size.width, size.height);
    const look = lerp(0.62, 0.32, approach);
    const camY = lerp(3.3, 2.08, approach) - settle * 0.12;
    const camZ = lerp(5.4, 3.05, approach) + settle * 0.3;
    camera.position.set(
      Math.sin(p * 1.4) * 0.3 * fit,
      look + (camY - look) * fit,
      camZ * fit,
    );
    camera.lookAt(0, look, 0);

    const su = streamMat.uniformsRef;
    su.uTime.value = time;
    su.uProgress.value = pouring;
    // o fio afina e some quando o bule se afasta
    su.uWobble.value = 0.7 + Math.sin(time * 2.1) * 0.25;
    su.uOpacity.value = smoothstep(0.1, 0.2, p) * (1 - smoothstep(0.66, 0.82, p));
    if (stream.current) stream.current.visible = su.uOpacity.value > 0.01;

    const cu = cremaMat.uniformsRef;
    cu.uTime.value = time;
    cu.uFill.value = smoothstep(0.2, 0.7, p) * 0.97;
    cu.uFoam.value = smoothstep(0.42, 0.9, p);
    cu.uSwirl.value = 0.9 - settle * 0.62;
    cu.uOpacity.value = smoothstep(0.18, 0.3, p);

    if (cup.current) {
      cup.current.rotation.y = -0.35 + p * 0.5;
      cup.current.position.y = -0.52 + (1 - approach) * 0.1;
    }

    const u = pMat.uniformsRef;
    u.uTime.value = time;
    // vapor só depois que há líquido quente na xícara
    u.uOpacity.value = smoothstep(0.42, 0.95, p) * 0.5;
    u.uSize.value = lerp(26, 40, settle);

    backdrop.uniforms.uTime.value = time;
    applyBackdropPhoto(backdrop, BG.xicara, BG.servida, settle, gl);
    backdrop.uniforms.uGlow.value = 0.45 + settle * 0.35;

    if (splash.current) splash.current.visible = u.uOpacity.value > 0.01;
  });

  return (
    <>
      <ambientLight intensity={0.3} color="#ffd9b0" />
      <directionalLight position={[2.8, 3.4, 2.6]} intensity={3.6} color="#ffe6c6" />
      <directionalLight position={[-3.0, 1.0, -2.2]} intensity={1.5} color="#b56a2c" />
      <pointLight position={[0, 1.6, 1.6]} intensity={3} color="#ffbe84" distance={8} decay={2} />

      <mesh scale={40} renderOrder={-10}>
        <sphereGeometry args={[1, 32, 24]} />
        <primitive object={backdrop} attach="material" />
      </mesh>

      {/* mesa: só um plano escuro que recebe o reflexo da luz */}
      <mesh rotation={[-Math.PI / 2, 0, 0]} position={[0, -0.56, 0]}>
        <circleGeometry args={[9, 48]} />
        <meshStandardMaterial color="#160e09" roughness={0.72} metalness={0.15} />
      </mesh>

      <group ref={cup} position={[0, -0.52, 0]} scale={1.45}>
        <mesh geometry={saucerGeo} position={[0, -0.02, 0]}>
          <meshPhysicalMaterial
            color="#fbf3e6"
            emissive="#3b2a1a"
            emissiveIntensity={0.55}
            roughness={0.26}
            metalness={0.02}
            clearcoat={0.85}
            clearcoatRoughness={0.14}
          />
        </mesh>
        <mesh geometry={cupGeo}>
          <meshPhysicalMaterial
            color="#fbf3e6"
            emissive="#3b2a1a"
            emissiveIntensity={0.55}
            roughness={0.22}
            metalness={0.02}
            clearcoat={0.95}
            clearcoatRoughness={0.1}
            side={THREE.DoubleSide}
          />
        </mesh>
        {/* asa da xícara */}
        <mesh position={[0.78, 0.5, 0]} rotation={[0, 0, -0.1]}>
          <torusGeometry args={[0.24, 0.045, 12, 40, Math.PI * 1.25]} />
          <meshPhysicalMaterial
            color="#fbf3e6"
            emissive="#3b2a1a"
            emissiveIntensity={0.55}
            roughness={0.22}
            metalness={0.02}
            clearcoat={0.95}
            clearcoatRoughness={0.1}
          />
        </mesh>
        <mesh rotation={[-Math.PI / 2, 0, 0]} position={[0, 0.63, 0]}>
          <circleGeometry args={[0.67, 72]} />
          <primitive object={cremaMat} attach="material" />
        </mesh>
      </group>

      {/* o fio: entra por cima do enquadramento e encontra a superfície */}
      <mesh ref={stream} position={[0, 1.69, 0]}>
        <cylinderGeometry args={[0.055, 0.042, 2.6, 28, 22, true]} />
        <primitive object={streamMat} attach="material" />
      </mesh>

      <points ref={splash} geometry={pGeo} material={pMat} frustumCulled={false} />
    </>
  );
}
