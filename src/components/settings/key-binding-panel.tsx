"use client";

import { useEffect, useState } from "react";
import type { MoveAction } from "@/lib/game/controls";
import { BINDABLE_ACTIONS, BINDING_GROUPS, DEFAULT_BINDINGS, keyLabel, rebind } from "@/lib/game/keybindings";
import { useSettingsStore } from "@/lib/store/settings-store";

/**
 * Tata tombol yang bisa diganti. Klik tombol sebuah aksi, lalu tekan tombol
 * baru; Esc membatalkan. Tombol yang sudah dipakai aksi lain ditukar,
 * sedangkan tombol yang punya tugas tetap (Esc, Tab, M) ditolak dengan pesan.
 */
export function KeyBindingPanel() {
  const bindings = useSettingsStore((state) => state.controls.bindings);
  const setControls = useSettingsStore((state) => state.setControls);
  const resetBindings = useSettingsStore((state) => state.resetBindings);
  const [listening, setListening] = useState<MoveAction | null>(null);
  const [notice, setNotice] = useState<{ tone: "info" | "error"; text: string } | null>(null);

  useEffect(() => {
    if (!listening) return;
    const onKey = (event: KeyboardEvent) => {
      event.preventDefault();
      event.stopImmediatePropagation();
      if (event.code === "Escape") {
        setListening(null);
        setNotice(null);
        return;
      }
      const label = BINDABLE_ACTIONS.find((action) => action.id === listening)?.label ?? listening;
      const result = rebind(useSettingsStore.getState().controls.bindings, listening, event.code);
      if (!result.ok) {
        setNotice({ tone: "error", text: result.reason });
        return;
      }
      setControls({ bindings: result.bindings });
      setListening(null);
      const swapped = result.swappedWith ? BINDABLE_ACTIONS.find((action) => action.id === result.swappedWith) : null;
      setNotice({
        tone: "info",
        text: swapped
          ? `${label} kini ${keyLabel(event.code)}; ${swapped.label} pindah ke ${keyLabel(result.bindings[swapped.id])}.`
          : `${label} kini ${keyLabel(event.code)}.`,
      });
    };
    const cancel = () => setListening(null);
    window.addEventListener("keydown", onKey, { capture: true });
    window.addEventListener("blur", cancel);
    return () => {
      window.removeEventListener("keydown", onKey, { capture: true });
      window.removeEventListener("blur", cancel);
    };
  }, [listening, setControls]);

  const changed = BINDABLE_ACTIONS.some((action) => bindings[action.id] !== DEFAULT_BINDINGS[action.id]);

  return (
    <section aria-labelledby="judul-tata-tombol" className="mt-8">
      <div className="mb-2 flex items-end justify-between gap-3">
        <h2 id="judul-tata-tombol" className="text-[11px] tracking-[0.2em] text-slate-400 uppercase">
          Tata tombol
        </h2>
        {changed ? (
          <button
            type="button"
            onClick={() => {
              resetBindings();
              setListening(null);
              setNotice({ tone: "info", text: "Tata tombol kembali ke bawaan." });
            }}
            className="text-xs text-slate-400 hover:text-slate-200"
          >
            Kembalikan tombol bawaan
          </button>
        ) : null}
      </div>
      <p className="mb-3 text-[11px] text-slate-500">
        Klik tombol sebuah aksi lalu tekan tombol baru. Esc membatalkan. Panah dan papan angka tetap jadi cadangan selama tidak dipakai aksi lain.
      </p>

      <p aria-live="polite" className={`mb-3 min-h-4 text-xs ${notice?.tone === "error" ? "text-rose-300" : "text-emerald-300"}`}>
        {notice?.text}
      </p>

      <div className="space-y-4">
        {BINDING_GROUPS.map((group) => (
          <div key={group.id} className="rounded-xl border border-white/10 bg-slate-900/60">
            <p className="border-b border-white/5 px-4 py-2 text-[10px] tracking-[0.2em] text-slate-500 uppercase">{group.label}</p>
            <ul className="divide-y divide-white/5">
              {BINDABLE_ACTIONS.filter((action) => action.group === group.id).map((action) => {
                const active = listening === action.id;
                const custom = bindings[action.id] !== DEFAULT_BINDINGS[action.id];
                return (
                  <li key={action.id} className="flex items-center justify-between gap-3 px-4 py-2">
                    <span className="text-sm text-slate-200">
                      {action.label}
                      {custom ? <span className="ml-2 text-[10px] text-amber-300">diubah</span> : null}
                    </span>
                    <button
                      type="button"
                      aria-label={`Ganti tombol ${action.label}, sekarang ${keyLabel(bindings[action.id])}`}
                      aria-pressed={active}
                      onClick={() => {
                        setNotice(null);
                        setListening(active ? null : action.id);
                      }}
                      className={`min-w-20 rounded-md border px-3 py-1 font-mono text-xs ${
                        active
                          ? "animate-pulse border-emerald-400 bg-emerald-500/15 text-emerald-200"
                          : "border-white/15 bg-white/5 text-slate-100 hover:border-white/30"
                      }`}
                    >
                      {active ? "Tekan…" : keyLabel(bindings[action.id])}
                    </button>
                  </li>
                );
              })}
            </ul>
          </div>
        ))}
      </div>
    </section>
  );
}
