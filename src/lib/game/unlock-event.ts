import type { PlayerProgress } from "@/lib/game/collection";
import type { UnlockKind, UnlockRequirement } from "@/lib/game/unlock";

/**
 * Angka kemajuan yang diperiksa tiap jenis syarat.
 *
 * Pemetaan ini ada supaya syarat bisa disimpan sebagai data — "kind: kills,
 * target: 60" — alih-alih sebagai cabang if di setiap tempat yang memeriksanya.
 * Menambah jenis syarat baru berarti menambah satu baris di sini, bukan
 * menyisir seluruh layar yang menampilkannya.
 */
const FIELD: Record<UnlockKind, keyof PlayerProgress> = {
  wins: "wins",
  kills: "totalKills",
  matches: "matchesPlayed",
};

/** Angka yang dihitung sebuah syarat dari kemajuan seorang pemain. */
export function progressValue(
  kind: UnlockKind,
  progress: PlayerProgress,
): number {
  return progress[FIELD[kind]];
}

/** Hasil satu pertandingan, sejauh yang memengaruhi kemajuan. */
export interface MatchOutcome {
  /** Kill pemain sepanjang pertandingan, bukan hanya ronde terakhir. */
  kills: number;
  won: boolean;
}

/**
 * Kemajuan SESUDAH sebuah pertandingan, dihitung dari kemajuan sebelumnya.
 *
 * Dipisah dari komponen mana pun supaya bisa diuji tanpa merender apa pun,
 * dan supaya layer backend nanti bisa memakai fungsi yang sama untuk memeriksa
 * apa yang seharusnya terbuka — kalau perhitungannya hidup di dalam komponen,
 * server terpaksa menulis versinya sendiri dan keduanya akan berselisih.
 */
export function progressAfterMatch(
  before: PlayerProgress,
  outcome: MatchOutcome,
): PlayerProgress {
  return {
    matchesPlayed: before.matchesPlayed + 1,
    wins: before.wins + (outcome.won ? 1 : 0),
    // Kill negatif tidak masuk akal dan hanya bisa datang dari data rusak;
    // dijepit di sini supaya tidak pernah MENURUNKAN total pemain.
    totalKills: before.totalKills + Math.max(0, outcome.kills),
  };
}

/** Sebuah senjata beserta syarat yang harus dipenuhi untuk membukanya. */
export interface UnlockCandidate {
  weaponId: string;
  requirement: UnlockRequirement;
}

/**
 * Senjata yang syaratnya BARU SAJA terpenuhi: belum terpenuhi sebelum
 * pertandingan, sudah terpenuhi sesudahnya.
 *
 * Yang diperiksa adalah perlintasan ambang, bukan sekadar "syaratnya
 * terpenuhi". Tanpa itu, setiap pertandingan sesudahnya akan merayakan senjata
 * yang sama berulang-ulang — pemain yang sudah punya seratus kill akan
 * diberi tahu senjata enam puluh kill-nya terbuka, setiap kali.
 *
 * Angkanya diambil dari `before`/`after`, bukan dari `requirement.current`.
 * Yang terakhir itu potret untuk ditampilkan; yang menentukan terbuka atau
 * tidak adalah kemajuan pemain saat ini.
 */
export function newlyUnlocked(
  before: PlayerProgress,
  after: PlayerProgress,
  candidates: UnlockCandidate[],
): string[] {
  return candidates
    .filter(({ requirement }) => {
      const { kind, target } = requirement;
      return (
        progressValue(kind, before) < target &&
        progressValue(kind, after) >= target
      );
    })
    .map(({ weaponId }) => weaponId);
}
