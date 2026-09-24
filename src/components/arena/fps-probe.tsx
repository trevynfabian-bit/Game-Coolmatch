"use client";

import { useFrame } from "@react-three/fiber";
import { fpsRuntime } from "@/lib/game/fps-runtime";

/** Menghitung frame yang benar-benar digambar kanvas, untuk pengukur FPS. */
export function FpsProbe() {
  useFrame((_state, delta) => {
    fpsRuntime.frames += 1;
    fpsRuntime.worstFrameMs = Math.max(fpsRuntime.worstFrameMs, delta * 1000);
  });
  return null;
}
