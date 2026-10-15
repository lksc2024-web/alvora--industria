"use client";

import dynamic from "next/dynamic";
import Image from "next/image";
import { useRef } from "react";

import { SceneCanvas } from "@/three/SceneCanvas";
import {
  useInView,
  usePointer,
  useQuality,
  useScrollProgress,
  useWebGL,
} from "@/lib/hooks";
import { useMotionPref } from "@/lib/motionPref";
import { brand, hero } from "@/lib/site";

const HeroScene = dynamic(
  () => import("@/three/HeroScene").then((m) => m.HeroScene),
  { ssr: false },
);

const PARTICLES = { low: 180, mid: 420, high: 700 } as const;

export function HeroSection() {
  const sectionRef = useRef<HTMLElement>(null);
  const [viewRef, inView, mounted] = useInView<HTMLDivElement>("10% 0px");
  const [motion] = useMotionPref();
  const reduced = motion === "reduced";
  const webgl = useWebGL();
  const tier = useQuality();
  const pointer = usePointer(!reduced);
  const progress = useScrollProgress(sectionRef, undefined, {
    start: "top top",
    end: "bottom top",
  });

  return (
    <section
      id="topo"
      ref={sectionRef}
      className="relative h-[100svh] min-h-[560px] w-full overflow-hidden"
      aria-label="Abertura"
    >
      {/* poster de alta qualidade: é o primeiro frame e o LCP da página.
          A cena WebGL entra por cima assim que estiver pronta. */}
      <HeroFallback />

      <div ref={viewRef} className="absolute inset-0">
        {webgl && mounted && (
          <div className="absolute inset-0 animate-[fade-in_1.6s_var(--ease-out-expo)_both]">
            <SceneCanvas
              active={inView}
              className="!absolute inset-0"
              camera={{ position: [0, 0, 4.2], fov: 40 }}
            >
              <HeroScene
                progress={progress}
                pointer={pointer}
                reduced={reduced}
                particles={PARTICLES[tier]}
              />
            </SceneCanvas>
          </div>
        )}
      </div>

      {/* legibilidade garantida sobre a cena, em qualquer estado da animação */}
      <div
        aria-hidden
        className="pointer-events-none absolute inset-0 bg-[linear-gradient(to_top,rgba(7,4,3,0.96)_0%,rgba(7,4,3,0.88)_24%,rgba(7,4,3,0.7)_48%,rgba(7,4,3,0.42)_70%,rgba(7,4,3,0.3)_84%,rgba(7,4,3,0.62)_100%)]"
      />
      {/* segunda camada horizontal: abre espaço para a tipografia à esquerda
          sem apagar a imagem do lado direito */}
      <div
        aria-hidden
        className="pointer-events-none absolute inset-0 bg-[linear-gradient(to_right,rgba(7,4,3,0.72)_0%,rgba(7,4,3,0.4)_38%,transparent_72%)]"
      />
      <div aria-hidden className="pointer-events-none absolute inset-0 grain" />

      <div className="shell relative flex h-full flex-col justify-end pb-12 pt-20 md:pb-24 md:pt-24">
        <p className="eyebrow short-hide mb-5 animate-[fade-up_1.2s_var(--ease-out-expo)_0.2s_both]">
          {hero.eyebrow}
        </p>

        <div className="grid items-end gap-8 lg:grid-cols-12 lg:gap-10">
          <h1 className="text-hero lg:col-span-8">
            <span className="block animate-[fade-up_1.4s_var(--ease-out-expo)_0.35s_both]">
              {hero.headline[0]}
            </span>
            <span className="block animate-[fade-up_1.4s_var(--ease-out-expo)_0.5s_both] text-gold-300 italic">
              {hero.headline[1]}
            </span>
          </h1>

          <div className="animate-[fade-up_1.4s_var(--ease-out-expo)_0.7s_both] lg:col-span-4 lg:pb-3">
            <p className="max-w-md text-[0.95rem] leading-relaxed text-cream-200/85">
              {hero.lead}
            </p>
            <div className="mt-7 flex flex-wrap gap-3">
              <a href={hero.primaryCta.href} className="btn btn-primary">
                {hero.primaryCta.label}
              </a>
              <a href={hero.secondaryCta.href} className="btn btn-ghost">
                {hero.secondaryCta.label}
              </a>
            </div>
          </div>
        </div>

        <div className="short-hide mt-12 flex items-center justify-between gap-6 border-t border-white/10 pt-6">
          <p className="max-w-xs text-[0.7rem] uppercase tracking-[0.2em] text-mist-400">
            {brand.signature}
          </p>
          <div className="flex items-center gap-3 text-[0.65rem] uppercase tracking-[0.24em] text-mist-400">
            <span className="hidden sm:inline">{hero.scrollHint}</span>
            <span
              aria-hidden
              className="relative block h-9 w-[1px] overflow-hidden bg-white/15"
            >
              <span className="absolute inset-x-0 top-0 block h-3 animate-[scroll-hint_2.2s_ease-in-out_infinite] bg-gold-300" />
            </span>
          </div>
        </div>
      </div>
    </section>
  );
}

function HeroFallback() {
  return (
    <div className="absolute inset-0">
      <Image
        src="/img/jornada-fruto.jpg"
        alt="Cereja de café madura em um galho, com lavoura ao fundo durante o amanhecer"
        fill
        priority
        sizes="100vw"
        className="object-cover object-center brightness-[0.62] saturate-[1.08]"
      />
      <div
        aria-hidden
        className="absolute inset-0 bg-[radial-gradient(120%_90%_at_50%_40%,transparent_30%,rgba(7,4,3,0.8)_85%)]"
      />
    </div>
  );
}
