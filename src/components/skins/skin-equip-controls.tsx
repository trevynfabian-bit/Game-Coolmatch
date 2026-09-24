"use client";

import { useSkinStore } from "@/lib/store/skin-store";
import type { ShopResult } from "@/lib/store/shop-store";
import type { Skin } from "@/types/economy";
import type { Weapon } from "@/types/game";

/**
 * Aksi untuk skin yang sudah dimiliki: pasang di senjata yang sedang dipilih,
 * atau lepas kembali ke cat pabrik. Memasang tidak berbayar dan menggantikan
 * skin lama di senjata itu; skin lama tetap ada di koleksi.
 */
export function SkinEquipControls({
  skin,
  weapon,
  equipped,
  replacing,
  onResult,
}: {
  skin: Skin;
  weapon: Weapon;
  equipped: boolean;
  /** Nama skin lain yang sedang terpasang di senjata ini. */
  replacing: string | null;
  onResult: (result: ShopResult, success: string) => void;
}) {
  const pending = useSkinStore((s) => s.pending);
  const equipSkin = useSkinStore((s) => s.equipSkin);
  const unequipSkin = useSkinStore((s) => s.unequipSkin);
  const processing = pending === `pasang:${weapon.id}`;

  if (equipped) {
    return (
      <div className="mt-4 space-y-2">
        <p className="rounded-lg border border-emerald-400/30 bg-emerald-400/5 px-3 py-2 text-center text-xs text-emerald-200">
          Terpasang di {weapon.name}
        </p>
        <button
          type="button"
          disabled={pending !== null}
          onClick={async () =>
            onResult(await unequipSkin(weapon.id), `${weapon.name} kembali ke cat pabrik.`)
          }
          className="w-full rounded-lg border border-white/15 px-4 py-2 text-xs font-semibold text-slate-300 hover:border-white/30 disabled:opacity-60"
        >
          {processing ? "Memproses…" : "Lepas, kembali ke cat pabrik"}
        </button>
      </div>
    );
  }

  return (
    <div className="mt-4">
      <button
        type="button"
        disabled={pending !== null}
        onClick={async () =>
          onResult(
            await equipSkin(weapon.id, skin.id),
            replacing
              ? `${skin.name} dipasang di ${weapon.name}, menggantikan ${replacing}.`
              : `${skin.name} dipasang di ${weapon.name}.`,
          )
        }
        className="w-full rounded-lg bg-sky-500 px-4 py-2.5 text-sm font-semibold text-slate-950 transition-colors hover:bg-sky-400 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-sky-400 disabled:opacity-60"
      >
        {processing ? "Memproses…" : `Pasang di ${weapon.name}`}
      </button>
      <p className="mt-1.5 text-center text-[11px] text-slate-500">
        {replacing ? `Menggantikan ${replacing}. ` : ""}Sudah ada di koleksimu, gratis dipasang.
      </p>
    </div>
  );
}
