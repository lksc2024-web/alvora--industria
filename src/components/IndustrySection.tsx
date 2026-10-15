"use client";

import Image from "next/image";

import { useReveal } from "@/lib/hooks";
import { industry } from "@/lib/site";

export function IndustrySection() {
  const ref = useReveal<HTMLDivElement>(0.1);

  return (
    <section
      id="industria"
      className="relative overflow-hidden bg-espresso-900 py-24 md:py-36"
      aria-label="Indústria e distribuição"
    >
      <div
        aria-hidden
        className="pointer-events-none absolute right-[-18rem] top-10 h-[34rem] w-[34rem] rounded-full bg-[radial-gradient(circle,rgba(216,161,91,0.12),transparent_70%)] blur-2xl"
      />

      <div ref={ref} className="shell relative">
        <div className="reveal max-w-3xl">
          <p className="eyebrow">{industry.eyebrow}</p>
          <h2 className="text-display mt-4">{industry.title}</h2>
          <p className="mt-6 max-w-xl text-[0.95rem] leading-relaxed text-cream-200/80">
            {industry.lead}
          </p>
        </div>

        <ol className="mt-16 space-y-px overflow-hidden rounded-xl border border-white/10 bg-white/8">
          {industry.pillars.map((p, i) => (
            <li
              key={p.n}
              className="reveal group relative grid items-stretch gap-0 bg-espresso-950 md:grid-cols-12"
              style={{ transitionDelay: `${i * 70}ms` }}
            >
              <div
                className={`relative min-h-[13rem] overflow-hidden md:col-span-5 ${
                  i % 2 === 1 ? "md:order-2" : ""
                }`}
              >
                <Image
                  src={p.src}
                  alt={p.alt}
                  fill
                  sizes="(max-width: 768px) 100vw, 40vw"
                  className="object-cover opacity-75 transition-all duration-[1.5s] ease-[cubic-bezier(0.16,1,0.3,1)] group-hover:scale-[1.05] group-hover:opacity-100"
                />
                <span
                  aria-hidden
                  className="absolute inset-0 bg-[linear-gradient(to_right,rgba(7,4,3,0.55),transparent_70%)]"
                />
              </div>
              <div className="flex flex-col justify-center gap-3 p-7 md:col-span-7 md:p-10">
                <span className="font-display text-sm tracking-[0.3em] text-gold-400">
                  {p.n}
                </span>
                <h3 className="text-title">{p.title}</h3>
                <p className="max-w-xl text-[0.93rem] leading-relaxed text-cream-200/75">
                  {p.body}
                </p>
              </div>
            </li>
          ))}
        </ol>

        <div className="reveal mt-16 grid gap-10 rounded-xl border border-gold-400/20 bg-[linear-gradient(130deg,rgba(176,102,47,0.14),rgba(7,4,3,0))] p-8 md:grid-cols-12 md:p-12">
          <div className="md:col-span-5">
            <h3 className="text-title">{industry.b2b.title}</h3>
            <p className="mt-4 text-[0.93rem] leading-relaxed text-cream-200/80">
              {industry.b2b.body}
            </p>
          </div>
          <ul className="grid gap-px self-start overflow-hidden rounded-lg bg-white/10 sm:grid-cols-2 md:col-span-7">
            {industry.b2b.bullets.map((b) => (
              <li
                key={b}
                className="flex items-start gap-3 bg-espresso-950 p-5 text-sm text-cream-200/85"
              >
                <span aria-hidden className="mt-2 block h-px w-4 shrink-0 bg-gold-400" />
                {b}
              </li>
            ))}
          </ul>
        </div>

        <p className="reveal mt-8 max-w-2xl text-xs leading-relaxed text-mist-500">
          {industry.note}
        </p>
      </div>
    </section>
  );
}
