"use client";

import { CONTROL_HINTS } from "@/lib/game/controls";
import { usePlayerStore } from "@/lib/store/player-store";

/**
 * Panel petunjuk kontrol di dalam permainan. Muncul otomatis beberapa detik saat
 * pemain pertama kali masuk arena, lalu bisa dibuka-tutup kapan saja dengan H.
 * Di layar lebar ditempel di tengah sisi kiri dengan dua kolom supaya pendek
 * dan tidak menabrak papan skor maupun panel nyawa; di layar sempit satu
 * kolom di bawah header (papan skor memang tersembunyi di sana), dan di layar
 * rendah diperkecil supaya tetap jauh dari crosshair.
 */
export function ControlHints() {
  const isLocked = usePlayerStore((state) => state.isLocked);
  const hintsVisible = usePlayerStore((state) => state.hintsVisible);

  if (!isLocked || !hintsVisible) return null;

  return (
    <div className="pointer-events-none absolute top-24 left-4 hidden origin-top-left sm:block sm:left-5 lg:top-[55%] lg:-translate-y-1/2 [@media(max-height:600px)]:scale-90">
      <div className="rounded-lg border border-white/10 bg-slate-950/70 px-3 py-2.5 backdrop-blur-sm">
        <p className="mb-2 text-[10px] tracking-[0.2em] text-slate-400 uppercase">
          Kontrol
        </p>
        <dl className="grid grid-cols-[auto_1fr] gap-x-2.5 gap-y-1 lg:grid-cols-[auto_1fr_auto_1fr] lg:gap-y-1.5">
          {CONTROL_HINTS.map((hint) => (
            <div key={hint.keys} className="contents">
              <dt className="rounded border border-white/15 bg-white/5 px-1.5 py-0.5 text-center font-mono text-[10px] whitespace-nowrap text-slate-200">
                {hint.keys}
              </dt>
              <dd className="self-center text-[11px] whitespace-nowrap text-slate-400">
                {hint.label}
              </dd>
            </div>
          ))}
        </dl>
      </div>
    </div>
  );
}
