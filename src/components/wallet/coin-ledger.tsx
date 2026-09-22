"use client";

import { useMemo, useState } from "react";
import { CoinEntryRow } from "@/components/wallet/coin-entry-row";
import { formatMatchDate } from "@/lib/game/scoreboard";
import {
  LEDGER_FILTER_LABEL,
  ledgerDays,
  signedCoins,
  type CoinEntry,
  type LedgerFilter,
} from "@/lib/game/wallet";

/** Berapa hari yang ditampilkan sebelum pemain meminta lebih. */
const HARI_AWAL = 4;
/** Berapa hari tambahan tiap kali tombolnya ditekan. */
const HARI_TAMBAHAN = 6;

const SARINGAN: LedgerFilter[] = ["semua", "masuk", "keluar"];

/**
 * Daftar riwayat transaksi koin.
 *
 * Satu-satunya bagian halaman dompet yang harus berjalan di browser, jadi ia
 * dipisah sendiri dan sisa halamannya tetap komponen server: saldo, ikhtisar,
 * dan judulnya ikut terprerender dan terbaca bahkan sebelum berkas skripnya
 * selesai diunduh.
 *
 * Dua hal yang membuat daftar ini bisa dipakai pada riwayat yang panjang.
 *
 * SARINGAN ARAH menjawab pertanyaan yang sebenarnya dibawa pemain ke halaman
 * ini. Hampir tidak ada yang membuka dompet untuk membaca dua puluh empat
 * baris berurutan; yang ia cari biasanya satu hal — "ke mana koinku pergi" —
 * dan itu pertanyaan tentang pengeluaran saja.
 *
 * POTONGAN HARI menjaga halaman tetap sependek yang berguna. Dipotong per
 * HARI, bukan per baris, karena satu hari yang terpotong separuh membacakan
 * selisih harian yang tidak cocok dengan baris yang terlihat di bawahnya.
 */
export function CoinLedger({ entries }: { entries: readonly CoinEntry[] }) {
  const [filter, setFilter] = useState<LedgerFilter>("semua");
  const [batas, setBatas] = useState(HARI_AWAL);

  const days = useMemo(() => ledgerDays(entries, filter), [entries, filter]);
  const terlihat = days.slice(0, batas);
  const sisa = days.length - terlihat.length;

  return (
    <div>
      <div
        className="flex flex-wrap items-center gap-1.5"
        role="group"
        aria-label="Saring riwayat koin"
      >
        {SARINGAN.map((pilihan) => {
          const aktif = pilihan === filter;
          return (
            <button
              key={pilihan}
              type="button"
              aria-pressed={aktif}
              onClick={() => {
                setFilter(pilihan);
                // Batasnya disetel ulang: saringan baru adalah daftar baru,
                // dan meneruskan batas lama membuat pemain melihat lebih
                // sedikit hari daripada yang baru saja ia minta.
                setBatas(HARI_AWAL);
              }}
              className={`rounded-full border px-3 py-1 text-[11px] transition-colors focus-visible:outline-2 focus-visible:outline-offset-2 ${
                aktif
                  ? "border-amber-400/40 bg-amber-400/15 text-amber-200 focus-visible:outline-amber-400"
                  : "border-white/15 text-slate-300 hover:border-white/30 hover:bg-white/5 focus-visible:outline-slate-400"
              }`}
            >
              {LEDGER_FILTER_LABEL[pilihan]}
            </button>
          );
        })}
      </div>

      {days.length === 0 ? (
        /*
          Kosong karena saringan bukan keadaan yang sama dengan dompet yang
          memang belum pernah dipakai, jadi kalimatnya pun berbeda: yang satu
          mengarahkan pemain bertanding, yang satu mengarahkannya melepas
          saringan.
        */
        <p className="mt-3 rounded-lg border border-white/10 bg-slate-900/40 px-4 py-6 text-center text-sm text-slate-400">
          {filter === "keluar"
            ? "Belum ada koin yang dibelanjakan."
            : "Belum ada koin yang masuk."}
        </p>
      ) : (
        <div className="mt-3 space-y-5">
          {terlihat.map((day) => (
            <div key={day.key}>
              {/*
                Selisih harian ikut ditulis di kepala tiap hari. Pemain
                mengingat koinnya dalam satuan sesi bermain — "tadi malam aku
                dapat berapa" — bukan dalam satuan transaksi.
              */}
              <div className="flex items-baseline justify-between gap-2">
                <h3 className="text-[11px] text-slate-400">
                  {formatMatchDate(day.at)}
                </h3>
                <p
                  className={`font-mono text-[11px] font-semibold tabular-nums ${
                    day.net < 0 ? "text-rose-300/80" : "text-emerald-300/80"
                  }`}
                >
                  {signedCoins(day.net)}
                </p>
              </div>

              <ul className="mt-1 rounded-lg border border-white/10 bg-slate-900/40 px-4">
                {day.rows.map((row) => (
                  <CoinEntryRow key={row.id} row={row} />
                ))}
              </ul>
            </div>
          ))}
        </div>
      )}

      {sisa > 0 ? (
        <button
          type="button"
          onClick={() => setBatas((kini) => kini + HARI_TAMBAHAN)}
          className="mt-4 w-full rounded-lg border border-white/15 px-4 py-2 text-xs text-slate-300 transition-colors hover:border-white/30 hover:bg-white/5 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-slate-400"
        >
          Tampilkan {Math.min(sisa, HARI_TAMBAHAN)} hari lagi
          <span className="text-slate-600"> · </span>
          <span className="font-mono tabular-nums">{sisa}</span> hari tersisa
        </button>
      ) : null}
    </div>
  );
}
