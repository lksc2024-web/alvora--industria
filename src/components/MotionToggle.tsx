"use client";

import { useMotionPref } from "@/lib/motionPref";

/**
 * Controle explícito de movimento.
 *
 * Existe porque `prefers-reduced-motion` sozinho é um instrumento grosseiro:
 * no Windows ele fica ligado sempre que as animações do sistema estão
 * desativadas — inclusive quando a pessoa fez isso por desempenho, e não por
 * desconforto. Quem chega assim continua recebendo a narrativa 3D, só que sem
 * movimento autônomo, e pode ligar o resto aqui em um clique.
 */
export function MotionToggle({ full = false }: { full?: boolean }) {
  const [motion, setMotion] = useMotionPref();
  const on = motion === "full";

  return (
    <button
      type="button"
      onClick={() => setMotion(on ? "reduced" : "full")}
      aria-pressed={on}
      title={
        on
          ? "Animações completas — clique para reduzir o movimento"
          : "Movimento reduzido — clique para ativar as animações"
      }
      className={
        full
          ? "flex w-full items-center justify-between gap-3 rounded-full border border-white/15 px-5 py-3 text-[0.7rem] uppercase tracking-[0.18em] text-cream-100 transition-colors hover:border-gold-400/60"
          : "flex items-center gap-2 rounded-full border border-white/15 px-3 py-2 text-[0.62rem] uppercase tracking-[0.16em] text-cream-200/80 transition-colors hover:border-gold-400/60 hover:text-gold-300 xl:px-4"
      }
    >
      <span className="flex items-center gap-2">
        <span
          aria-hidden
          className={`block h-1.5 w-1.5 shrink-0 rounded-full transition-colors duration-500 ${
            on ? "bg-gold-300" : "bg-mist-600"
          }`}
        />
        <span className={full ? "" : "hidden sm:inline"}>Animações</span>
      </span>
      <span
        aria-hidden
        className={`font-display text-[0.8rem] tracking-normal transition-colors duration-500 ${
          on ? "text-gold-300" : "text-mist-500"
        }`}
      >
        {on ? "completas" : "reduzidas"}
      </span>
    </button>
  );
}
