"use client";

import Image from "next/image";
import { useCallback, useRef } from "react";

import { useReducedMotion, useReveal, useScrollProgress } from "@/lib/hooks";
import { human } from "@/lib/site";

export function HumanExperience() {
  const sectionRef = useRef<HTMLElement>(null);
  const revealRef = useReveal<HTMLDivElement>();
  const layers = useRef<(HTMLDivElement | null)[]>([]);
  const reduced = useReducedMotion();

  const onProgress = useCallback(
    (p: number) => {
      if (reduced) return;
      const k = (p - 0.5) * 2; // -1 .. 1
      const speeds = [-56, 34, -24, 48];
      layers.current.forEach((el, i) => {
        if (el) el.style.transform = `translate3d(0, ${k * speeds[i % 4]}px, 0)`;
      });
    },
    [reduced],
  );

  useScrollProgress(sectionRef, onProgress, {
    start: "top bottom",
    end: "bottom top",
  });

  return (
    <section
      id="experiencia"
      ref={sectionRef}
      className="relative overflow-hidden bg-espresso-900 py-24 md:py-36"
      aria-label="A experiência humana do café"
    >
      <div
        aria-hidden
        className="pointer-events-none absolute -left-40 top-1/4 h-[32rem] w-[32rem] rounded-full bg-[radial-gradient(circle,rgba(176,102,47,0.16),transparent_68%)] blur-2xl"
      />

      <div ref={revealRef} className="shell relative">
        <div className="grid gap-10 lg:grid-cols-12 lg:gap-14">
          <div className="reveal lg:col-span-5">
            <p className="eyebrow">{human.eyebrow}</p>
            <h2 className="text-display mt-5">
              <span className="block">{human.title[0]}</span>
              <span className="block text-gold-300 italic">{human.title[1]}</span>
            </h2>
            <p className="mt-7 max-w-md text-[0.95rem] leading-relaxed text-cream-200/80">
              {human.lead}
            </p>
            <div className="rule mt-10" />
            <p className="mt-6 max-w-sm text-[0.72rem] leading-relaxed text-mist-400">
              As pessoas nestas imagens são figurativas, criadas para o projeto.
              Não representam clientes, depoimentos ou consumidores reais.
            </p>
          </div>

          <div className="grid grid-cols-2 gap-4 sm:gap-6 lg:col-span-7">
            {human.cards.map((card, i) => (
              <div
                key={card.title}
                ref={(el) => {
                  layers.current[i] = el;
                }}
                className={`will-change-transform ${
                  i % 2 === 1 ? "mt-10 sm:mt-16" : ""
                }`}
              >
                <figure
                  className="reveal group relative overflow-hidden rounded-lg"
                  style={{ transitionDelay: `${i * 90}ms` }}
                >
                  <div className="relative aspect-4/5">
                    <Image
                      src={card.src}
                      alt={card.alt}
                      fill
                      sizes="(max-width: 640px) 45vw, (max-width: 1024px) 44vw, 27vw"
                      className="object-cover transition-transform duration-[1.6s] ease-[cubic-bezier(0.16,1,0.3,1)] group-hover:scale-[1.06]"
                    />
                    <span
                      aria-hidden
                      className="absolute inset-0 bg-[linear-gradient(to_top,rgba(7,4,3,0.86)_0%,rgba(7,4,3,0.1)_52%)]"
                    />
                  </div>
                  <figcaption className="absolute inset-x-0 bottom-0 p-4 sm:p-5">
                    <h3 className="text-base sm:text-lg">{card.title}</h3>
                    <p className="mt-1 text-xs leading-relaxed text-cream-200/70">
                      {card.body}
                    </p>
                  </figcaption>
                </figure>
              </div>
            ))}
          </div>
        </div>
      </div>
    </section>
  );
}
