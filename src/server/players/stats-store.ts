import { eq, sql } from "drizzle-orm";
import type { PlayerProgress } from "@/lib/game/collection";
import { db } from "@/server/db/client";
import { playerStats } from "@/server/db/schema";

/** Sumbangan satu pertandingan terhadap kemajuan seorang pemain. */
export interface MatchContribution {
  /** Kill pemain lokal sepanjang pertandingan. */
  kills: number;
  deaths: number;
  won: boolean;
}

/**
 * Penulis yang boleh dipakai: koneksi biasa atau transaksi yang sedang
 * berjalan. Dibuat longgar sengaja — penambahan kemajuan harus bisa ikut
 * transaksi penutupan pertandingan, supaya pertandingan yang tercatat selesai
 * dan kemajuan yang bertambah tidak pernah terpisah.
 */
type Writer = Pick<typeof db, "insert" | "select">;

/**
 * Menambahkan hasil sebuah pertandingan ke kemajuan seorang pemain.
 *
 * Ditulis sebagai SATU upsert yang menambah di tempat, bukan "baca dulu, lalu
 * tulis kembali jumlahnya". Dua pertandingan yang ditutup hampir bersamaan
 * pada cara kedua akan sama-sama membaca angka lama lalu sama-sama menuliskan
 * angka lama plus satu, dan satu pertandingan hilang dari hitungan tanpa jejak.
 *
 * Angka negatif dijepit ke nol di sini, bukan diteruskan ke database. Batasan
 * CHECK memang akan menolaknya, tetapi penolakan itu muncul sebagai galat
 * penyimpanan yang menggagalkan penutupan pertandingan — padahal yang salah
 * hanya satu angka yang tidak masuk akal, dan pertandingannya sendiri tetap
 * layak dicatat.
 */
export function addMatchToProgress(
  playerId: number,
  contribution: MatchContribution,
  writer: Writer = db,
): void {
  const kills = Math.max(0, Math.round(contribution.kills));
  const deaths = Math.max(0, Math.round(contribution.deaths));
  const wins = contribution.won ? 1 : 0;

  writer
    .insert(playerStats)
    .values({
      playerId,
      matchesPlayed: 1,
      wins,
      totalKills: kills,
      totalDeaths: deaths,
    })
    .onConflictDoUpdate({
      target: playerStats.playerId,
      set: {
        matchesPlayed: sql`${playerStats.matchesPlayed} + 1`,
        wins: sql`${playerStats.wins} + ${wins}`,
        totalKills: sql`${playerStats.totalKills} + ${kills}`,
        totalDeaths: sql`${playerStats.totalDeaths} + ${deaths}`,
        updatedAt: sql`(unixepoch() * 1000)`,
      },
    })
    .run();
}

/**
 * Kemajuan seorang pemain; nol untuk yang belum pernah bertanding.
 *
 * Belum pernah bertanding bukan keadaan galat — layar Koleksi tetap harus bisa
 * menggambar bar kemajuannya dari nol.
 */
export function loadPlayerProgress(playerId: number): PlayerProgress {
  const [row] = db
    .select()
    .from(playerStats)
    .where(eq(playerStats.playerId, playerId))
    .limit(1)
    .all();

  if (!row) return { matchesPlayed: 0, wins: 0, totalKills: 0 };

  return {
    matchesPlayed: row.matchesPlayed,
    wins: row.wins,
    totalKills: row.totalKills,
  };
}

/** Kematian total pemain; tidak ikut `PlayerProgress` yang dipakai klien. */
export function loadTotalDeaths(playerId: number): number {
  const [row] = db
    .select({ totalDeaths: playerStats.totalDeaths })
    .from(playerStats)
    .where(eq(playerStats.playerId, playerId))
    .limit(1)
    .all();
  return row?.totalDeaths ?? 0;
}
