import { and, asc, eq, inArray, isNull, sql } from "drizzle-orm";
import type { PlayerProgress } from "@/lib/game/collection";
import type { UnlockKind } from "@/lib/game/unlock";
import { progressValue } from "@/lib/game/unlock-event";
import {
  WEAPON_UNLOCK_RULES,
  unlockRuleFor,
  weaponsUnlockedBy,
} from "@/lib/game/weapon-unlock-rules";
import { db } from "@/server/db/client";
import { playerStats, playerWeapons, weapons } from "@/server/db/schema";
import { loadTotalDeaths } from "@/server/players/stats-store";
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
      /*
        Senjata awal langsung ditandai sudah dikabarkan. Pemain baru tidak
        perlu disambut tiga layar "senjata baru terbuka!" untuk perlengkapan
        yang memang sudah jadi miliknya sejak menit pertama; yang layak
        dirayakan hanyalah yang benar-benar ia peroleh.
      */
      const announcedAt = unlockRuleFor(weaponId).requirement ? null : now;

      tx.insert(playerWeapons)
        .values({
          playerId,
          weaponId,
          isUnlocked: true,
          unlockedAt: now,
          announcedAt,
        })
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

/** Satu senjata pada daftar koleksi yang dikirim ke klien. */
export interface CollectionEntryPayload {
  id: string;
  name: string;
  type: string;
  damage: number;
  fireRate: number;
  magazineSize: number;
  imageUrl: string | null;
  isUnlocked: boolean;
  /** Epoch milidetik; null untuk senjata awal maupun yang masih terkunci. */
  unlockedAt: number | null;
  /**
   * Syarat membukanya beserta kemajuan pemain saat ini. Null bila senjatanya
   * terbuka sejak awal atau sudah terbuka — syarat yang sudah terpenuhi tidak
   * punya pekerjaan lagi, dan menampilkannya hanya membuat senjata yang sudah
   * dimiliki tetap terlihat seperti sedang dikejar.
   */
  requirement: { kind: UnlockKind; current: number; target: number } | null;
}

export interface CollectionPayload {
  progress: PlayerProgress & { totalDeaths: number };
  weapons: CollectionEntryPayload[];
}

/**
 * Seluruh katalog senjata beserta status buka milik seorang pemain.
 *
 * Yang dikirim adalah KATALOG LENGKAP, bukan hanya yang sudah terbuka. Layar
 * Koleksi memang perlu menampilkan yang terkunci — justru itu yang membuat
 * pemain tahu ada sesuatu untuk dikejar — dan syarat tiap senjata ikut
 * disertakan lengkap dengan kemajuan pemain saat ini supaya bar kemajuannya
 * bisa digambar tanpa perhitungan tambahan di klien.
 *
 * Penilaian syarat dijalankan lebih dulu. Ia tahan diulang, dan itulah yang
 * membuat daftar ini tetap benar walau ada pertandingan yang penilaiannya
 * sempat gagal: senjata yang terlewat muncul di sini, bukan menunggu
 * pertandingan berikutnya.
 */
export function listWeaponCollection(playerId: number): CollectionPayload {
  const evaluation = evaluateWeaponUnlocks(playerId);
  const dimiliki = new Set(evaluation.unlocked);

  const waktuBuka = new Map(
    db
      .select({
        weaponId: playerWeapons.weaponId,
        unlockedAt: playerWeapons.unlockedAt,
      })
      .from(playerWeapons)
      .where(eq(playerWeapons.playerId, playerId))
      .all()
      .map((row) => [row.weaponId, row.unlockedAt]),
  );

  const baris = db
    .select()
    .from(weapons)
    .where(eq(weapons.isAvailable, true))
    .orderBy(asc(weapons.sortOrder), asc(weapons.id))
    .all();

  return {
    progress: {
      ...evaluation.progress,
      totalDeaths: loadTotalDeaths(playerId),
    },
    weapons: baris.map((row) => {
      const isUnlocked = dimiliki.has(row.id);
      const rule = unlockRuleFor(row.id);

      return {
        id: row.id,
        name: row.name,
        type: row.type,
        damage: row.damage,
        fireRate: row.fireRate,
        magazineSize: row.magazineSize,
        imageUrl: row.imageUrl,
        isUnlocked,
        unlockedAt: waktuBuka.get(row.id) ?? null,
        requirement:
          isUnlocked || !rule.requirement
            ? null
            : {
                kind: rule.requirement.kind,
                current: progressValue(
                  rule.requirement.kind,
                  evaluation.progress,
                ),
                target: rule.requirement.target,
              },
      };
    }),
  };
}

