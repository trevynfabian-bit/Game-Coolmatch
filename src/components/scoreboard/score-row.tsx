import { killRatio } from "@/lib/game/scoreboard";
import type { Fighter, MatchScoreLine } from "@/types/game";

/**
 * Satu peserta apa adanya untuk ditampilkan sebagai baris skor.
 *
 * Sengaja bentuk tersendiri, bukan `Fighter` maupun `MatchScoreLine`: baris
 * yang sama dipakai untuk pertandingan yang SEDANG berjalan (sumbernya
 * `Fighter`, punya nyawa dan status hidup) dan yang SUDAH selesai (sumbernya
 * `MatchScoreLine`, tinggal perolehan akhirnya). Menyatukan keduanya di satu
 * tipe tampilan membuat komponen barisnya tidak perlu tahu asal datanya.
 */
export interface ScoreRowEntry {
  id: string;
  name: string;
  /** Warna penanda peserta, sama dengan yang dipakainya di arena. */
  color: string;
  roundWins: number;
  kills: number;
  deaths: number;
  score: number;
  /** Pemain yang bermain di perangkat ini; barisnya disorot. */
  isLocal: boolean;
  /**
   * Sudah tumbang dan sedang menunggu muncul kembali; barisnya diredupkan.
   * Tidak diisi untuk pertandingan yang sudah selesai — di sana status hidup
   * tidak berarti apa-apa lagi.
   */
  isDown?: boolean;
  /**
   * Keterangan bintang di samping nama, misalnya "Juara" atau "Memimpin
   * kemenangan ronde". Kosong berarti tidak ada bintang. Sengaja berupa teks,
   * bukan boolean: artinya berbeda antara pertandingan yang masih berjalan dan
   * yang sudah selesai, dan teks itu juga jadi tooltip-nya.
   */
  starTitle?: string | null;
}

/**
 * Baris skor dari seorang petarung.
 *
 * `matchEnded` mematikan peredupan baris peserta yang sedang tumbang: selama
 * pertandingan berjalan itu keterangan berguna — pemain tahu siapa yang sedang
 * menunggu muncul kembali — tetapi pada klasemen akhir status hidup tidak lagi
 * berarti apa pun, dan meredupkan seseorang hanya karena ia kebetulan tumbang
 * pada detik terakhir justru membuat klasemennya salah baca.
 */
export function scoreRowFromFighter(
  fighter: Fighter,
  options: { starTitle?: string | null; matchEnded?: boolean } = {},
): ScoreRowEntry {
  return {
    id: fighter.id,
    name: fighter.name,
    color: fighter.color,
    roundWins: fighter.roundWins,
    kills: fighter.kills,
    deaths: fighter.deaths,
    score: fighter.score,
    isLocal: fighter.isLocal,
    isDown: options.matchEnded ? false : !fighter.isAlive,
    starTitle: options.starTitle ?? null,
  };
}

/** Baris skor dari perolehan akhir peserta pertandingan yang sudah selesai. */
export function scoreRowFromLine(line: MatchScoreLine): ScoreRowEntry {
  return {
    id: line.id,
    name: line.participantName,
    color: line.color,
    roundWins: line.roundWins,
    kills: line.kills,
    deaths: line.deaths,
    score: line.score,
    isLocal: line.isLocal,
    starTitle: line.isWinner ? "Juara" : null,
  };
}

/**
 * Kepala tabel skor. Ditaruh sekali di sini bersama barisnya supaya kolom
 * keduanya tidak bisa berselisih: menambah kolom di baris tanpa menambahnya di
 * kepala adalah kesalahan yang mudah lolos kalau keduanya hidup di berkas
 * berbeda.
 *
 * `rank` menentukan apakah kolom pertama diberi nomor peringkat. Papan skor di
 * dalam arena tidak memakainya — di tengah pertandingan urutannya masih
 * berubah-ubah sehingga nomor justru menyesatkan — sedangkan klasemen akhir
 * memakainya.
 */
export function ScoreTableHead({ rank = false }: { rank?: boolean }) {
  return (
    <thead>
      <tr className="text-[10px] tracking-[0.15em] text-slate-500 uppercase">
        <th className="px-4 py-2 font-medium">{rank ? "Peringkat" : "Pemain"}</th>
        <th className="w-14 px-2 py-2 text-right font-medium">Ronde</th>
        <th className="w-12 px-2 py-2 text-right font-medium">Kill</th>
        <th className="w-12 px-2 py-2 text-right font-medium">Mati</th>
        <th className="w-14 px-2 py-2 text-right font-medium">K/M</th>
        <th className="w-16 px-4 py-2 text-right font-medium">Skor</th>
      </tr>
    </thead>
  );
}

/**
 * Satu baris papan skor: nama peserta beserta penanda warnanya, lalu
 * kemenangan ronde, kill, mati, rasio, dan skor.
 *
 * Kolom ronde ditaruh paling depan dan diberi warna paling menonjol karena
 * itulah yang menentukan juara; sisanya adalah rinciannya.
 *
 * Dipakai bersama oleh papan skor Tab di dalam arena, layar akhir
 * pertandingan, dan halaman Skor Pertandingan. Papan skor ringkas di pojok HUD
 * dan klasemen di jeda antar ronde TIDAK memakainya: keduanya bukan tabel dan
 * hanya menampilkan sebagian kolom, jadi memaksakan bentuk yang sama justru
 * merusak keduanya.
 */
export function ScoreRow({
  entry,
  rank,
}: {
  entry: ScoreRowEntry;
  /** Nomor peringkat; kosongkan untuk papan skor yang urutannya belum tetap. */
  rank?: number;
}) {
  return (
    <tr
      className={`border-t border-white/5 ${entry.isLocal ? "bg-sky-500/10" : ""} ${
        entry.isDown ? "opacity-55" : ""
      }`}
    >
      <td className="px-4 py-2">
        <span className="flex min-w-0 items-center gap-2">
          {rank === undefined ? null : (
            <span className="w-4 font-mono text-xs text-slate-500 tabular-nums">
              {rank}
            </span>
          )}
          <span
            className="h-2 w-2 shrink-0 rounded-full"
            style={{ backgroundColor: entry.color }}
            aria-hidden
          />
          <span
            className={`truncate text-sm ${
              entry.isLocal ? "font-semibold text-sky-200" : "text-slate-200"
            }`}
          >
            {entry.name}
          </span>
          {entry.starTitle ? (
            <span className="text-[10px] text-amber-300" title={entry.starTitle}>
              ★
            </span>
          ) : null}
        </span>
      </td>
      <td className="px-2 py-2 text-right font-mono text-sm font-semibold text-amber-300 tabular-nums">
        {entry.roundWins}
      </td>
      <td className="px-2 py-2 text-right font-mono text-sm text-slate-100 tabular-nums">
        {entry.kills}
      </td>
      <td className="px-2 py-2 text-right font-mono text-sm text-slate-500 tabular-nums">
        {entry.deaths}
      </td>
      <td className="px-2 py-2 text-right font-mono text-sm text-slate-400 tabular-nums">
        {killRatio(entry.kills, entry.deaths)}
      </td>
      <td className="px-4 py-2 text-right font-mono text-sm text-slate-100 tabular-nums">
        {entry.score}
      </td>
    </tr>
  );
}
