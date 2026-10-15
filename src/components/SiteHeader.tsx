"use client";

import { useEffect, useState } from "react";
import { brand, nav } from "@/lib/site";

export function SiteHeader() {
  const [solid, setSolid] = useState(false);
  const [open, setOpen] = useState(false);

  useEffect(() => {
    const onScroll = () => setSolid(window.scrollY > 40);
    onScroll();
    window.addEventListener("scroll", onScroll, { passive: true });
    return () => window.removeEventListener("scroll", onScroll);
  }, []);

  useEffect(() => {
    document.body.style.overflow = open ? "hidden" : "";
    return () => {
      document.body.style.overflow = "";
    };
  }, [open]);

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => e.key === "Escape" && setOpen(false);
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, []);

  return (
    <header
      className={`fixed inset-x-0 top-0 z-50 transition-colors duration-500 ${
        solid
          ? "bg-espresso-950/80 backdrop-blur-md border-b border-white/5"
          : "border-b border-transparent"
      }`}
    >
      <div className="shell flex h-16 items-center justify-between gap-6 md:h-20">
        <a
          href="#topo"
          className="flex items-baseline gap-2 whitespace-nowrap"
          aria-label={`${brand.name} — início`}
        >
          <span className="font-display text-xl tracking-[0.26em] text-cream-50 md:text-2xl">
            {brand.wordmark}
          </span>
          <span className="hidden text-[0.6rem] uppercase tracking-[0.3em] text-gold-400 sm:inline xl:inline">
            {brand.descriptor}
          </span>
        </a>

        <nav aria-label="Seções do site" className="hidden xl:block">
          <ul className="flex items-center gap-6 2xl:gap-8">
            {nav.map((item) => (
              <li key={item.href}>
                <a
                  href={item.href}
                  className="text-[0.72rem] uppercase tracking-[0.22em] text-cream-200/75 transition-colors hover:text-gold-300"
                >
                  {item.label}
                </a>
              </li>
            ))}
          </ul>
        </nav>

        <a href="#contato" className="btn btn-ghost hidden !py-2.5 !text-[0.68rem] xl:inline-flex">
          Falar com a ALVORA
        </a>

        <button
          type="button"
          onClick={() => setOpen((v) => !v)}
          aria-expanded={open}
          aria-controls="menu-mobile"
          className="flex h-11 w-11 shrink-0 items-center justify-center rounded-full border border-white/15 xl:hidden"
        >
          <span className="sr-only">{open ? "Fechar menu" : "Abrir menu"}</span>
          <span aria-hidden className="relative block h-3 w-5">
            <span
              className={`absolute left-0 block h-px w-5 bg-cream-100 transition-transform duration-300 ${
                open ? "top-1.5 rotate-45" : "top-0"
              }`}
            />
            <span
              className={`absolute left-0 block h-px w-5 bg-cream-100 transition-transform duration-300 ${
                open ? "top-1.5 -rotate-45" : "top-3"
              }`}
            />
          </span>
        </button>
      </div>

      <div
        id="menu-mobile"
        hidden={!open}
        className="border-t border-white/5 bg-espresso-950/95 backdrop-blur-xl xl:hidden"
      >
        <nav aria-label="Seções do site (mobile)" className="shell py-6">
          <ul className="flex flex-col gap-1">
            {nav.map((item) => (
              <li key={item.href}>
                <a
                  href={item.href}
                  onClick={() => setOpen(false)}
                  className="block border-b border-white/5 py-4 font-display text-2xl text-cream-100"
                >
                  {item.label}
                </a>
              </li>
            ))}
          </ul>
          <a
            href="#contato"
            onClick={() => setOpen(false)}
            className="btn btn-primary mt-6 w-full justify-center"
          >
            Falar com a ALVORA
          </a>
        </nav>
      </div>
    </header>
  );
}
