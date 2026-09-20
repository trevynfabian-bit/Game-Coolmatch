"use client";

import { useState } from "react";
import { isDefaultCombatMix } from "@/lib/game/combat-audio";
import { isDefaultSettings } from "@/lib/game/settings";
import { isDefaultBindings } from "@/lib/game/keybinds";
import { useKeybindStore } from "@/lib/store/keybind-store";
import { useSettingsStore } from "@/lib/store/settings-store";

/**
 * Mengembalikan SELURUH pengaturan ke bawaan: suara beserta campuran
 * tempurnya, tombol, dan tampilan.
 *
 * Satu tombol untuk semuanya, bukan satu per bagian. Pemain yang menekan
 * "kembalikan" biasanya sedang menyerah pada eksperimennya dan ingin berhenti
 * dari titik nol, bukan ingin memilah bagian mana yang ia sesali. Bagian
 * tombol tetap punya pemulih kecilnya sendiri untuk perbaikan setempat.
 *
 * Meminta konfirmasi, berbeda dengan pengaturan lain di halaman ini yang
 * langsung berlaku. Menggeser volume ke angka yang salah bisa digeser kembali;
 * menghapus seluruh tata tombol yang sudah disetel setengah jam tidak bisa.
 *
 * Tombolnya juga hanya muncul bila memang ADA yang berubah. Tombol yang tidak
 * mengubah apa pun tetap bisa terpencet, dan satu-satunya yang dihasilkannya
 * adalah keraguan: "tadi saya menekan apa, ya?"
 */
export function ResetSettings() {
  const settings = useSettingsStore((state) => state);
  const bindings = useKeybindStore((state) => state.bindings);
  const [bertanya, setBertanya] = useState(false);

  const utuh =
    isDefaultSettings(settings) &&
    isDefaultCombatMix(settings.combatMix) &&
    isDefaultBindings(bindings);
  if (utuh) {
    return (
      <p className="text-[11px] text-slate-600">
        Semua pengaturan masih seperti bawaannya.
      </p>
    );
  }

  if (!bertanya) {
    return (
      <button
        type="button"
        onClick={() => setBertanya(true)}
        className="rounded-lg border border-white/15 px-3 py-1.5 text-[12px] font-medium text-slate-300 transition-colors hover:border-white/30 hover:bg-white/5 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-slate-400"
      >
        Kembalikan semua ke bawaan
      </button>
    );
  }

  return (
    <div className="flex flex-wrap items-center justify-end gap-2">
      <p className="text-[11px] text-amber-200/90">
        Suara, tombol, dan tampilan kembali seperti semula. Yakin?
      </p>
      <button
        type="button"
        autoFocus
        onClick={() => {
          useSettingsStore.getState().resetSettings();
          useKeybindStore.getState().resetAll();
          setBertanya(false);
        }}
        className="rounded-lg border border-amber-400/60 bg-amber-500/10 px-3 py-1.5 text-[12px] font-medium text-amber-200 transition-colors hover:bg-amber-500/20 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-amber-400"
      >
        Ya, kembalikan
      </button>
      <button
        type="button"
        onClick={() => setBertanya(false)}
        className="rounded-lg px-3 py-1.5 text-[12px] text-slate-400 transition-colors hover:text-slate-200 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-slate-400"
      >
        Batal
      </button>
    </div>
  );
}
