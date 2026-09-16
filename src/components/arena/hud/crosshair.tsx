"use client";

import { useEffect } from "react";
import { useCombatStore } from "@/lib/store/combat-store";

/** Lama penanda kena tampil, harus sejalan dengan keyframe hit-marker. */
const HIT_MARKER_MS = 340;

const TICK = "absolute bg-emerald-300/90 shadow-[0_0_4px_rgba(16,185,129,0.8)]";

/**
 * Crosshair dinamis. Celah tiap sirip dibaca dari custom property CSS
 * `--crosshair-gap` yang ditulis sistem senjata tiap frame, jadi lebarnya
 * benar-benar menggambarkan sebaran peluru saat ini tanpa memicu render ulang
 * React. Saat tembakan mengenai petarung, penanda X berkelip di atasnya.
 */
export function Crosshair() {
  const hitMarker = useCombatStore((state) => state.hitMarker);
  const clearHitMarker = useCombatStore((state) => state.clearHitMarker);

  useEffect(() => {
    if (!hitMarker) return;
    const id = setTimeout(() => clearHitMarker(hitMarker.id), HIT_MARKER_MS);
    return () => clearTimeout(id);
  }, [hitMarker, clearHitMarker]);

  return (
    <div className="pointer-events-none absolute inset-0">
      <div className="absolute top-1/2 left-1/2">
        <span
          className={`${TICK} h-0.5 w-2`}
          style={{
            transform:
              "translate(-100%, -50%) translateX(calc(-1 * var(--crosshair-gap)))",
          }}
        />
        <span
          className={`${TICK} h-0.5 w-2`}
          style={{
            transform: "translate(0, -50%) translateX(var(--crosshair-gap))",
          }}
        />
        <span
          className={`${TICK} h-2 w-0.5`}
          style={{
            transform:
              "translate(-50%, -100%) translateY(calc(-1 * var(--crosshair-gap)))",
          }}
        />
        <span
          className={`${TICK} h-2 w-0.5`}
          style={{
            transform: "translate(-50%, 0) translateY(var(--crosshair-gap))",
          }}
        />
        <span
          className="absolute h-0.5 w-0.5 rounded-full bg-emerald-200"
          style={{ transform: "translate(-50%, -50%)" }}
        />

        {hitMarker ? (
          <span
            key={hitMarker.id}
            className="absolute"
            style={{
              transform: "translate(-50%, -50%)",
              animation: `hit-marker ${HIT_MARKER_MS}ms ease-out forwards`,
            }}
            aria-hidden
          >
            <svg width="26" height="26" viewBox="0 0 26 26" fill="none">
              {[
                "M5 5 L9 9",
                "M21 5 L17 9",
                "M5 21 L9 17",
                "M21 21 L17 17",
              ].map((d) => (
                <path
                  key={d}
                  d={d}
                  stroke={hitMarker.isHeadshot ? "#fbbf24" : "#f8fafc"}
                  strokeWidth="2"
                  strokeLinecap="round"
                />
              ))}
            </svg>
          </span>
        ) : null}
      </div>
    </div>
  );
}
