"use client";

import { useState } from "react";
import { CoinIcon, formatCoins } from "@/components/economy/coin-badge";
import { useShopStore, type ShopResult } from "@/lib/store/shop-store";
import type { Attachment, WeaponUpgradeState } from "@/types/economy";

const BUTTON =
  "rounded-md px-3 py-1 text-[11px] font-semibold transition-colors focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-emerald-400 disabled:cursor-not-allowed disabled:opacity-50";

/**
 * Satu attachment di toko beserta aksinya.
 *
 * Membeli butuh dua klik — klik pertama mengubah tombol menjadi konfirmasi
 * berharga — supaya koin tidak hilang karena salah klik. Barang yang sudah
 * dimiliki bisa dipasang atau dilepas tanpa biaya; memasang di slot yang
 * sudah terisi otomatis menggantikan attachment lama di slot itu.
 */
export function AttachmentRow({
  attachment,
  state,
  balance,
  replacing,
  onResult,
}: {
  attachment: Attachment;
  state: WeaponUpgradeState;
  balance: number;
  /** Nama attachment lain yang sedang terpasang di slot yang sama. */
  replacing: string | null;
  onResult: (result: ShopResult, success: string) => void;
}) {
  const [confirming, setConfirming] = useState(false);
  const pending = useShopStore((s) => s.pending);
  const buyAttachment = useShopStore((s) => s.buyAttachment);
  const equipAttachment = useShopStore((s) => s.equipAttachment);
  const unequipSlot = useShopStore((s) => s.unequipSlot);

  const owned = state.ownedAttachmentIds.includes(attachment.id);
  const equipped = state.equipped[attachment.slot] === attachment.id;
  const affordable = balance >= attachment.price;
  const busy = pending !== null;

  async function buy() {
    if (!confirming) {
      setConfirming(true);
      return;
    }
    setConfirming(false);
    const result = await buyAttachment(state.weaponId, attachment.id);
    onResult(result, `${attachment.name} dibeli dan langsung dipasang.`);
  }

  return (
    <li
      className={`flex flex-wrap items-center justify-between gap-3 rounded-lg border px-3 py-2.5 ${
        equipped ? "border-emerald-400/40 bg-emerald-500/5" : "border-white/10 bg-slate-900/50"
      }`}
    >
      <div className="min-w-0 flex-1">
        <p className="flex items-center gap-1.5 text-sm font-medium text-slate-100">
          {attachment.name}
          {equipped ? (
            <span className="rounded bg-emerald-400/15 px-1.5 py-0.5 text-[9px] font-semibold tracking-[0.12em] text-emerald-300 uppercase">
              Terpasang
            </span>
          ) : owned ? (
            <span className="rounded bg-sky-400/15 px-1.5 py-0.5 text-[9px] font-semibold tracking-[0.12em] text-sky-300 uppercase">
              Dimiliki
            </span>
          ) : null}
        </p>
        <p className="mt-0.5 text-[11px] leading-relaxed text-slate-400">{attachment.description}</p>
      </div>

      <div className="flex shrink-0 items-center gap-2">
        {owned ? (
          equipped ? (
            <button
              type="button"
              disabled={busy}
              onClick={async () =>
                onResult(await unequipSlot(state.weaponId, attachment.slot), `${attachment.name} dilepas.`)
              }
              className={`${BUTTON} border border-white/15 text-slate-300 hover:border-white/30`}
            >
              Lepas
            </button>
          ) : (
            <button
              type="button"
              disabled={busy}
              title={replacing ? `Menggantikan ${replacing}` : undefined}
              onClick={async () =>
                onResult(
                  await equipAttachment(state.weaponId, attachment.id),
                  replacing
                    ? `${attachment.name} dipasang menggantikan ${replacing}.`
                    : `${attachment.name} dipasang.`,
                )
              }
              className={`${BUTTON} bg-sky-500/90 text-slate-950 hover:bg-sky-400`}
            >
              {replacing ? "Ganti" : "Pasang"}
            </button>
          )
        ) : (
          <>
            {confirming ? (
              <button
                type="button"
                onClick={() => setConfirming(false)}
                className={`${BUTTON} text-slate-400 hover:text-slate-200`}
              >
                Batal
              </button>
            ) : null}
            <button
              type="button"
              disabled={busy || !affordable}
              onClick={buy}
              onBlur={() => setConfirming(false)}
              title={affordable ? undefined : `Koin kurang ${attachment.price - balance}`}
              className={`${BUTTON} inline-flex items-center gap-1 ${
                confirming
                  ? "bg-amber-400 text-slate-950 hover:bg-amber-300"
                  : "border border-amber-400/30 text-amber-200 hover:border-amber-400/60"
              }`}
            >
              {confirming ? "Yakin, beli" : "Beli"}
              <CoinIcon className="h-3 w-3" />
              <span className="font-mono tabular-nums">{formatCoins(attachment.price)}</span>
            </button>
          </>
        )}
      </div>
    </li>
  );
}