/** Satu kabar senjata terbuka yang belum pernah dilihat pemain. */
export interface WeaponAnnouncement {
  id: string;
  name: string;
  type: string;
  damage: number;
  fireRate: number;
  magazineSize: number;
  imageUrl: string | null;
  unlockedAt: number | null;
  /** Syarat yang barusan terpenuhi; itulah yang membuat kabarnya berarti. */
  requirement: { kind: UnlockKind; target: number } | null;
}

/**
 * Senjata yang sudah terbuka tetapi kabarnya belum pernah sampai ke pemain.
 *
 * Senjata TANPA syarat tidak pernah masuk daftar ini, apa pun isi penanda
 * kabarnya. Aturan itu yang menanggung baris-baris yang ditulis sebelum kolom
 * penandanya ada — semuanya berpenanda kosong — sehingga pemain lama tidak
 * tiba-tiba disambut perayaan atas pistol yang sudah dipegangnya sejak awal.
 */
export function listPendingAnnouncements(
  playerId: number,
): WeaponAnnouncement[] {
  ensureWeaponCatalogue();

  const rows = db
    .select({
      weaponId: playerWeapons.weaponId,
      unlockedAt: playerWeapons.unlockedAt,
      name: weapons.name,
      type: weapons.type,
      damage: weapons.damage,
      fireRate: weapons.fireRate,
      magazineSize: weapons.magazineSize,
      imageUrl: weapons.imageUrl,
    })
    .from(playerWeapons)
    .innerJoin(weapons, eq(weapons.id, playerWeapons.weaponId))
    .where(
      and(
        eq(playerWeapons.playerId, playerId),
        eq(playerWeapons.isUnlocked, true),
        isNull(playerWeapons.announcedAt),
      ),
    )
    .orderBy(asc(playerWeapons.unlockedAt), asc(weapons.sortOrder))
    .all();

  return rows
    .map((row) => ({ row, rule: unlockRuleFor(row.weaponId) }))
    .filter(({ rule }) => rule.requirement !== null)
    .map(({ row, rule }) => ({
      id: row.weaponId,
      name: row.name,
      type: row.type,
      damage: row.damage,
      fireRate: row.fireRate,
      magazineSize: row.magazineSize,
      imageUrl: row.imageUrl,
      unlockedAt: row.unlockedAt,
      requirement: rule.requirement,
    }));
}

/**
 * Menandai kabar senjata sudah tersampaikan.
 *
 * Dipanggil klien SESUDAH pemain benar-benar melihatnya, bukan saat kabarnya
 * dikirim. Itulah inti rancangan ini: kabar yang dikirim tetapi tidak sempat
 * terlihat — jaringan putus, tab ditutup tepat saat peluit berbunyi, layar
 * ringkasannya gagal dirender — tetap menunggu di permintaan berikutnya alih-
 * alih hilang selamanya.
 *
 * Mengembalikan berapa baris yang benar-benar berubah, sehingga pemanggil
 * bisa membedakan "sudah ditandai sejak tadi" dari "id yang tidak dikenal".
 */
export function markAnnounced(
  playerId: number,
  weaponIds: readonly string[],
): number {
  if (weaponIds.length === 0) return 0;

  const hasil = db
    .update(playerWeapons)
    .set({ announcedAt: Date.now() })
    .where(
      and(
        eq(playerWeapons.playerId, playerId),
        inArray(playerWeapons.weaponId, [...weaponIds]),
        isNull(playerWeapons.announcedAt),
      ),
    )
    .run();

  return hasil.changes;
}
