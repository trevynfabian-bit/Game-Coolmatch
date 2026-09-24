"use client";

import Link from "next/link";
import { useState } from "react";
import { keepCursorFree } from "@/lib/game/keep-cursor-free";
import { sessionStats } from "@/lib/game/session-stats";
import { weaponOwnership } from "@/lib/mock/player-weapons";
import { findWeapon } from "@/lib/mock/weapons";
import type { Fighter } from "@/types/game";

/**
 * Ringkasan sesi uji coba di layar akhir: senjata yang dicoba, ketepatan,
 * kena kepala, kerusakan, dan kill — ditandai LATIHAN karena tidak ada yang
 * dicatat ke progres. Bila senjatanya masih terkunci, syarat membukanya
 * ditampilkan supaya pemain tahu apa yang harus dikejar.
 */
export function TrialSummary({ local, weaponId }: { local: Fighter | undefined; weaponId: string }) {
  // Dipotret sekali saat layar akhir muncul; angkanya tidak berubah lagi.
  const [stats] = useState(() => ({ ...sessionStats }));
  const weapon = findWeapon(weaponId);
  const ownership = weaponOwnership(weapon.id);
  const accuracy = stats.shots > 0 ? Math.round((stats.hits / stats.shots) * 100) : 0;

  const rows = [
    { label: "Butir dilepas", value: stats.shots },
    { label: "Ketepatan", value: `${accuracy}%` },
    { label: "Kena kepala", value: stats.headshots },
    { label: "Kerusakan", value: Math.round(stats.damage) },
    { label: "Kill", value: local?.kills ?? 0 },
  ];

  return (
    <section className="mt-4 rounded-xl border border-sky-400/30 bg-sky-400/5 px-4 py-3" aria-labelledby="judul-ringkasan-uji">
      <div className="flex items-center justify-between gap-2">
        <h3 id="judul-ringkasan-uji" className="text-[10px] tracking-[0.2em] text-sky-300 uppercase">
          Ringkasan uji coba · {weapon.name}
        </h3>
        <span className="rounded bg-sky-400/15 px-1.5 py-0.5 text-[9px] font-bold tracking-[0.15em] text-sky-200 uppercase">
          Latihan
        </span>
      </div>
      <dl className="mt-2 grid grid-cols-5 gap-2 text-center">
        {rows.map((row) => (
          <div key={row.label}>
            <dt className="text-[9px] tracking-wider text-slate-500 uppercase">{row.label}</dt>
            <dd className="font-mono text-sm font-semibold text-white tabular-nums">{row.value}</dd>
          </div>
        ))}
      </dl>
      <p className="mt-2 border-t border-white/10 pt-2 text-[11px] text-slate-400">
        Tidak masuk statistik, tidak membuka senjata, tidak memberi koin.
        {ownership.isUnlocked ? null : (
          <>
            {" "}
            Untuk memakainya di pertandingan:{" "}
            <Link href="/senjata" onClick={keepCursorFree} className="text-amber-300 hover:underline">
              {ownership.requirement}
            </Link>
            .
          </>
        )}
      </p>
    </section>
  );
}
