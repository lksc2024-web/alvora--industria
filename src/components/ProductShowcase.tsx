"use client";

import Image from "next/image";

import { useReveal } from "@/lib/hooks";
import { products } from "@/lib/site";

export function ProductShowcase() {
  const ref = useReveal<HTMLDivElement>(0.1);

  return (
    <section
      id="produtos"
      className="relative bg-espresso-950 py-24 md:py-36"
      aria-label="Catálogo conceitual de produtos"
    >
      <div ref={ref} className="shell">
        <div className="reveal flex flex-col gap-6 md:flex-row md:items-end md:justify-between">
          <div>
            <p className="eyebrow">{products.eyebrow}</p>
            <h2 className="text-display mt-4 max-w-xl">{products.title}</h2>
          </div>
          <p className="max-w-sm text-[0.95rem] leading-relaxed text-cream-200/75">
            {products.lead}
          </p>
        </div>

        <ul className="mt-14 grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-12 lg:auto-rows-[19rem]">
          {products.items.map((item, i) => (
            <li
              key={item.id}
              className={`reveal ${item.span}`}
              style={{ transitionDelay: `${Math.min(i, 4) * 80}ms` }}
            >
              <article className="group relative h-full min-h-[17rem] overflow-hidden rounded-xl border border-white/8 bg-espresso-900">
                <Image
                  src={item.src}
                  alt={item.alt}
                  fill
                  sizes="(max-width: 640px) 92vw, (max-width: 1024px) 46vw, 40vw"
                  className="object-cover opacity-70 transition-all duration-[1.4s] ease-[cubic-bezier(0.16,1,0.3,1)] group-hover:scale-[1.07] group-hover:opacity-90"
                />
                <span
                  aria-hidden
                  className="absolute inset-0 bg-[linear-gradient(to_top,rgba(7,4,3,0.95)_8%,rgba(7,4,3,0.45)_48%,rgba(7,4,3,0.15)_100%)]"
                />
                <div className="relative flex h-full flex-col justify-end p-6 md:p-7">
                  <span className="text-[0.65rem] uppercase tracking-[0.26em] text-gold-400">
                    {item.line}
                  </span>
                  <h3 className="mt-2 text-2xl">{item.name}</h3>
                  <p className="mt-2 max-w-sm text-sm leading-relaxed text-cream-200/75">
                    {item.body}
                  </p>
                  <span
                    aria-hidden
                    className="mt-5 block h-px w-10 origin-left scale-x-100 bg-gold-400/60 transition-transform duration-700 ease-[cubic-bezier(0.16,1,0.3,1)] group-hover:scale-x-[4]"
                  />
                </div>
              </article>
            </li>
          ))}
        </ul>

        <p className="reveal mt-8 text-xs text-mist-500">{products.disclaimer}</p>
      </div>
    </section>
  );
}
