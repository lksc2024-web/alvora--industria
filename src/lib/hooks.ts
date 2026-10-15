"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import type { RefObject } from "react";

/** Respeita prefers-reduced-motion e reage a mudanças em tempo real. */
export function useReducedMotion() {
  const [reduced, setReduced] = useState(false);
  useEffect(() => {
    const mq = window.matchMedia("(prefers-reduced-motion: reduce)");
    const apply = () => setReduced(mq.matches);
    apply();
    mq.addEventListener("change", apply);
    return () => mq.removeEventListener("change", apply);
  }, []);
  return reduced;
}

/** Detecta suporte a WebGL uma única vez por sessão. */
let webglCache: boolean | null = null;
export function useWebGL() {
  const [ok, setOk] = useState<boolean | null>(webglCache);
  useEffect(() => {
    if (webglCache !== null) {
      setOk(webglCache);
      return;
    }
    let supported = false;
    try {
      const canvas = document.createElement("canvas");
      const ctx =
        canvas.getContext("webgl2") ||
        canvas.getContext("webgl") ||
        canvas.getContext("experimental-webgl");
      supported = !!ctx;
      const lose = (ctx as WebGLRenderingContext | null)?.getExtension(
        "WEBGL_lose_context",
      );
      lose?.loseContext();
    } catch {
      supported = false;
    }
    webglCache = supported;
    setOk(supported);
  }, []);
  return ok;
}

/** Marca um elemento como visível (uma vez) para disparar reveals. */
export function useReveal<T extends HTMLElement>(threshold = 0.18) {
  const ref = useRef<T>(null);
  useEffect(() => {
    const el = ref.current;
    if (!el) return;
    if (
      typeof IntersectionObserver === "undefined" ||
      window.matchMedia("(prefers-reduced-motion: reduce)").matches
    ) {
      el.classList.add("is-in");
      return;
    }
    const io = new IntersectionObserver(
      (entries) => {
        for (const e of entries) {
          if (e.isIntersecting) {
            e.target.classList.add("is-in");
            io.unobserve(e.target);
          }
        }
      },
      { threshold, rootMargin: "0px 0px -8% 0px" },
    );
    const targets = el.querySelectorAll<HTMLElement>(".reveal");
    if (targets.length) targets.forEach((t) => io.observe(t));
    else io.observe(el);
    return () => io.disconnect();
  }, [threshold]);
  return ref;
}

/**
 * Visibilidade contínua — liga/desliga o loop de render das cenas.
 * `everInView` só vira true quando a seção chega perto pela primeira vez: é o
 * gatilho para criar o contexto WebGL. Sem isso, as cinco cenas criariam cinco
 * contextos no primeiro paint, mesmo que quatro delas estejam a 20 000 px dali.
 */
export function useInView<T extends HTMLElement>(
  rootMargin = "15% 0px",
  mountMargin = "80% 0px",
) {
  const ref = useRef<T>(null);
  const [inView, setInView] = useState(false);
  const [everInView, setEverInView] = useState(false);

  useEffect(() => {
    const el = ref.current;
    if (!el) return;
    if (typeof IntersectionObserver === "undefined") {
      setInView(true);
      setEverInView(true);
      return;
    }
    const io = new IntersectionObserver(
      ([entry]) => setInView(entry.isIntersecting),
      { rootMargin },
    );
    io.observe(el);

    const mounter = new IntersectionObserver(
      ([entry]) => {
        if (entry.isIntersecting) {
          setEverInView(true);
          mounter.disconnect();
        }
      },
      { rootMargin: mountMargin },
    );
    mounter.observe(el);

    return () => {
      io.disconnect();
      mounter.disconnect();
    };
  }, [rootMargin, mountMargin]);

  return [ref, inView, everInView] as const;
}

export type ProgressRef = { current: number };

/**
 * Progresso 0..1 de uma seção, via GSAP ScrollTrigger.
 * Escreve em um ref (sem re-render) e, opcionalmente, notifica um callback.
 * O GSAP é carregado sob demanda para ficar fora do bundle inicial.
 */
export function useScrollProgress(
  ref: RefObject<HTMLElement | null>,
  onUpdate?: (p: number) => void,
  opts?: { start?: string; end?: string },
) {
  const progress = useRef(0);
  const cb = useRef(onUpdate);
  cb.current = onUpdate;

  useEffect(() => {
    let killed = false;
    let trigger: { kill: () => void } | undefined;

    (async () => {
      const [{ default: gsap }, { ScrollTrigger }] = await Promise.all([
        import("gsap"),
        import("gsap/ScrollTrigger"),
      ]);
      gsap.registerPlugin(ScrollTrigger);
      if (killed || !ref.current) return;

      const handler = (self: { progress: number }) => {
        progress.current = self.progress;
        cb.current?.(self.progress);
      };

      trigger = ScrollTrigger.create({
        trigger: ref.current,
        start: opts?.start ?? "top top",
        end: opts?.end ?? "bottom bottom",
        onUpdate: handler,
        onRefresh: handler,
      });
    })();

    return () => {
      killed = true;
      trigger?.kill();
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [ref, opts?.start, opts?.end]);

  return progress;
}

/** Posição do ponteiro normalizada (-1..1) com amortecimento, para parallax. */
export function usePointer(enabled = true) {
  const pointer = useRef({ x: 0, y: 0 });
  useEffect(() => {
    if (!enabled) return;
    const onMove = (e: PointerEvent) => {
      pointer.current.x = (e.clientX / window.innerWidth) * 2 - 1;
      pointer.current.y = (e.clientY / window.innerHeight) * 2 - 1;
    };
    window.addEventListener("pointermove", onMove, { passive: true });
    return () => window.removeEventListener("pointermove", onMove);
  }, [enabled]);
  return pointer;
}

/** Perfil de qualidade: reduz contagem de partículas/instâncias em telas pequenas. */
export function useQuality() {
  const [tier, setTier] = useState<"low" | "mid" | "high">("mid");
  useEffect(() => {
    const compute = () => {
      // gancho usado pelo QA automatizado (WebGL por software) e por depuração
      const forced = (window as Window & { __ALVORA_TIER__?: string })
        .__ALVORA_TIER__;
      if (forced === "low" || forced === "mid" || forced === "high") {
        setTier(forced);
        return;
      }
      const w = window.innerWidth;
      const mem = (navigator as Navigator & { deviceMemory?: number })
        .deviceMemory;
      const cores = navigator.hardwareConcurrency ?? 4;
      const weak = (mem !== undefined && mem <= 4) || cores <= 4;
      if (w < 768 || weak) setTier("low");
      else if (w < 1440) setTier("mid");
      else setTier("high");
    };
    compute();
    window.addEventListener("resize", compute);
    return () => window.removeEventListener("resize", compute);
  }, []);
  return tier;
}

/** setState só quando o valor realmente muda — evita re-render por frame. */
export function useDistinctState<T>(initial: T) {
  const [value, setValue] = useState(initial);
  const last = useRef(initial);
  const set = useCallback((next: T) => {
    if (Object.is(last.current, next)) return;
    last.current = next;
    setValue(next);
  }, []);
  return [value, set] as const;
}
