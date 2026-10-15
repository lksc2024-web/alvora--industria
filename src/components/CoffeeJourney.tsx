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
import { journey } from "@/lib/site";
import { SceneCanvas } from "@/three/SceneCanvas";

const JourneyScene = dynamic(
  () => import("@/three/JourneyScene").then((m) => m.JourneyScene),
  { ssr: false },
);

const BEANS = { low: 170, mid: 360, high: 560 } as const;
const PARTICLES = { low: 220, mid: 520, high: 900 } as const;

/** Imagens de apoio — também servem de fallback sem WebGL. */
const STILLS: Record<string, { src: string; alt: string }> = {
  fruto: {
    src: "/img/lavoura-cerejas.jpg",
    alt: "Cerejas de café vermelhas e verdes em um galho, com lavoura ao fundo",
  },
  colheita: {
    src: "/img/colheita.jpg",
    alt: "Trabalhador colhendo cerejas de café em uma peneira",
  },
  beneficiamento: {
    src: "/img/beneficiamento.jpg",
    alt: "Cerejas de café em canal de lavagem durante o beneficiamento",
  },
  industria: {
    src: "/img/silos-industria.jpg",
    alt: "Silos metálicos e sacarias de café na entrada da indústria",
  },
  torra: {
    src: "/img/torrefacao-tambor.jpg",
    alt: "Tambor de torrefação despejando grãos quentes com vapor",
  },
  moagem: {
    src: "/img/moagem.jpg",
    alt: "Café moído caindo de um moinho industrial",
  },
  preparo: {
    src: "/img/preparo-coador.jpg",
    alt: "Café sendo despejado de uma jarra de vidro em uma xícara",
  },
  xicara: {
    src: "/img/servindo-xicara.jpg",
    alt: "Café caindo em uma xícara branca, com vapor e respingos",
  },
};

