"use client";

import dynamic from "next/dynamic";
import Image from "next/image";
import { useCallback, useRef } from "react";

import {
  useDistinctState,
  useInView,
  useQuality,
  useReducedMotion,
  useScrollProgress,
  useWebGL,
} from "@/lib/hooks";
import { ritual } from "@/lib/site";
import { SceneCanvas } from "@/three/SceneCanvas";

const RitualScene = dynamic(
  () => import("@/three/RitualScene").then((m) => m.RitualScene),
  { ssr: false },
);

const PARTICLES = { low: 70, mid: 140, high: 220 } as const;

export function RitualExperience() {
  const sectionRef = useRef<HTMLElement>(null);
  const [viewRef, inView, mounted] = useInView<HTMLDivElement>(
    "20% 0px",
    "160% 0px",
  );
  const reduced = useReducedMotion();
  const webgl = useWebGL();
  const tier = useQuality();
  const [mark, setMark] = useDistinctState(0);

  const onProgress = useCallback(
    (p: number) => {
      setMark(Math.min(ritual.marks.length - 1, Math.floor(p * ritual.marks.length)));
    },
    [setMark],
  );

  const progress = useScrollProgress(sectionRef, onProgress);
  const use3D = webgl !== false && !reduced;

  if (!use3D) return <RitualFallback />;

  return (
    <section
      id="ritual"
      ref={sectionRef}
      className="relative h-[320vh] md:h-[380vh]"
      aria-label="O ritual do preparo"
    >
      <div
        ref={viewRef}
        className="sticky top-0 h-[100svh] min-h-[520px] w-full overflow-hidden bg-espresso-950"
      >
        <div aria-hidden className="absolute inset-0">
          <Image
            src="/img/cappuccino.jpg"
            alt=""
            fill
            sizes="100vw"
            className="object-cover opacity-35 brightness-[0.55]"
          />
          <span className="absolute inset-0 bg-[radial-gradient(115%_90%_at_50%_48%,transparent_16%,rgba(7,4,3,0.9)_86%)]" />
        </div>
        {webgl === true && mounted && (
          <SceneCanvas
            active={inView}
            className="!absolute inset-0"
            camera={{ position: [0, 2.6, 2.2], fov: 40 }}
          >
            <RitualScene
              progress={progress}
              particles={PARTICLES[tier]}
              reduced={reduced}
            />
          </SceneCanvas>
        )}

        <div
          aria-hidden
          className="pointer-events-none absolute inset-0 bg-[radial-gradient(115%_90%_at_50%_48%,transparent_28%,rgba(7,4,3,0.86)_86%)]"
        />
        <div aria-hidden className="pointer-events-none absolute inset-0 grain" />

        <div className="shell pointer-events-none relative flex h-full flex-col justify-between py-24 md:py-28">
          <div className="max-w-md">
            <p className="eyebrow">{ritual.eyebrow}</p>
            <h2 className="text-display mt-4">{ritual.title}</h2>
            <p className="mt-5 max-w-sm text-[0.95rem] leading-relaxed text-cream-200/80">
              {ritual.lead}
            </p>
          </div>

          <ol className="ml-auto w-full max-w-sm space-y-4">
            {ritual.marks.map((m, i) => {
              const on = i <= mark;
              return (
                <li
                  key={m.t}
                  className={`flex items-baseline gap-4 border-t pt-3 transition-colors duration-700 ${
                    on ? "border-gold-400/50" : "border-white/10"
                  }`}
                >
                  <span
                    className={`font-display text-lg tabular-nums transition-colors duration-700 ${
                      on ? "text-gold-300" : "text-mist-600"
                    }`}
                  >
                    {m.t}
                  </span>
                  <span
                    className={`text-sm leading-relaxed transition-colors duration-700 ${
                      on ? "text-cream-200/85" : "text-mist-500"
                    }`}
                  >
                    {m.d}
                  </span>
                </li>
              );
            })}
          </ol>
        </div>
      </div>
    </section>
  );
}

function RitualFallback() {
  return (
    <section
      id="ritual"
      className="relative overflow-hidden bg-espresso-950 py-24 md:py-32"
      aria-label="O ritual do preparo"
    >
      <div className="shell grid items-center gap-12 lg:grid-cols-2 lg:gap-16">
        <div className="relative mx-auto aspect-square w-full max-w-[26rem] overflow-hidden rounded-full lg:mx-0">
          <Image
            src="/img/cappuccino.jpg"
            alt="Superfície de um café visto de cima, com crema e desenho na espuma"
            fill
            sizes="(max-width: 1024px) 88vw, 44vw"
            className="object-cover"
          />
        </div>
        <div>
          <p className="eyebrow">{ritual.eyebrow}</p>
          <h2 className="text-display mt-4">{ritual.title}</h2>
          <p className="mt-5 text-[0.95rem] leading-relaxed text-cream-200/80">
            {ritual.lead}
          </p>
          <ol className="mt-10 space-y-4">
            {ritual.marks.map((m) => (
              <li key={m.t} className="flex items-baseline gap-4 border-t border-white/10 pt-3">
                <span className="font-display text-lg tabular-nums text-gold-300">
                  {m.t}
                </span>
                <span className="text-sm leading-relaxed text-cream-200/80">{m.d}</span>
              </li>
            ))}
          </ol>
        </div>
      </div>
    </section>
  );
}
