import { CoinBalance } from "@/components/wallet/coin-balance";
import { CoinEntryRow } from "@/components/wallet/coin-entry-row";
import { StatTile } from "@/components/scoreboard/stat-tile";
import { ActionButton, ActionRow } from "@/components/ui/action-button";
import { formatMatchDate, formatMatchTime } from "@/lib/game/scoreboard";
import {
  formatCoins,
  ledgerDays,
  signedCoins,
  walletSummary,
} from "@/lib/game/wallet";
import { MOCK_COIN_ENTRIES } from "@/lib/mock/wallet";

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
 * Sumber datanya masih tiruan. Saat layer backend siap, riwayatnya diambil
 * dari tabel transaksi koin — bentuk yang dibaca halaman ini tidak berubah,
 * sebab saldonya memang sudah dijumlahkan dari riwayat sejak sekarang.
 */
export function WalletScreen() {
  const entries = MOCK_COIN_ENTRIES;
  const summary = walletSummary(entries);
  const days = ledgerDays(entries);

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

        {days.length === 0 ? (
          /*
            Dompet kosong bukan keadaan galat, jadi ia tidak diperlakukan
            seperti galat. Yang dibutuhkan pemain di sini bukan permintaan maaf
            melainkan arah: koin pertamanya datang dari pertandingan pertama.
          */
          <div className="rounded-lg border border-white/10 bg-slate-900/40 px-4 py-6 text-center">
            <p className="text-sm text-slate-300">Belum ada koin yang masuk.</p>
            <p className="mt-1 text-[11px] text-slate-500">
              Selesaikan satu pertandingan untuk mendapatkan koin pertamamu.
            </p>
          </div>
        ) : (
          <div className="space-y-5">
            {days.map((day) => (
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
