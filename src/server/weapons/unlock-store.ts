import { and, eq, sql } from "drizzle-orm";
import type { PlayerProgress } from "@/lib/game/collection";
import {
  WEAPON_UNLOCK_RULES,
  weaponsUnlockedBy,
} from "@/lib/game/weapon-unlock-rules";
import { db } from "@/server/db/client";
import { playerStats, playerWeapons } from "@/server/db/schema";
import { ensureWeaponCatalogue } from "@/server/weapons/weapon-store";

/** Kemajuan pemain yang belum pernah bertanding. */
const KOSONG: PlayerProgress = {
  matchesPlayed: 0,
  wins: 0,
  totalKills: 0,
};

/**
 * Kemajuan bermain seorang pemain.
 *
 * Pemain yang belum punya baris progres mendapat angka NOL, bukan jawaban
 * kosong. Belum pernah bertanding bukan keadaan galat — layar Koleksi tetap
 * harus bisa menggambar bar kemajuannya dari nol — dan baris progresnya sendiri
 * baru ditulis saat pertandingan pertama selesai.
 */
export function readPlayerProgress(playerId: number): PlayerProgress {
  const [row] = db
    .select()
    .from(playerStats)
    .where(eq(playerStats.playerId, playerId))
    .limit(1)
    .all();

  if (!row) return { ...KOSONG };

  return {
    matchesPlayed: row.matchesPlayed,
    wins: row.wins,
    totalKills: row.totalKills,
  };
}

/** Senjata yang sudah tercatat terbuka untuk seorang pemain, urut katalog. */
export function readUnlockedWeaponIds(playerId: number): string[] {
  const rows = db
    .select({ weaponId: playerWeapons.weaponId })
    .from(playerWeapons)
    .where(
      and(
        eq(playerWeapons.playerId, playerId),
        eq(playerWeapons.isUnlocked, true),
      ),
    )
    .all();

  const dimiliki = new Set(rows.map((row) => row.weaponId));
  // Diurutkan mengikuti katalog, bukan urutan baris di database: layar Koleksi
  // menampilkannya sebagai daftar, dan daftar yang urutannya berubah-ubah
  // menurut kapan sesuatu terbuka lebih sulit dipindai.
  return WEAPON_UNLOCK_RULES.filter((rule) => dimiliki.has(rule.weaponId)).map(
    (rule) => rule.weaponId,
  );
}

export interface UnlockEvaluation {
  /** Kemajuan yang dipakai menilai. */
  progress: PlayerProgress;
  /** Seluruh senjata yang dimiliki pemain sesudah penilaian ini. */
  unlocked: string[];
  /** Yang baru saja diberikan oleh panggilan ini; kosong bila tidak ada. */
  newlyUnlocked: string[];
}

/**
 * Menilai syarat buka senjata seorang pemain, lalu mencatat yang baru
 * terpenuhi.
 *
 * Inti layanannya adalah SELISIH dua daftar: apa yang berhak dimiliki pemain
 * menurut kemajuannya sekarang, dikurangi apa yang sudah pernah diberikan
 * kepadanya. Selisih itulah yang baru terbuka — dan karena yang dibandingkan
 * adalah catatan kepemilikan, bukan kemajuan sebelum dan sesudah, hasilnya
 * tetap benar walau penilaiannya dipanggil berkali-kali atau terlewat
 * beberapa kali. Pemain yang kemajuannya melompat jauh karena penilaian
 * sempat gagal tetap menerima seluruh senjatanya sekaligus, bukan kehilangan
 * yang terlewat.
 *
 * Pemanggilan kedua untuk kemajuan yang sama mengembalikan `newlyUnlocked`
 * kosong. Itu yang membuatnya aman dipanggil dari mana saja — termasuk dari
 * pembacaan biasa layar Koleksi — tanpa menghasilkan perayaan berulang.
 *
 * Katalog senjata dipastikan ada lebih dulu: kunci asing `player_weapons`
 * menolak senjata yang belum tercatat, dan kegagalan itu akan muncul sebagai
 * galat penyimpanan yang membingungkan alih-alih katalog yang belum siap.
 */
export function evaluateWeaponUnlocks(playerId: number): UnlockEvaluation {
  ensureWeaponCatalogue();

  const progress = readPlayerProgress(playerId);
  const berhak = weaponsUnlockedBy(progress);
  const dimiliki = readUnlockedWeaponIds(playerId);
  const sudah = new Set(dimiliki);
  const baru = berhak.filter((weaponId) => !sudah.has(weaponId));

  if (baru.length === 0) {
    return { progress, unlocked: dimiliki, newlyUnlocked: [] };
  }

  const now = Date.now();

  db.transaction((tx) => {
    for (const weaponId of baru) {
      /*
        Upsert, bukan insert biasa. Baris bisa sudah ada dalam keadaan
        terkunci — bentuk yang memang diizinkan skema — dan dua permintaan
        yang datang hampir bersamaan juga bisa sama-sama melihat senjatanya
        belum diberikan. Dengan upsert, yang datang belakangan cukup menimpa
        alih-alih gagal karena indeks unik.
      */
      tx.insert(playerWeapons)
        .values({ playerId, weaponId, isUnlocked: true, unlockedAt: now })
        .onConflictDoUpdate({
          target: [playerWeapons.playerId, playerWeapons.weaponId],
          // `unlocked_at` hanya diisi bila masih kosong: senjata yang sudah
          // terbuka tidak boleh berganti tanggal hanya karena dinilai ulang.
          set: {
            isUnlocked: true,
            unlockedAt: sql`coalesce(${playerWeapons.unlockedAt}, ${now})`,
          },
        })
        .run();
    }
  });

  /*
    Dibaca ulang dari catatan kepemilikan, bukan dijawab dengan `berhak`.
    Yang ditanyakan adalah apa yang BENAR-BENAR dimiliki pemain, dan keduanya
    bisa berbeda: senjata yang pernah diberikan lalu ambangnya dinaikkan tetap
    miliknya, sedangkan jawaban yang disusun dari syarat akan menguncinya
    kembali di layar Koleksi.
  */
  return {
    progress,
    unlocked: readUnlockedWeaponIds(playerId),
    newlyUnlocked: baru,
  };
}
