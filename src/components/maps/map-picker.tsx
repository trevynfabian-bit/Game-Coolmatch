"use client";

import Link from "next/link";
import { MapPlan } from "@/components/maps/map-plan";
import { maxBotsForMap } from "@/lib/mock/bots";
import { MOCK_MAPS } from "@/lib/mock/maps";
import { useMatchSetupStore } from "@/lib/store/match-setup-store";

/**
 * Halaman pilih peta: tiap peta tampil dengan denah 2D dari data baloknya,
 * ukuran, dan kapasitas lawannya. Pilihan tersimpan otomatis dan dipakai
 * arena saat pertandingan berikutnya disusun.
 */
export function MapPicker() {
  const mapId = useMatchSetupStore((state) => state.mapId);
  const setMap = useMatchSetupStore((state) => state.setMap);

  return (
    <div className="mx-auto w-full max-w-5xl px-5 py-10 sm:px-8">
      <p className="text-[10px] tracking-[0.3em] text-emerald-400 uppercase">Persiapan bertanding</p>
      <h1 className="mt-2 text-3xl font-bold tracking-tight text-white">Pilih Peta</h1>
      <p className="mt-2 max-w-xl text-sm text-slate-400">
        Tiap arena dibangun dari balok sederhana. Denahnya menunjukkan penghalang dan titik muncul.
      </p>

      <ul className="mt-8 grid gap-4 md:grid-cols-2">
        {MOCK_MAPS.map((map) => {
          const selected = map.id === mapId;
          return (
            <li key={map.id}>
              <button
                type="button"
                onClick={() => setMap(map.id)}
                aria-pressed={selected}
                className={`w-full overflow-hidden rounded-xl border text-left transition-colors focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-emerald-400 ${
                  selected ? "border-emerald-400/70 bg-emerald-500/10" : "border-white/10 bg-slate-900/60 hover:border-white/25"
                }`}
              >
                <span className="block p-3" style={{ backgroundColor: map.skyColor }}>
                  <MapPlan map={map} className="mx-auto aspect-square w-full max-w-xs" />
                </span>
                <span className="block p-4">
                  <span className="flex items-center justify-between gap-2">
                    <span className="text-base font-semibold text-white">{map.name}</span>
                    {selected ? (
                      <span className="rounded bg-emerald-400/15 px-1.5 py-0.5 text-[9px] font-semibold tracking-[0.12em] text-emerald-300 uppercase">
                        Terpilih
                      </span>
                    ) : null}
                  </span>
                  <span className="mt-1 block text-xs leading-relaxed text-slate-400">{map.description}</span>
                  <span className="mt-2 flex gap-3 text-[11px] text-slate-500">
                    <span>
                      {map.floorSize[0]}×{map.floorSize[1]} m
                    </span>
                    <span>·</span>
                    <span>Maks {maxBotsForMap(map)} lawan</span>
                    <span>·</span>
                    <span>{map.blocks.length} balok</span>
                  </span>
                </span>
              </button>
            </li>
          );
        })}
      </ul>

      <div className="mt-8 flex flex-wrap gap-2">
        <Link href="/lawan" className="rounded-lg bg-emerald-500 px-5 py-2.5 text-sm font-semibold text-slate-950 hover:bg-emerald-400">
          Lanjut atur lawan
        </Link>
        <Link href="/" className="rounded-lg px-5 py-2.5 text-sm font-medium text-slate-400 hover:text-slate-200">
          Kembali ke menu
        </Link>
      </div>
    </div>
  );
}
