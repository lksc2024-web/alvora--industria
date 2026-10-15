"use client";

import { useEffect, useState } from "react";

export type MotionPref = "full" | "reduced";

const KEY = "alvora:motion";
const EVENT = "alvora:motion-change";

/**
 * Preferência de movimento, com uma distinção que importa:
 *
 *   "reduced" NÃO remove a narrativa 3D — ela é conduzida pela rolagem do
 *   próprio visitante, ou seja, manipulação direta. O que "reduced" congela é
 *   o movimento autônomo: deriva de câmera, rotação ociosa, partículas em
 *   loop. Nada se move sem que a pessoa mova.
 *
 * O padrão vem de prefers-reduced-motion, mas pode ser trocado no cabeçalho e
 * fica guardado no navegador.
 */
export function useMotionPref(): [MotionPref, (p: MotionPref) => void] {
  const [pref, setPref] = useState<MotionPref>("full");

  useEffect(() => {
    let stored: string | null = null;
    try {
      stored = localStorage.getItem(KEY);
    } catch {
      stored = null;
    }

    if (stored === "full" || stored === "reduced") {
      setPref(stored);
    } else {
      const mq = window.matchMedia("(prefers-reduced-motion: reduce)");
      setPref(mq.matches ? "reduced" : "full");
    }

    const onChange = (e: Event) => {
      const detail = (e as CustomEvent<MotionPref>).detail;
      if (detail === "full" || detail === "reduced") setPref(detail);
    };
    window.addEventListener(EVENT, onChange);
    return () => window.removeEventListener(EVENT, onChange);
  }, []);

  return [pref, setMotionPref];
}

/**
 * Único responsável por espelhar a escolha no <html>, montado uma vez no
 * layout. O hook é usado por meia dúzia de componentes; se cada um escrevesse
 * o atributo, a ordem dos efeitos decidiria o valor final e o CSS acabaria
 * seguindo a instância errada.
 */
export function useMotionAttribute(pref: MotionPref) {
  useEffect(() => {
    document.documentElement.dataset.motion = pref;
  }, [pref]);
}

export function setMotionPref(p: MotionPref) {
  try {
    localStorage.setItem(KEY, p);
  } catch {
    /* modo privado: a escolha vale só para esta sessão */
  }
  window.dispatchEvent(new CustomEvent<MotionPref>(EVENT, { detail: p }));
}
