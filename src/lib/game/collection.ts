import { unlockFacts } from "@/lib/game/unlock";
import type { WeaponOwnership } from "@/lib/mock/player-weapons";
import type { Weapon } from "@/types/game";

/** Kemajuan bermain seorang pemain; bentuknya mengikuti tabel `player_stats`. */
export interface PlayerProgress {
  matchesPlayed: number;
  wins: number;
  totalKills: number;
}

/**
 * Angka turunan dari kemajuan bermain.
 *
 * Diturunkan, bukan disimpan. Menyimpan tingkat kemenangan di samping jumlah
 * menang dan jumlah pertandingan berarti menyimpan satu kebenaran di tiga
 * tempat, dan cepat atau lambat ketiganya berselisih.
 */
export interface ProgressFacts extends PlayerProgress {
  /** Persentase kemenangan 0..100, dibulatkan. Nol bila belum pernah bertanding. */
  winRate: number;
  /** Rata-rata kill per pertandingan, dua angka di belakang koma. */
  killsPerMatch: string;
}

export function progressFacts(progress: PlayerProgress): ProgressFacts {
  const { matchesPlayed, wins, totalKills } = progress;
  return {
    ...progress,
    winRate: matchesPlayed === 0 ? 0 : Math.round((wins / matchesPlayed) * 100),
    // Pembagi nol diperlakukan sebagai satu supaya pemain baru melihat "0.00"
    // alih-alih NaN pada layar pertamanya.
    killsPerMatch: (totalKills / Math.max(1, matchesPlayed)).toFixed(2),
  };
}

/** Satu senjata beserta status kepemilikannya, siap ditampilkan. */
export interface CollectionEntry {
  weapon: Weapon;
  ownership: WeaponOwnership;
}

export interface CollectionFacts {
  entries: CollectionEntry[];
  total: number;
  unlocked: number;
  locked: number;
  /** Bagian koleksi yang sudah terbuka, 0..1. */
  completion: number;
  /**
   * Senjata terkunci yang paling dekat terbuka; null bila semuanya sudah
   * terbuka. Inilah satu-satunya sasaran yang berarti di halaman ini — tanpa
   * menyebutnya, daftar senjata terkunci hanya memberi tahu pemain apa yang
   * belum ia punya, bukan mana yang sebaiknya ia kejar.
   */
  nextUnlock: CollectionEntry | null;
}

/**
 * Menyusun keadaan koleksi dari daftar senjata dan kepemilikannya.
 *
 * Urutannya sengaja: yang sudah terbuka lebih dulu, lalu yang terkunci
 * diurutkan dari yang paling dekat terbuka. Dengan begitu senjata yang tinggal
 * sedikit lagi tidak tenggelam di bawah senjata yang syaratnya masih jauh.
 */
export function collectionFacts(
  weapons: Weapon[],
  ownershipOf: (weaponId: string) => WeaponOwnership,
): CollectionFacts {
  const entries = weapons
    .map((weapon) => ({ weapon, ownership: ownershipOf(weapon.id) }))
    .sort((a, b) => {
      if (a.ownership.isUnlocked !== b.ownership.isUnlocked) {
        return a.ownership.isUnlocked ? -1 : 1;
      }
      // Kemajuan diturunkan saat dibutuhkan, bukan disimpan di kepemilikan.
      const maju = (o: WeaponOwnership) =>
        o.requirement ? unlockFacts(o.requirement).progress : 0;
      return maju(b.ownership) - maju(a.ownership);
    });

  const unlocked = entries.filter((e) => e.ownership.isUnlocked).length;
  const terkunci = entries.filter((e) => !e.ownership.isUnlocked);

  return {
    entries,
    total: entries.length,
    unlocked,
    locked: terkunci.length,
    completion: entries.length === 0 ? 0 : unlocked / entries.length,
    nextUnlock: terkunci[0] ?? null,
  };
}
