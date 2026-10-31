"use client";

import dynamic from "next/dynamic";
import Image from "next/image";
import { useRef } from "react";

import {
  useInView,
  useQuality,
  useScrollProgress,
  useWebGL,
} from "@/lib/hooks";
import { useMotionPref } from "@/lib/motionPref";
import { pour } from "@/lib/site";
import { SceneCanvas } from "@/three/SceneCanvas";
import { POUR_SHOTS } from "@/three/shots";

const PhotoStage = dynamic(
  () => import("@/three/PhotoStage").then((m) => m.PhotoStage),
  { ssr: false },
);

const PARTICLES = { low: 120, mid: 220, high: 320 } as const;

export function CoffeePour() {
  const sectionRef = useRef<HTMLElement>(null);
  const [viewRef, inView, mounted] = useInView<HTMLDivElement>(
    "20% 0px",
    "160% 0px",
  );
  const [motion] = useMotionPref();
  const reduced = motion === "reduced";
  const webgl = useWebGL();
  const tier = useQuality();
  const progress = useScrollProgress(sectionRef);
  const use3D = webgl !== false;

  if (!use3D) return <PourFallback />;

  return (
    <section
      id="xicara"
      ref={sectionRef}
      className="relative h-[330vh] md:h-[400vh]"
      aria-label="O café encontra a xícara"
    >
      <div
        ref={viewRef}
        className="sticky top-0 h-[100svh] min-h-[520px] w-full overflow-hidden bg-espresso-950"
      >
        {/* poster sob o canvas: a seção nunca aparece como um bloco preto */}
        <div aria-hidden className="absolute inset-0">
          <Image
            src="/foto/10-cafe-caindo.jpg"
            alt=""
            fill
            sizes="100vw"
            className="object-cover opacity-40 brightness-[0.55]"
          />
          <span className="absolute inset-0 bg-[radial-gradient(120%_95%_at_50%_50%,transparent_18%,rgba(7,4,3,0.88)_88%)]" />
        </div>
        {webgl === true && mounted && (
          <SceneCanvas active={inView} className="!absolute inset-0">
            <PhotoStage
              shots={POUR_SHOTS}
              stops={[0, 0.62]}
              progress={progress}
              particles={PARTICLES[tier]}
              reduced={reduced}
              fade={0.14}
              panelX={0.68}
            />
          </SceneCanvas>
        )}

        <div
          aria-hidden
          className="pointer-events-none absolute inset-0 bg-[radial-gradient(120%_95%_at_50%_50%,transparent_32%,rgba(7,4,3,0.8)_88%)]"
        />
        {/* faixa lateral: garante contraste do texto contra a porcelana clara */}
        <div
          aria-hidden
          className="pointer-events-none absolute inset-0 hidden bg-[linear-gradient(to_right,rgba(7,4,3,0.9)_0%,rgba(7,4,3,0.6)_28%,rgba(7,4,3,0.18)_52%,transparent_70%)] md:block"
        />
        <div
          aria-hidden
          className="pointer-events-none absolute inset-0 bg-[linear-gradient(to_bottom,rgba(7,4,3,0.9)_0%,rgba(7,4,3,0.5)_30%,transparent_52%)] md:hidden"
        />
        <div aria-hidden className="pointer-events-none absolute inset-0 grain" />

        <div className="shell pointer-events-none relative flex h-full items-start pt-24 md:items-center md:pt-0">
          <div className="max-w-sm md:max-w-md">
            <p className="eyebrow">{pour.eyebrow}</p>
            <h2 className="text-display mt-4">{pour.title}</h2>
            <p className="mt-5 text-[0.95rem] leading-relaxed text-cream-200/80">
              {pour.lead}
            </p>
            <p className="mt-8 hidden max-w-xs border-l border-gold-400/40 pl-4 text-[0.72rem] leading-relaxed text-mist-400 md:block">
              Fotografias com profundidade calculada: o fio escorre, a crema gira e
              o vapor sobe em WebGL, sem vídeo.
            </p>
          </div>
        </div>
      </div>
    </section>
  );
}

function PourFallback() {
  return (
    <section
      id="xicara"
      className="relative overflow-hidden bg-espresso-950 py-24 md:py-32"
      aria-label="O café encontra a xícara"
    >
      <div className="shell grid items-center gap-12 lg:grid-cols-2 lg:gap-16">
        <div>
          <p className="eyebrow">{pour.eyebrow}</p>
          <h2 className="text-display mt-4">{pour.title}</h2>
          <p className="mt-5 text-[0.95rem] leading-relaxed text-cream-200/80">
            {pour.lead}
          </p>
        </div>
        <div className="relative aspect-4/5 overflow-hidden rounded-lg">
          <Image
            src="/foto/10-cafe-caindo.jpg"
            alt="Café sendo servido em uma xícara branca, com respingos e vapor"
            fill
            sizes="(max-width: 1024px) 92vw, 46vw"
            className="object-cover"
          />
          <span
            aria-hidden
            className="absolute inset-0 bg-[linear-gradient(to_top,rgba(7,4,3,0.6),transparent_55%)]"
          />
        </div>
      </div>
    </section>
  );
}
