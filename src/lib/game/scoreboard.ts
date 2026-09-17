import type { MatchRecord, MatchScoreLine } from "@/types/game";

/**
 * Rasio kill per mati. Pembagi nol diperlakukan sebagai satu, jadi pemain yang
 * belum pernah tumbang tetap mendapat angka yang bisa dibaca alih-alih
 * Infinity — angkanya kebetulan sama dengan jumlah kill-nya, dan itu bacaan
 * yang wajar.
 */
export function killRatio(kills: number, deaths: number): string {
  return (kills / Math.max(1, deaths)).toFixed(2);
}

/**
 * Urutan peringkat akhir sebuah pertandingan: kemenangan ronde lebih dulu
 * karena itulah yang menentukan juara, lalu skor, kill, dan kematian yang
 * lebih sedikit sebagai pemecah seri.
 *
 * Mengembalikan array baru; pemanggil di komponen React membungkusnya dengan
 * useMemo supaya tidak menghasilkan referensi baru tiap render.
 */
export function rankScores(scores: MatchScoreLine[]): MatchScoreLine[] {
  return [...scores].sort(
    (a, b) =>
      b.roundWins - a.roundWins ||
      b.score - a.score ||
      b.kills - a.kills ||
      a.deaths - b.deaths,
  );
}

/** Baris milik pemain yang bermain di perangkat ini, bila ada. */
export function findLocalScore(record: MatchRecord): MatchScoreLine | undefined {
  return record.scores.find((line) => line.isLocal);
}

/** Lama pertandingan dalam detik, dihitung dari selisih waktu mulai dan selesai. */
export function matchDurationSeconds(record: MatchRecord): number {
  return Math.max(0, Math.round((record.endedAt - record.startedAt) / 1000));
}

/** Lama pertandingan sebagai "12 menit 30 detik", atau hanya detik bila kurang semenit. */
export function formatDuration(totalSeconds: number): string {
  const minutes = Math.floor(totalSeconds / 60);
  const seconds = totalSeconds % 60;
  if (minutes === 0) return `${seconds} detik`;
  if (seconds === 0) return `${minutes} menit`;
  return `${minutes} menit ${seconds} detik`;
}

/**
 * Waktu pertandingan dalam format Indonesia.
 *
 * Zona waktunya DIPAKU ke WIB, bukan zona perangkat. Halaman ini dirender di
 * server lebih dulu lalu dihidrasi di browser; kalau zona keduanya berbeda,
 * teks hasil render server dan hasil hidrasi tidak akan sama dan React menolak
 * halamannya. Memakai satu zona tetap membuat keduanya selalu cocok.
 */
const WIB = "Asia/Jakarta";

export function formatMatchTime(epochMs: number): string {
  return new Intl.DateTimeFormat("id-ID", {
    day: "numeric",
    month: "short",
    year: "numeric",
    hour: "2-digit",
    minute: "2-digit",
    timeZone: WIB,
  }).format(new Date(epochMs));
}

export function formatMatchDate(epochMs: number): string {
  return new Intl.DateTimeFormat("id-ID", {
    weekday: "long",
    day: "numeric",
    month: "long",
    year: "numeric",
    timeZone: WIB,
  }).format(new Date(epochMs));
}

/** Rekapitulasi seluruh riwayat pertandingan, dipakai sebagai ikhtisar halaman skor. */
export interface HistorySummary {
  matchesPlayed: number;
  wins: number;
  losses: number;
  draws: number;
  totalKills: number;
  totalDeaths: number;
  /** Persentase kemenangan 0..100, dibulatkan. Nol bila belum pernah bertanding. */
  winRate: number;
}

/**
 * Menjumlahkan perolehan pemain di seluruh pertandingan.
 *
 * Pertandingan yang ditinggal di tengah tetap dihitung sebagai pertandingan
 * yang dimainkan — kill dan matinya benar-benar terjadi — tetapi tidak masuk
 * hitungan menang maupun kalah, sebab juaranya memang tidak pernah ditentukan.
 */
export function summarizeHistory(records: MatchRecord[]): HistorySummary {
  let wins = 0;
  let losses = 0;
  let draws = 0;
  let totalKills = 0;
  let totalDeaths = 0;

  for (const record of records) {
    if (record.result === "menang") wins++;
    else if (record.result === "kalah") losses++;
    else if (record.result === "seri") draws++;

    const local = findLocalScore(record);
    if (!local) continue;
    totalKills += local.kills;
    totalDeaths += local.deaths;
  }

  // Penyebutnya hanya pertandingan yang benar-benar punya hasil; kalau tidak,
  // menyerah di tengah jalan akan terbaca sebagai kekalahan pada persentase.
  const decided = wins + losses + draws;

  return {
    matchesPlayed: records.length,
    wins,
    losses,
    draws,
    totalKills,
    totalDeaths,
    winRate: decided === 0 ? 0 : Math.round((wins / decided) * 100),
  };
}

/** Bentuk terkecil yang cukup untuk mengurutkan klasemen dan mencari puncaknya. */
export interface RankableEntry {
  name: string;
  roundWins: number;
  score: number;
  kills: number;
  deaths: number;
}

/**
 * Nama peserta yang sama-sama berada di puncak klasemen.
 *
 * Satu nama berarti ada juara yang jelas; dua atau lebih berarti benar-benar
 * seri — kemenangan ronde, skor, kill, dan kematiannya sama persis sehingga
 * tidak ada satu pun pemecah kedudukan yang tersisa. Dipakai indikator
 * pemenang untuk menyebutkan SIAPA yang seri, bukan sekadar mengumumkan bahwa
 * pertandingannya seri.
 */
export function findTiedLeaders<T extends RankableEntry>(entries: T[]): string[] {
  if (entries.length === 0) return [];

  const ranked = [...entries].sort(
    (a, b) =>
      b.roundWins - a.roundWins ||
      b.score - a.score ||
      b.kills - a.kills ||
      a.deaths - b.deaths,
  );
  const top = ranked[0];

  return ranked
    .filter(
      (entry) =>
        entry.roundWins === top.roundWins &&
        entry.score === top.score &&
        entry.kills === top.kills &&
        entry.deaths === top.deaths,
    )
    .map((entry) => entry.name);
}
