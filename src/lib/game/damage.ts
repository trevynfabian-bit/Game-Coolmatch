import type { Fighter } from "@/types/game";

/** Bagian kerusakan yang ditahan rompi selama rompi masih ada. */
export const ARMOR_ABSORPTION = 0.5;

/** Pengali kerusakan untuk tembakan yang mengenai kepala. */
export const HEADSHOT_MULTIPLIER = 2;

/** Nilai yang didapat penembak per kill. */
export const SCORE_PER_KILL = 100;
export const SCORE_HEADSHOT_BONUS = 25;

/** Lama petarung menunggu sebelum bisa muncul kembali, dalam detik. */
export const RESPAWN_SECONDS = 4;

/**
 * Rompi yang dibawa setiap petarung saat sebuah RONDE dimulai.
 *
 * Rompi menyerap separuh kerusakan selama masih ada, jadi angka ini menentukan
 * berapa lama tembakan pertama terasa ringan sebelum nyawa benar-benar
 * terkuras. Diberikan per ronde, bukan per respawn: sekali tumbang di tengah
 * ronde, sisa ronde itu dijalani tanpa rompi. Itu membuat rompi jadi sesuatu
 * yang dijaga, bukan yang datang gratis setiap kali muncul kembali — dan
 * membuat pembacaan ROMPI di HUD, yang selama ini selalu nol karena tidak ada
 * satu pun jalur yang pernah mengisinya, akhirnya berarti.
 */
export const STARTING_ARMOR = 50;

export interface DamageOutcome {
  /** Keadaan petarung sesudah kena tembak. */
  fighter: Fighter;
  /** Kerusakan yang benar-benar mengurangi nyawa, sesudah ditahan rompi. */
  healthLost: number;
  /** Kerusakan yang diserap rompi. */
  armorLost: number;
  /** Benar bila tembakan ini yang menumbangkannya. */
  isLethal: boolean;
}

/**
 * Menghitung akibat satu tembakan pada seorang petarung.
 *
 * Rompi menahan setengah kerusakan selama masih tersisa, dan berkurang sebanyak
 * yang ditahannya — jadi rompi habis lebih dulu sebelum nyawa tergerus penuh.
 * Fungsi ini murni: tidak mengubah objek masukan dan tidak menyentuh store.
 */
export function applyDamageToFighter(
  fighter: Fighter,
  rawDamage: number,
): DamageOutcome {
  if (!fighter.isAlive || rawDamage <= 0) {
    return { fighter, healthLost: 0, armorLost: 0, isLethal: false };
  }

  const damage = Math.max(0, rawDamage);
  const armorLost = Math.min(fighter.armor, damage * ARMOR_ABSORPTION);
  const healthLost = Math.min(fighter.health, damage - armorLost);

  const health = fighter.health - healthLost;
  const isLethal = health <= 0;

  return {
    fighter: {
      ...fighter,
      armor: fighter.armor - armorLost,
      health: isLethal ? 0 : health,
      isAlive: !isLethal,
      deaths: isLethal ? fighter.deaths + 1 : fighter.deaths,
      respawnInSeconds: isLethal ? RESPAWN_SECONDS : fighter.respawnInSeconds,
    },
    healthLost,
    armorLost,
    isLethal,
  };
}

/** Kerusakan akhir satu butir peluru, memperhitungkan headshot. */
export function resolveShotDamage(
  baseDamage: number,
  isHeadshot: boolean,
): number {
  return isHeadshot ? baseDamage * HEADSHOT_MULTIPLIER : baseDamage;
}

/** Nilai yang diperoleh penembak dari sebuah kill. */
export function killScore(isHeadshot: boolean): number {
  return SCORE_PER_KILL + (isHeadshot ? SCORE_HEADSHOT_BONUS : 0);
}
