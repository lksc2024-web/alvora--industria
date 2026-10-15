"use client";

import { useEffect, useRef } from "react";
import { useReducedMotion, useScrollProgress } from "@/lib/hooks";

const D =
  "M74 0 C 26 190, 104 360, 58 540 S 8 820, 82 1020 S 110 1260, 52 1460 S 6 1740, 70 1940 S 96 2200, 60 2400";

/**
 * O fio de café não termina na xícara: ele desce pela lateral e costura a
 * seção industrial à seção humana. Fica na calha lateral, nunca sobre o texto,
 * e é inerte a ponteiro e a leitores de tela.
 */
export function CoffeeThread() {
  const wrap = useRef<HTMLDivElement>(null);
  const base = useRef<SVGPathElement>(null);
  const head = useRef<SVGPathElement>(null);
  const len = useRef(0);
  const reduced = useReducedMotion();

  useEffect(() => {
    const p = base.current;
    if (!p) return;
    const total = p.getTotalLength();
    len.current = total;
    p.style.strokeDasharray = `${total}`;
    p.style.strokeDashoffset = reduced ? "0" : `${total}`;
    if (head.current) {
      head.current.style.strokeDasharray = `90 ${total * 2}`;
      head.current.style.strokeDashoffset = reduced ? `${-total}` : "0";
    }
  }, [reduced]);

  useScrollProgress(
    wrap,
    (p) => {
      if (reduced) return;
      const total = len.current;
      if (!total) return;
      if (base.current) {
        base.current.style.strokeDashoffset = `${total * (1 - p)}`;
      }
      if (head.current) {
        head.current.style.strokeDashoffset = `${-(total * p - 90)}`;
        head.current.style.opacity = p > 0.004 && p < 0.996 ? "1" : "0";
      }
    },
    { start: "top bottom", end: "bottom bottom" },
  );

  return (
    // Só a partir de xl, onde a calha lateral (4,5rem) comporta o fio sem
    // encostar no texto em nenhuma largura intermediária.
    <div
      ref={wrap}
      aria-hidden
      className="pointer-events-none absolute inset-y-0 left-0 z-10 hidden w-[72px] select-none opacity-75 xl:block 2xl:w-[92px]"
    >
      <svg
        className="h-full w-full"
        viewBox="0 0 120 2400"
        preserveAspectRatio="none"
        fill="none"
      >
        <defs>
          <linearGradient id="alvora-thread" x1="0" y1="0" x2="0" y2="1">
            <stop offset="0%" stopColor="#1b0d06" />
            <stop offset="18%" stopColor="#6b3a17" />
            <stop offset="55%" stopColor="#b0662f" />
            <stop offset="100%" stopColor="#3b2616" />
          </linearGradient>
        </defs>

        {/* o corpo do líquido */}
        <path
          ref={base}
          d={D}
          stroke="url(#alvora-thread)"
          strokeWidth={9}
          strokeLinecap="round"
          vectorEffect="non-scaling-stroke"
          opacity={0.85}
        />
        {/* reflexo longitudinal: é o que dá viscosidade ao fio */}
        <path
          d={D}
          stroke="#e8be85"
          strokeWidth={1.5}
          strokeLinecap="round"
          vectorEffect="non-scaling-stroke"
          opacity={0.18}
          transform="translate(-2 0)"
        />
        {/* cabeça luminosa, acompanhando a rolagem */}
        <path
          ref={head}
          d={D}
          stroke="#f2d9b0"
          strokeWidth={3.5}
          strokeLinecap="round"
          vectorEffect="non-scaling-stroke"
          opacity={0}
          style={{ filter: "drop-shadow(0 0 7px rgba(216,161,91,0.75))" }}
        />
      </svg>
    </div>
  );
}
