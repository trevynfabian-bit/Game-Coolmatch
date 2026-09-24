"use client";

import { useEffect, useState } from "react";
import { fpsRuntime } from "@/lib/game/fps-runtime";

const SAMPLE_MS = 500;

/**
 * Pengukur FPS real-time di pojok HUD: frame per detik rata-rata setengah
 * detik terakhir, plus frame terlambat terpanjang. Hijau ≥ 55, kuning ≥ 30,
 * merah di bawahnya.
 */
export function FpsMeter() {
  const [sample, setSample] = useState<{ fps: number; worst: number } | null>(null);

  useEffect(() => {
    fpsRuntime.frames = 0;
    fpsRuntime.worstFrameMs = 0;
    fpsRuntime.since = performance.now();
    const timer = setInterval(() => {
      const now = performance.now();
      const elapsed = now - fpsRuntime.since;
      if (elapsed <= 0) return;
      setSample({ fps: Math.round((fpsRuntime.frames * 1000) / elapsed), worst: Math.round(fpsRuntime.worstFrameMs) });
      fpsRuntime.frames = 0;
      fpsRuntime.worstFrameMs = 0;
      fpsRuntime.since = now;
    }, SAMPLE_MS);
    return () => clearInterval(timer);
  }, []);

  if (!sample) return null;
  const color = sample.fps >= 55 ? "text-emerald-300" : sample.fps >= 30 ? "text-amber-300" : "text-rose-400";

  return (
    <div
      className="pointer-events-none absolute top-1 left-1/2 hidden -translate-x-1/2 translate-y-[4.6rem] font-mono text-[10px] text-slate-500 sm:block"
      aria-label={`${sample.fps} frame per detik`}
    >
      <span className={`font-semibold tabular-nums ${color}`}>{sample.fps}</span> FPS
      <span className="text-slate-700"> · </span>
      <span className="tabular-nums">{sample.worst} ms</span>
    </div>
  );
}
