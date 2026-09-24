"use client";

import { useState } from "react";
import { CoinIcon, formatCoins } from "@/components/economy/coin-badge";
import { RARITY_META } from "@/lib/economy/skin-catalog";
import { useSkinStore } from "@/lib/store/skin-store";
import { useWalletStore } from "@/lib/store/wallet-store";
import type { ShopResult } from "@/lib/store/shop-store";
import type { Skin } from "@/types/economy";
import type { Weapon } from "@/types/game";

/**
 * Tombol beli untuk skin yang sedang difokuskan.
 *
 * Dua langkah: klik pertama menampilkan ringkasan (harga, sisa saldo sesudah
 * beli, dan pilihan langsung pasang), klik kedua membayar. Skin mahal seperti
 * gold tidak boleh terbeli karena satu klik nyasar.
 */
export function SkinPurchasePanel({
  skin,
  weapon,
  onResult,
}: {
  skin: Skin;
  weapon: Weapon;
  onResult: (result: ShopResult, success: string) => void;
}) {
  const [confirming, setConfirming] = useState(false);
  const [equipAfter, setEquipAfter] = useState(true);
  const balance = useWalletStore((s) => s.wallet.balance);
  const pending = useSkinStore((s) => s.pending);
  const buySkin = useSkinStore((s) => s.buySkin);

  const affordable = balance >= skin.price;
  const processing = pending === `beli:${skin.id}`;
  const accent = RARITY_META[skin.rarity].color;

  async function confirm() {
    const result = await buySkin(skin.id, equipAfter ? weapon.id : undefined);
    setConfirming(false);
    onResult(
      result,
      equipAfter ? `${skin.name} dibeli dan dipasang di ${weapon.name}.` : `${skin.name} masuk koleksimu.`,
    );
  }

  if (!confirming) {
    return (
      <div className="mt-4">
        <button
          type="button"
          disabled={!affordable || pending !== null}
          onClick={() => setConfirming(true)}
          className="flex w-full items-center justify-center gap-2 rounded-lg bg-amber-400 px-4 py-2.5 text-sm font-semibold text-slate-950 transition-colors hover:bg-amber-300 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-amber-400 disabled:cursor-not-allowed disabled:bg-slate-700 disabled:text-slate-400"
        >
          Beli
          <CoinIcon className="h-4 w-4" />
          <span className="font-mono tabular-nums">{formatCoins(skin.price)}</span>
        </button>
        {!affordable ? (
          <p className="mt-1.5 text-center text-[11px] text-rose-300/90">
            Koin kurang {formatCoins(skin.price - balance)}. Main lagi untuk mengumpulkannya.
          </p>
        ) : null}
      </div>
    );
  }

  return (
    <div className="mt-4 rounded-lg border p-3" style={{ borderColor: `${accent}55`, backgroundColor: `${accent}0d` }}>
      <p className="text-sm font-semibold text-white">Beli {skin.name}?</p>
      <dl className="mt-2 grid grid-cols-2 gap-y-1 text-xs">
        <dt className="text-slate-400">Harga</dt>
        <dd className="text-right font-mono text-amber-200 tabular-nums">{formatCoins(skin.price)}</dd>
        <dt className="text-slate-400">Sisa saldo</dt>
        <dd className="text-right font-mono text-slate-200 tabular-nums">{formatCoins(balance - skin.price)}</dd>
      </dl>
      <label className="mt-3 flex items-center gap-2 text-xs text-slate-300">
        <input
          type="checkbox"
          checked={equipAfter}
          onChange={(event) => setEquipAfter(event.target.checked)}
          className="accent-emerald-400"
        />
        Langsung pasang di {weapon.name}
      </label>
      <div className="mt-3 flex gap-2">
        <button
          type="button"
          onClick={() => setConfirming(false)}
          disabled={processing}
          className="flex-1 rounded-md border border-white/15 px-3 py-2 text-xs font-semibold text-slate-300 hover:border-white/30"
        >
          Batal
        </button>
        <button
          type="button"
          onClick={confirm}
          disabled={processing}
          className="flex-1 rounded-md bg-amber-400 px-3 py-2 text-xs font-semibold text-slate-950 hover:bg-amber-300 disabled:opacity-60"
        >
          {processing ? "Memproses…" : "Ya, beli"}
        </button>
      </div>
    </div>
  );
}
