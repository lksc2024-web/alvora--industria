"use client";

import { useMotionAttribute, useMotionPref } from "@/lib/motionPref";

/** Escreve `data-motion` no <html>. Montado uma única vez, no layout. */
export function MotionSync() {
  const [pref] = useMotionPref();
  useMotionAttribute(pref);
  return null;
}
