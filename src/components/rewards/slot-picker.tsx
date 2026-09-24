"use client";

import { useEffect, useRef, useState } from "react";
import { KillstreakIcon } from "@/components/arena/hud/killstreak-tracker";
import { KILLSTREAKS, findKillstreak, type KillstreakId } from "@/lib/game/killstreak";
import type { RewardStatus } from "@/lib/store/killstreak-store";

/**
 * Satu slot loadout (tombol 6/7/8) dengan pemilih hadiah. Klik kartu untuk
 * membuka daftar; hadiah terkunci tampil tapi tidak bisa dipilih, dan hadiah
 * yang sudah ada di slot lain diberi keterangan "tukar".
 */
export function SlotPicker({
  index,
  value,
  slots,
  rewardStatus,
  onChange,
}: {
  index: number;
  value: KillstreakId | null;
  slots: (KillstreakId | null)[];
  rewardStatus: RewardStatus[];
  onChange: (id: KillstreakId | null) => void;
}) {
  const [open, setOpen] = useState(false);
  const rootRef = useRef<HTMLDivElement>(null);
  const reward = value ? findKillstreak(value) : null;

  useEffect(() => {
    if (!open) return;
    const close = (event: MouseEvent | KeyboardEvent) => {
      if (event instanceof KeyboardEvent ? event.key === "Escape" : !rootRef.current?.contains(event.target as Node)) {
        setOpen(false);
      }
    };
    document.addEventListener("mousedown", close);
    document.addEventListener("keydown", close);
    return () => {
      document.removeEventListener("mousedown", close);
      document.removeEventListener("keydown", close);
    };
  }, [open]);

  const choose = (id: KillstreakId | null) => {
    onChange(id);
    setOpen(false);
  };

  return (
    <div ref={rootRef} className="relative">
      <button
        type="button"
        onClick={() => setOpen((v) => !v)}
        aria-haspopup="listbox"
        aria-expanded={open}
        aria-label={`Slot tombol ${6 + index}: ${reward?.name ?? "kosong"}. Ganti hadiah`}
        className="w-full rounded-xl border bg-slate-900/60 p-4 text-left transition-colors hover:bg-slate-900 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-emerald-400"
        style={{ borderColor: reward ? `${reward.color}66` : "rgba(255,255,255,0.1)" }}
      >
        <span className="flex items-center justify-between">
          <span className="rounded bg-white/10 px-2 py-0.5 font-mono text-xs text-white">Tombol {6 + index}</span>
          <span className="text-[11px] text-slate-500">Ganti ▾</span>
        </span>
        {reward ? (
          <span className="mt-4 flex items-center gap-3">
            <span style={{ color: reward.color }}>
              <KillstreakIcon id={reward.id} className="h-8 w-8" />
            </span>
            <span>
              <span className="block text-sm font-semibold text-white">{reward.name}</span>
              <span className="block text-[11px] text-slate-500">
                {reward.kills} kill · {reward.durationSeconds} detik
              </span>
            </span>
          </span>
        ) : (
          <span className="mt-4 block text-sm text-slate-500">Slot kosong</span>
        )}
      </button>

      {open ? (
        <ul
          role="listbox"
          aria-label={`Pilih hadiah untuk tombol ${6 + index}`}
          className="absolute inset-x-0 top-full z-20 mt-1 overflow-hidden rounded-xl border border-white/15 bg-slate-950 shadow-xl"
        >
          {KILLSTREAKS.map((item) => {
            const status = rewardStatus.find((entry) => entry.id === item.id);
            const locked = !(status?.unlocked ?? item.unlockPrice === 0);
            const otherSlot = slots.findIndex((slot, i) => slot === item.id && i !== index);
            return (
              <li key={item.id}>
                <button
                  type="button"
                  role="option"
                  aria-selected={value === item.id}
                  disabled={locked}
                  onClick={() => choose(item.id)}
                  className="flex w-full items-center gap-3 px-3 py-2 text-left hover:bg-white/5 disabled:cursor-not-allowed disabled:opacity-40"
                >
                  <span style={{ color: item.color }}>
                    <KillstreakIcon id={item.id} className="h-5 w-5" />
                  </span>
                  <span className="min-w-0 flex-1">
                    <span className="block truncate text-sm text-white">{item.name}</span>
                    <span className="block text-[10px] text-slate-500">
                      {locked
                        ? "Terkunci"
                        : otherSlot >= 0
                          ? `Tukar dengan tombol ${6 + otherSlot}`
                          : `${item.kills} kill beruntun`}
                    </span>
                  </span>
                  {value === item.id ? <span className="text-xs text-emerald-300">✓</span> : null}
                </button>
              </li>
            );
          })}
          <li className="border-t border-white/10">
            <button
              type="button"
              role="option"
              aria-selected={value === null}
              onClick={() => choose(null)}
              className="w-full px-3 py-2 text-left text-sm text-slate-400 hover:bg-white/5"
            >
              Kosongkan slot
            </button>
          </li>
        </ul>
      ) : null}
    </div>
  );
}
