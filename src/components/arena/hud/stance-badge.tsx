"use client";

import { usePlayerStore } from "@/lib/store/player-store";

/** Penanda kecil di atas panel nyawa: sedang lari atau sedang di udara. */
export function StanceBadge() {
  const isSprinting = usePlayerStore((state) => state.isSprinting);
  const isAirborne = usePlayerStore((state) => state.isAirborne);
  const isLocked = usePlayerStore((state) => state.isLocked);

  if (!isLocked || (!isSprinting && !isAirborne)) return null;

  const label = isAirborne ? "Di udara" : "Lari";

  return (
    <span className="pointer-events-none absolute bottom-[8.5rem] left-4 rounded-full border border-emerald-400/30 bg-emerald-950/60 px-2.5 py-0.5 text-[10px] tracking-[0.15em] text-emerald-300 uppercase backdrop-blur-sm sm:bottom-[9.5rem] sm:left-5">
      {label}
    </span>
  );
}
