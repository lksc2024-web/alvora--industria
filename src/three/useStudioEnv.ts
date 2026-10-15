"use client";

import { useThree } from "@react-three/fiber";
import { useEffect } from "react";
import * as THREE from "three";

type Band = {
  /** 0..1 na horizontal, 0..1 na vertical (0 = topo) */
  x: number;
  y: number;
  w: number;
  h: number;
  color: string;
  intensity?: number;
};

/**
 * Environment map gerado em canvas, sem nenhum arquivo HDR externo.
 * Dá reflexo e profundidade aos materiais (grão oleoso, metal do tambor,
 * porcelana da xícara) com custo de alguns kilobytes de GPU.
 */
export function useStudioEnv(
  bands: Band[],
  base: [string, string, string] = ["#2a1a10", "#120b07", "#050302"],
) {
  const gl = useThree((s) => s.gl);
  const scene = useThree((s) => s.scene);

  useEffect(() => {
    const W = 512;
    const H = 256;
    const canvas = document.createElement("canvas");
    canvas.width = W;
    canvas.height = H;
    const ctx = canvas.getContext("2d");
    if (!ctx) return;

    const grad = ctx.createLinearGradient(0, 0, 0, H);
    grad.addColorStop(0, base[0]);
    grad.addColorStop(0.46, base[1]);
    grad.addColorStop(1, base[2]);
    ctx.fillStyle = grad;
    ctx.fillRect(0, 0, W, H);

    // "softboxes": fontes de luz suaves que criam os reflexos alongados
    for (const b of bands) {
      const cx = b.x * W;
      const cy = b.y * H;
      const rx = Math.max(2, (b.w * W) / 2);
      const ry = Math.max(2, (b.h * H) / 2);
      const g = ctx.createRadialGradient(cx, cy, 0, cx, cy, Math.max(rx, ry));
      const c = new THREE.Color(b.color);
      const i = b.intensity ?? 1;
      g.addColorStop(
        0,
        `rgba(${Math.round(c.r * 255 * i)},${Math.round(c.g * 255 * i)},${Math.round(c.b * 255 * i)},1)`,
      );
      g.addColorStop(1, "rgba(0,0,0,0)");
      ctx.save();
      ctx.translate(cx, cy);
      ctx.scale(1, ry / Math.max(rx, ry));
      ctx.translate(-cx, -cy);
      ctx.fillStyle = g;
      ctx.globalCompositeOperation = "lighter";
      ctx.beginPath();
      ctx.arc(cx, cy, Math.max(rx, ry), 0, Math.PI * 2);
      ctx.fill();
      ctx.restore();
      ctx.globalCompositeOperation = "source-over";
    }

    const tex = new THREE.CanvasTexture(canvas);
    tex.mapping = THREE.EquirectangularReflectionMapping;
    tex.colorSpace = THREE.SRGBColorSpace;

    const pmrem = new THREE.PMREMGenerator(gl);
    const target = pmrem.fromEquirectangular(tex);
    scene.environment = target.texture;

    tex.dispose();
    pmrem.dispose();

    return () => {
      scene.environment = null;
      target.dispose();
    };
  }, [gl, scene, bands, base]);
}
