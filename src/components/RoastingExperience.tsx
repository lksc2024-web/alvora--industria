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
import { roasting } from "@/lib/site";
import { SceneCanvas } from "@/three/SceneCanvas";

const RoastLive = dynamic(
  () =>
    Promise.all([import("@/three/LivingPhoto"), import("@/three/livingScenes")]).then(
      ([m, s]) =>
        function RoastLive(props: { progress: ProgressRef; reduced: boolean; beans: number; particles: number }) {
          return <m.LivingPhoto shots={s.ROAST_SHOTS} direct={s.roastDirection} panelX={0.68} {...props} />;
        },
    ),
  { ssr: false },
);

const BEANS = { low: 40, mid: 70, high: 100 } as const;
const PARTICLES = { low: 160, mid: 280, high: 420 } as const;

export function RoastingExperience() {
  const sectionRef = useRef<HTMLElement>(null);
  const [viewRef, inView, mounted] = useInView<HTMLDivElement>(
    "20% 0px",
    "160% 0px",
  );
  const [motion] = useMotionPref();
  const reduced = motion === "reduced";
  const webgl = useWebGL();
  const tier = useQuality();
  const [step, setStep] = useDistinctState(0);

  const onProgress = useCallback(
    (p: number) => {
      const i = Math.min(
        roasting.steps.length - 1,
        Math.floor(p * roasting.steps.length),
      );
      setStep(i);
    },
    [setStep],
  );

  const progress = useScrollProgress(sectionRef, onProgress);
  const use3D = webgl !== false;

  if (!use3D) return <RoastFallback />;

  return (
    <section
      id="torrefacao"
      ref={sectionRef}
      className="relative h-[380vh] md:h-[460vh]"
      aria-label="Torrefação"
    >
      <div
        ref={viewRef}
        className="sticky top-0 h-[100svh] min-h-[520px] w-full overflow-hidden bg-espresso-950"
      >
        <div aria-hidden className="absolute inset-0">
          <Image
            src="/foto/07-tambor.jpg"
            alt=""
            fill
            sizes="100vw"
            className="object-cover opacity-40 brightness-[0.55]"
          />
          <span className="absolute inset-0 bg-[radial-gradient(120%_90%_at_50%_45%,transparent_18%,rgba(10,4,2,0.88)_88%)]" />
        </div>
        {webgl === true && mounted && (
          <SceneCanvas active={inView} className="!absolute inset-0">
            <RoastLive
              progress={progress}
              beans={BEANS[tier]}
              particles={PARTICLES[tier]}
              reduced={reduced}
            />
          </SceneCanvas>
        )}

        <div
          aria-hidden
          className="pointer-events-none absolute inset-0 bg-[radial-gradient(130%_100%_at_50%_45%,transparent_25%,rgba(10,4,2,0.8)_85%)]"
        />
        <div
          aria-hidden
          className="pointer-events-none absolute inset-0 bg-[linear-gradient(to_bottom,rgba(10,4,2,0.82)_0%,rgba(10,4,2,0.42)_24%,transparent_46%,rgba(10,4,2,0.45)_74%,rgba(10,4,2,0.85)_100%)]"
        />
        <div aria-hidden className="pointer-events-none absolute inset-0 grain" />

        <div className="shell pointer-events-none relative flex h-full flex-col justify-between py-24 md:py-28">
          <div className="max-w-md">
            <p className="eyebrow">{roasting.eyebrow}</p>
            <h2 className="text-display mt-4">{roasting.title}</h2>
            <p className="mt-5 max-w-sm text-[0.95rem] leading-relaxed text-cream-200/80">
              {roasting.lead}
            </p>
          </div>

          <div>
          {/* No celular a lista inteira cobriria a cena: mostramos só a etapa
              corrente e marcamos o avanço com pontos. */}
          <ol
            aria-label="Perfil de torra"
            className="grid gap-px overflow-hidden rounded-lg border border-white/10 bg-white/8 sm:grid-cols-2 lg:grid-cols-4"
          >
            {roasting.steps.map((s, i) => {
              const on = i <= step;
              return (
                <li
                  key={s.label}
                  className={`${i === step ? "block" : "hidden"} bg-espresso-950/80 p-5 backdrop-blur-sm transition-colors duration-700 sm:block ${
                    on ? "text-cream-100" : "text-mist-500"
                  }`}
                >
                  <div className="flex items-baseline justify-between gap-3">
                    <span className="text-[0.7rem] uppercase tracking-[0.2em]">
                      {s.label}
                    </span>
                    <span
                      className={`font-display text-lg transition-colors duration-700 ${
                        on ? "text-gold-300" : "text-mist-600"
                      }`}
                    >
                      {s.temp}
                    </span>
                  </div>
                  <span
                    aria-hidden
                    className={`mt-3 block h-px origin-left transition-transform duration-700 ${
                      on ? "scale-x-100 bg-gold-400/70" : "scale-x-0 bg-white/20"
                    }`}
                  />
                  <p className="mt-3 text-xs leading-relaxed opacity-80">{s.note}</p>
                </li>
              );
            })}
          </ol>
          <div aria-hidden className="mt-4 flex gap-2 sm:hidden">
            {roasting.steps.map((s, i) => (
              <span
                key={s.label}
                className={`h-[3px] flex-1 rounded-full transition-colors duration-500 ${
                  i <= step ? "bg-gold-400" : "bg-white/18"
                }`}
              />
            ))}
          </div>
          <p className="mt-4 text-[0.68rem] text-mist-500">{roasting.note}</p>
          </div>
        </div>
      </div>
    </section>
  );
}

function RoastFallback() {
  return (
    <section
      id="torrefacao"
      className="relative overflow-hidden bg-espresso-950 py-24 md:py-32"
      aria-label="Torrefação"
    >
      <div className="shell grid gap-12 lg:grid-cols-12 lg:gap-16">
        <div className="lg:col-span-5">
          <p className="eyebrow">{roasting.eyebrow}</p>
          <h2 className="text-display mt-4">{roasting.title}</h2>
          <p className="mt-5 text-[0.95rem] leading-relaxed text-cream-200/80">
            {roasting.lead}
          </p>
          <dl className="mt-10 space-y-6">
            {roasting.steps.map((s) => (
              <div key={s.label} className="border-t border-white/10 pt-4">
                <dt className="flex items-baseline justify-between gap-4">
                  <span className="text-[0.7rem] uppercase tracking-[0.2em] text-cream-100">
                    {s.label}
                  </span>
                  <span className="font-display text-lg text-gold-300">{s.temp}</span>
                </dt>
                <dd className="mt-2 text-sm text-cream-200/70">{s.note}</dd>
              </div>
            ))}
          </dl>
        </div>
        <div className="relative aspect-3/4 overflow-hidden rounded-lg lg:col-span-7">
          <Image
            src="/foto/07-tambor.jpg"
            alt="Tambor de torrefação despejando grãos quentes, com vapor e luz âmbar"
            fill
            sizes="(max-width: 1024px) 92vw, 55vw"
            className="object-cover"
          />
          <span
            aria-hidden
            className="absolute inset-0 bg-[radial-gradient(120%_90%_at_60%_40%,transparent_30%,rgba(10,4,2,0.75)_90%)]"
          />
        </div>
      </div>
      <p className="shell mt-10 text-xs text-mist-500">{roasting.note}</p>
    </section>
  );
}
