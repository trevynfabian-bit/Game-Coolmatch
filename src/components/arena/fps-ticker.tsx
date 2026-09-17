"use client";

import { useEffect } from "react";
import { useFrame } from "@react-three/fiber";
import { resetFps, tickFps } from "@/lib/game/fps-runtime";
import { usePlayerStore } from "@/lib/store/player-store";

/**
 * Menghitung frame di dalam kanvas dan menyetorkan rata-ratanya sekali per
 * detik.
 *
 * Harus berada DI DALAM kanvas: hanya di sana `useFrame` ikut jam render
 * three.js, dan jam itulah yang benar-benar ingin diukur pemain. Menghitung
 * dari `requestAnimationFrame` di luar kanvas mengukur laju browser, yang
 * tetap mulus sekalipun adegan 3D-nya tersendat.
 */
export function FpsTicker() {
  useEffect(() => resetFps, []);

  useFrame((_state, delta) => {
    const fps = tickFps(delta);
    if (fps !== null) usePlayerStore.getState().setFps(fps);
  });

  return null;
}
