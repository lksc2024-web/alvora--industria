"use client";

import { Canvas } from "@react-three/fiber";
import type { ReactNode } from "react";
import * as THREE from "three";

type Props = {
  children: ReactNode;
  /** Só renderiza continuamente quando a seção está em tela. */
  active: boolean;
  className?: string;
  camera?: { position: [number, number, number]; fov?: number };
  dpr?: [number, number];
  /** Fundo opaco da cena (evita custo de composição com a página). */
  clear?: string | null;
};

/**
 * Wrapper único de Canvas para todas as cenas do site.
 *  - loop de render desligado quando a seção sai da tela
 *  - DPR limitado (telas 3x não compensam o custo neste tipo de cena)
 *  - sem antialias em telas de alta densidade, onde ele é redundante
 */
export function SceneCanvas({
  children,
  active,
  className,
  camera = { position: [0, 0, 4.5], fov: 38 },
  dpr = [1, 1.75],
  clear = null,
}: Props) {
  return (
    <Canvas
      className={className}
      frameloop={active ? "always" : "demand"}
      dpr={dpr}
      camera={{ ...camera, near: 0.1, far: 120 }}
      gl={{
        antialias: typeof window !== "undefined" && window.devicePixelRatio < 1.6,
        alpha: clear === null,
        powerPreference: "high-performance",
        stencil: false,
        depth: true,
      }}
      onCreated={({ gl }) => {
        gl.toneMapping = THREE.ACESFilmicToneMapping;
        gl.toneMappingExposure = 1.08;
        if (clear) gl.setClearColor(new THREE.Color(clear), 1);
        else gl.setClearColor(0x000000, 0);
      }}
    >
      {children}
    </Canvas>
  );
}