export function CoffeeJourney() {
  const sectionRef = useRef<HTMLElement>(null);
  const [viewRef, inView, mounted] = useInView<HTMLDivElement>("20% 0px");
  const reduced = useReducedMotion();
  const webgl = useWebGL();
  const tier = useQuality();
  const [active, setActive] = useDistinctState(0);
  const barRef = useRef<HTMLSpanElement>(null);

  const onProgress = useCallback(
    (p: number) => {
      let idx = 0;
      for (let i = 0; i < journey.length; i++) {
        if (p >= journey[i].at - 0.01) idx = i;
      }
      setActive(idx);
      if (barRef.current) {
        barRef.current.style.transform = `scaleY(${Math.max(0.02, p)})`;
      }
    },
    [setActive],
  );

  const progress = useScrollProgress(sectionRef, onProgress);
  // otimista: mantém a estrutura 3D até saber que ela não é possível/desejada
  const use3D = webgl !== false && !reduced;
  const scene = journey[active];

  if (!use3D) {
    return <JourneyFallback />;
  }

  return (
    <section
      id="jornada"
      ref={sectionRef}
      className="relative h-[620vh] md:h-[760vh]"
      aria-label="A transformação do café, da origem à xícara"
    >
      <div
        ref={viewRef}
        className="sticky top-0 h-[100svh] min-h-[520px] w-full overflow-hidden"
      >
        <div aria-hidden className="absolute inset-0 bg-espresso-950" />
        {webgl === true && mounted && (
          <SceneCanvas
            active={inView}
            className="!absolute inset-0"
            camera={{ position: [0.25, 0.3, 4.3], fov: 38 }}
          >
            <JourneyScene
              progress={progress}
              count={BEANS[tier]}
              particles={PARTICLES[tier]}
              reduced={reduced}
            />
          </SceneCanvas>
        )}

        <div
          aria-hidden
          className="pointer-events-none absolute inset-0 bg-[linear-gradient(to_top,rgba(7,4,3,0.95)_0%,rgba(7,4,3,0.85)_16%,rgba(7,4,3,0.6)_34%,rgba(7,4,3,0.22)_56%,transparent_74%)]"
        />
        <div aria-hidden className="pointer-events-none absolute inset-0 grain" />

        {/* trilho de progresso da jornada */}
        <div
          aria-hidden
          className="pointer-events-none absolute right-[var(--gutter)] top-1/2 hidden -translate-y-1/2 flex-col items-end gap-3 md:flex"
        >
          <span className="relative block h-40 w-[2px] overflow-hidden bg-white/12">
            <span
              ref={barRef}
              className="absolute inset-x-0 top-0 block h-full origin-top bg-gold-400"
              style={{ transform: "scaleY(0.02)" }}
            />
          </span>
          <span className="font-display text-sm text-gold-300">
            {scene.index}
            <span className="text-mist-500">/08</span>
          </span>
        </div>

        {/* legenda da cena ativa */}
        <div className="shell pointer-events-none absolute inset-x-0 bottom-0 pb-14 md:pb-20">
          <div className="max-w-xl">
            <div className="mb-4 flex items-center gap-3">
              <span className="font-display text-xs tracking-[0.3em] text-gold-400">
                {scene.index}
              </span>
              <span className="h-px w-12 bg-gold-400/50" />
              <span className="eyebrow !tracking-[0.3em] text-cream-200/70">
                A jornada
              </span>
            </div>
            <h2 key={`t-${scene.id}`} className="text-display animate-[fade-up_0.9s_var(--ease-out-expo)_both]">
              {scene.title}
            </h2>
            <p
              key={`b-${scene.id}`}
              className="mt-4 max-w-lg animate-[fade-up_1s_var(--ease-out-expo)_0.08s_both] text-[0.95rem] leading-relaxed text-cream-200/80"
            >
              {scene.body}
            </p>
          </div>
        </div>

        {/* leitores de tela recebem a narrativa completa, sem depender do scroll */}
        <div className="sr-only">
          <h2>A transformação do café</h2>
          <ol>
            {journey.map((s) => (
              <li key={s.id}>
                <h3>{`${s.index} — ${s.title}`}</h3>
                <p>{s.body}</p>
              </li>
            ))}
          </ol>
        </div>
      </div>
    </section>
  );
}

/** Sem WebGL ou com movimento reduzido: a mesma narrativa, em sequência editorial. */
function JourneyFallback() {
  return (
    <section
      id="jornada"
      className="relative bg-espresso-950 py-24 md:py-36"
      aria-label="A transformação do café, da origem à xícara"
    >
      <div className="shell">
        <p className="eyebrow">Ato II</p>
        <h2 className="text-display mt-4 max-w-2xl">
          A transformação, etapa por etapa
        </h2>
        <div className="mt-16 grid gap-px overflow-hidden rounded-xl bg-white/8 sm:grid-cols-2 lg:grid-cols-4">
          {journey.map((s) => {
            const still = STILLS[s.id];
            return (
              <article key={s.id} className="relative bg-espresso-900 p-6 md:p-7">
                <div className="relative mb-6 aspect-4/3 overflow-hidden rounded-md">
                  <Image
                    src={still.src}
                    alt={still.alt}
                    fill
                    sizes="(max-width: 640px) 90vw, (max-width: 1024px) 45vw, 23vw"
                    className="object-cover"
                  />
                  <span
                    aria-hidden
                    className="absolute inset-0 bg-[linear-gradient(to_top,rgba(7,4,3,0.75),transparent_60%)]"
                  />
                </div>
                <span className="font-display text-xs tracking-[0.3em] text-gold-400">
                  {s.index}
                </span>
                <h3 className="mt-2 text-xl">{s.title}</h3>
                <p className="mt-3 text-sm leading-relaxed text-cream-200/75">
                  {s.body}
                </p>
              </article>
            );
          })}
        </div>
      </div>
    </section>
  );
}
