"use client";

import dynamic from "next/dynamic";
import Image from "next/image";
import { useCallback, useRef } from "react";

import {
  useDistinctState,
  useInView,
  useQuality,
  useScrollProgress,
  useWebGL,
  type ProgressRef,
} from "@/lib/hooks";
import { useMotionPref } from "@/lib/motionPref";
import { ritual } from "@/lib/site";
import { SceneCanvas } from "@/three/SceneCanvas";

const RitualLive = dynamic(
  () =>
    Promise.all([import("@/three/LivingPhoto"), import("@/three/livingScenes")]).then(
      ([m, s]) =>
        function RitualLive(props: { progress: ProgressRef; reduced: boolean; particles: number }) {
          return <m.LivingPhoto shots={s.RITUAL_SHOTS} direct={s.ritualDirection} panelX={0.53} beans={1} {...props} />;
        },
    ),
  { ssr: false },
);

const PARTICLES = { low: 120, mid: 200, high: 300 } as const;

export function RitualExperience() {
  const sectionRef = useRef<HTMLElement>(null);
  const [viewRef, inView, mounted] = useInView<HTMLDivElement>(
    "20% 0px",
    "160% 0px",
  );
  const [motion] = useMotionPref();
  const reduced = motion === "reduced";
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
  const use3D = webgl !== false;

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
            src="/foto/12-espresso.jpg"
            alt=""
            fill
            sizes="100vw"
            className="object-cover opacity-35 brightness-[0.55]"
          />
          <span className="absolute inset-0 bg-[radial-gradient(115%_90%_at_50%_48%,transparent_16%,rgba(7,4,3,0.9)_86%)]" />
        </div>
        {webgl === true && mounted && (
          <SceneCanvas active={inView} className="!absolute inset-0">
            <RitualLive
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
        <div
          aria-hidden
          className="pointer-events-none absolute inset-0 hidden bg-[linear-gradient(to_right,rgba(7,4,3,0.88)_0%,rgba(7,4,3,0.55)_26%,rgba(7,4,3,0.15)_50%,transparent_68%)] md:block"
        />
        <div
          aria-hidden
          className="pointer-events-none absolute inset-0 bg-[linear-gradient(to_bottom,rgba(7,4,3,0.92)_0%,rgba(7,4,3,0.55)_28%,transparent_50%,rgba(7,4,3,0.6)_78%,rgba(7,4,3,0.9)_100%)] md:hidden"
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
        <div className="relative mx-auto aspect-4/5 w-full max-w-[26rem] overflow-hidden rounded-lg lg:mx-0">
          <Image
            src="/foto/12-espresso.jpg"
            alt="Dois fios de espresso caindo de um porta-filtro numa xícara branca, com a crema se formando"
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
