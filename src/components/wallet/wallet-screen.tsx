"use client";

import { CoinBalance } from "@/components/wallet/coin-balance";
import { CoinLedger } from "@/components/wallet/coin-ledger";
import { StatTile } from "@/components/scoreboard/stat-tile";
import { ActionButton, ActionRow } from "@/components/ui/action-button";
import { formatMatchTime } from "@/lib/game/scoreboard";
import { formatCoins, walletSummary } from "@/lib/game/wallet";
import { useCoinEntries } from "@/lib/store/wallet-store";

/**
 * Halaman Dompet Koin: berapa koin yang dimiliki pemain, dan dari mana
 * angka itu datang.
 *
 * Keduanya sengaja satu halaman. Saldo tanpa riwayat adalah angka yang harus
 * dipercaya begitu saja — dan pemain yang merasa koinnya berkurang tanpa sebab
 * tidak punya tempat memeriksanya. Riwayat tanpa saldo memaksanya menjumlah
 * sendiri. Yang berguna justru hubungan keduanya, dan itulah sebabnya tiap
 * baris riwayat ikut menyebutkan saldo sesudahnya: baris teratas selalu sama
 * persis dengan angka besar di kepala halaman.
 *
 * Riwayat awalnya masih tiruan, tetapi pertandingan yang benar-benar dimainkan
 * sesi ini sudah masuk ke dalamnya: pemain yang baru menang lalu membuka
 * halaman ini menemukan baris pertandingannya di paling atas, dengan saldo
 * yang sudah bertambah. Saat layer backend siap, riwayatnya diambil dari tabel
 * transaksi koin — bentuk yang dibaca halaman ini tidak berubah, sebab
 * saldonya memang sudah dijumlahkan dari riwayat sejak sekarang.
 *
 * Halaman ini berjalan di browser karena riwayatnya hidup, dan itu tetap aman:
 * perolehan sesi mulai dari kosong di server maupun di browser, jadi hasil
 * prerender dan hasil hidrasi sama persis.
 */
export function WalletScreen() {
  const entries = useCoinEntries();
  const summary = walletSummary(entries);

  return (
    <div className="mx-auto w-full max-w-3xl px-5 py-10 sm:px-8">
      <header className="mb-8">
        <p className="text-[10px] tracking-[0.3em] text-amber-400 uppercase">
          Ekonomi
        </p>
        <h1 className="mt-2 text-3xl font-bold tracking-tight text-white">
          Dompet Koin
        </h1>
        <p className="mt-2 max-w-xl text-sm leading-relaxed text-slate-400">
          Koin dikumpulkan dari hasil bertanding: menyelesaikan pertandingan,
          menumbangkan lawan, memenangkan ronde, dan merangkai kill tanpa mati.
          Di sini terlihat saldomu sekarang dan tiap koin yang membentuknya.
        </p>
      </header>

      <section className="mb-8">
        <CoinBalance
          balance={summary.balance}
          hint={
            summary.lastAt === null
              ? undefined
              : `Perubahan terakhir ${formatMatchTime(summary.lastAt)} WIB.`
          }
        />

        {/*
          Masuk dan keluar berdiri di sebelah saldo, bukan tersembunyi di dalam
          riwayat. Saldo saja menutupi keduanya: pemain yang sudah mengumpulkan
          ribuan koin lalu menghabiskan hampir semuanya terlihat sama miskin
          dengan pemain yang baru mulai — padahal keduanya berada di tempat
          yang sangat berbeda.
        */}
        <div className="mt-3 grid grid-cols-3 gap-2">
          <StatTile
            label="Total masuk"
            value={formatCoins(summary.earned)}
            accent="text-emerald-300"
          />
          <StatTile
            label="Total keluar"
            value={formatCoins(summary.spent)}
            accent="text-rose-300"
          />
          <StatTile label="Transaksi" value={summary.entries} />
        </div>
      </section>

      <section className="mb-8">
        <h2 className="mb-3 text-[11px] tracking-[0.2em] text-slate-400 uppercase">
          Riwayat transaksi
        </h2>

        {/*
          Daftarnya dipisah sebagai komponennya sendiri karena ia menyimpan
          keadaan: saringan arah dan berapa hari yang sudah dibuka. Halaman ini
          hanya perlu tahu riwayatnya, bukan bagian mana darinya yang sedang
          dilihat pemain.
        */}
        <CoinLedger entries={entries} />

        <p className="mt-3 text-[11px] leading-relaxed text-slate-500">
          Angka kecil di bawah tiap jumlah adalah{" "}
          <span className="text-slate-400">saldo sesudah transaksi itu</span>,
          jadi baris teratas selalu sama dengan saldo di atas.
        </p>
      </section>

      <ActionRow>
        <ActionButton href="/lawan">Bertanding lagi</ActionButton>
        <ActionButton href="/koleksi">Koleksi</ActionButton>
        <ActionButton href="/">Kembali ke menu</ActionButton>
      </ActionRow>
    </div>
  );
}
