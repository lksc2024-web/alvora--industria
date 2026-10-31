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
import { journey, roasting } from "@/lib/site";
import { SceneCanvas } from "@/three/SceneCanvas";

/*
 * A jornada inteira numa seção só: a cena 3D com os recortes faz o começo
 * (cereja → semente → grão), o grão cai, e a câmera desce pelas fotos vivas
 * empilhadas — tambor, moagem, preparo — até o fio cair na xícara.
 */
const Descent = dynamic(
  () =>
    Promise.all([
      import("@/three/JourneyScene"),
      import("@/three/LivingPhoto"),
      import("@/three/livingScenes"),
    ]).then(([j, l, s]) =>
      function Descent(props: {
        progress: ProgressRef;
        count: number;
        particles: number;
        photoParticles: number;
        reduced: boolean;
      }) {
        return (
          <>
            <j.JourneyScene
              progress={props.progress}
              count={props.count}
              particles={props.particles}
              reduced={props.reduced}
              descent
            />
            <l.LivingPhoto
              shots={s.DESCENT_SHOTS}
              direct={s.descentDirection}
              progress={props.progress}
              reduced={props.reduced}
              particles={props.photoParticles}
              beans={props.count > 300 ? 90 : 60}
            />
          </>
        );
      },
    ),
  { ssr: false },
);

const BEANS = { low: 170, mid: 360, high: 560 } as const;
const PARTICLES = { low: 220, mid: 520, high: 900 } as const;
const PHOTO_PARTICLES = { low: 160, mid: 280, high: 400 } as const;

/** trecho do tambor em que as etapas da torra aparecem na legenda */
const ROAST_FROM = 0.41;
const ROAST_TO = 0.59;

/** Imagens de apoio — também servem de fallback sem WebGL. */
const STILLS: Record<string, { src: string; alt: string }> = {
  fruto: { src: "/foto/02-o-fruto.jpg", alt: "Cereja de café vermelha e madura, coberta de gotas de orvalho, ao sol da manhã" },
  colheita: { src: "/foto/03-colheita.jpg", alt: "Cerejas de café maduras caindo do galho para um cesto de palha" },
  beneficiamento: { src: "/foto/04-secagem.jpg", alt: "Grãos de café em pergaminho secando no terreiro ao pôr do sol" },
  industria: { src: "/foto/05-grao-cru.jpg", alt: "Grãos de café crus, esverdeados, com o sulco central à mostra" },
  torra: { src: "/foto/06-torra.jpg", alt: "Grão de café torrado suspenso entre brasas e outros grãos" },
  moagem: { src: "/foto/08-moagem.jpg", alt: "Grão de café torrado se desfazendo em pó no ar" },
  preparo: { src: "/foto/09-preparo.jpg", alt: "Água quente caindo sobre o pó de café no coador, com vapor" },
  xicara: { src: "/foto/10-cafe-caindo.jpg", alt: "Fio de café caindo em uma xícara branca, com crema e vapor" },
};

export function CoffeeJourney() {
  const sectionRef = useRef<HTMLElement>(null);
  // mountMargin generoso: o chunk do three.js começa a baixar bem antes de a
  // seção chegar à tela, para não haver um quadro vazio em scroll rápido
  const [viewRef, inView, mounted] = useInView<HTMLDivElement>(
    "20% 0px",
    "160% 0px",
  );
  const [motion] = useMotionPref();
  const reduced = motion === "reduced";
  const webgl = useWebGL();
  const tier = useQuality();
  const [active, setActive] = useDistinctState(0);
  const [roastStep, setRoastStep] = useDistinctState(-1);
  const barRef = useRef<HTMLSpanElement>(null);

  const onProgress = useCallback(
    (p: number) => {
      let idx = 0;
      for (let i = 0; i < journey.length; i++) {
        if (p >= journey[i].at - 0.01) idx = i;
      }
      setActive(idx);
      setRoastStep(
        p < ROAST_FROM || p > ROAST_TO + 0.02
          ? -1
          : Math.min(3, Math.floor(((p - ROAST_FROM) / (ROAST_TO - ROAST_FROM)) * 4)),
      );
      if (barRef.current) {
        barRef.current.style.transform = `scaleY(${Math.max(0.02, p)})`;
      }
    },
    [setActive, setRoastStep],
  );

  const progress = useScrollProgress(sectionRef, onProgress);
  // otimista: mantém a estrutura 3D até saber que ela não é possível/desejada
  const use3D = webgl !== false;
  const scene = journey[active];

  if (!use3D) {
    return <JourneyFallback />;
  }

  return (
    <section
      id="jornada"
      ref={sectionRef}
      className="relative h-[1600vh] md:h-[1800vh]"
      aria-label="A transformação do café, da origem à xícara"
    >
      {/* âncoras do menu: a torrefação e a xícara agora são trechos da descida */}
      <span id="torrefacao" aria-hidden className="absolute left-0 top-[36%] h-px w-px" />
      <span id="xicara" aria-hidden className="absolute left-0 top-[80%] h-px w-px" />
      <div
        ref={viewRef}
        className="sticky top-0 h-[100svh] min-h-[520px] w-full overflow-hidden"
      >
        {/* Poster sob o canvas: enquanto o WebGL carrega (ou se ele falhar),
            a seção mostra a lavoura em vez de um retângulo preto. O fundo
            esférico da cena cobre esta camada assim que começa a renderizar. */}
        <div aria-hidden className="absolute inset-0 bg-espresso-950">
          <Image
            src="/foto/02-o-fruto.jpg"
            alt=""
            fill
            sizes="100vw"
            className="object-cover opacity-45 brightness-[0.5]"
          />
          <span className="absolute inset-0 bg-[radial-gradient(120%_90%_at_50%_45%,transparent_20%,rgba(7,4,3,0.85)_88%)]" />
        </div>
        {webgl === true && mounted && (
          <SceneCanvas
            active={inView}
            className="!absolute inset-0"
            camera={{ position: [0.25, 0.3, 4.3], fov: 38 }}
          >
            <Descent
              progress={progress}
              count={BEANS[tier]}
              particles={PARTICLES[tier]}
              photoParticles={PHOTO_PARTICLES[tier]}
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
            {roastStep >= 0 && (
              <p
                key={`r-${roastStep}`}
                className="mt-5 flex max-w-lg animate-[fade-up_0.7s_var(--ease-out-expo)_both] items-baseline gap-3 border-t border-white/12 pt-4 text-[0.8rem] text-cream-200/75"
              >
                <span className="eyebrow !tracking-[0.25em] text-gold-300">
                  {roasting.steps[roastStep].label}
                </span>
                <span className="font-display text-base text-gold-200">
                  {roasting.steps[roastStep].temp}
                </span>
                <span className="hidden sm:inline">{roasting.steps[roastStep].note}</span>
              </p>
            )}
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
