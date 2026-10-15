"use client";

import dynamic from "next/dynamic";
import Image from "next/image";
import { useRef } from "react";

import {
  useInView,
  useQuality,
  useReducedMotion,
  useScrollProgress,
  useWebGL,
} from "@/lib/hooks";
import { pour } from "@/lib/site";
import { SceneCanvas } from "@/three/SceneCanvas";

const PourScene = dynamic(
  () => import("@/three/PourScene").then((m) => m.PourScene),
  { ssr: false },
);

const PARTICLES = { low: 90, mid: 180, high: 280 } as const;

export function CoffeePour() {
  const sectionRef = useRef<HTMLElement>(null);
  const [viewRef, inView, mounted] = useInView<HTMLDivElement>(
    "20% 0px",
    "160% 0px",
  );
  const reduced = useReducedMotion();
  const webgl = useWebGL();
  const tier = useQuality();
  const progress = useScrollProgress(sectionRef);
  const use3D = webgl !== false && !reduced;

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
            src="/img/servindo-xicara.jpg"
            alt=""
            fill
            sizes="100vw"
            className="object-cover opacity-40 brightness-[0.55]"
          />
          <span className="absolute inset-0 bg-[radial-gradient(120%_95%_at_50%_50%,transparent_18%,rgba(7,4,3,0.88)_88%)]" />
        </div>
        {webgl === true && mounted && (
          <SceneCanvas
            active={inView}
            className="!absolute inset-0"
            camera={{ position: [0, 1.5, 4.6], fov: 40 }}
          >
            <PourScene
              progress={progress}
              particles={PARTICLES[tier]}
              reduced={reduced}
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
              O fio, a crema e o vapor são gerados em WebGL — geometria animada
              por shader, sem simulação física e sem vídeo.
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
            src="/img/servindo-xicara.jpg"
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
