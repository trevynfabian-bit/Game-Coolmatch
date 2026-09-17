"use client";

import { controlHints } from "@/lib/game/keybinds";
import { useKeybindStore } from "@/lib/store/keybind-store";
import { usePlayerStore } from "@/lib/store/player-store";

/**
 * Panel petunjuk kontrol di dalam permainan. Muncul otomatis beberapa detik saat
 * pemain pertama kali masuk arena, lalu bisa dibuka-tutup kapan saja dengan H.
 * Ditempel di tengah sisi kiri, satu-satunya area HUD yang masih kosong.
 */
export function ControlHints() {
  const isLocked = usePlayerStore((state) => state.isLocked);
  const hintsVisible = usePlayerStore((state) => state.hintsVisible);
  // Dibaca dari tombol pilihan pemain: panel yang membacakan tombol bawaan
  // kepada pemain yang sudah mengubahnya justru menyesatkan.
  const hints = controlHints(useKeybindStore((state) => state.bindings));

  if (!isLocked || !hintsVisible) return null;

  return (
    <div className="pointer-events-none absolute top-1/2 left-4 hidden -translate-y-1/2 sm:block sm:left-5">
      <div className="rounded-lg border border-white/10 bg-slate-950/70 px-3 py-2.5 backdrop-blur-sm">
        <p className="mb-2 text-[10px] tracking-[0.2em] text-slate-400 uppercase">
          Kontrol
        </p>
        <dl className="grid grid-cols-[auto_1fr] gap-x-3 gap-y-1.5">
          {hints.map((hint) => (
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
