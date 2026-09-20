import { STARTING_ARMOR } from "@/lib/game/damage";
import type { Fighter } from "@/types/game";

/**
 * Bacaan nyawa dan rompi untuk HUD, diturunkan dari aturan ronde.
 *
 * Nyawa dan rompi di store sengaja tepat sampai pecahan — rompi menyerap
 * separuh kerusakan, jadi 33 poin menjadi 16,5 dan 16,5 — tetapi bacaan di
 * layar harus bilangan bulat yang jujur: pemain yang masih hidup tidak boleh
 * membaca "0", dan rompi yang tinggal sepersekian poin sudah tidak menahan
 * apa-apa yang berarti.
 */
export function displayHealth(
  fighter: Pick<Fighter, "health" | "isAlive">,
): number {
  if (!fighter.isAlive) return 0;
  return Math.max(1, Math.ceil(fighter.health));
}

export function displayArmor(fighter: Pick<Fighter, "armor">): number {
  return Math.max(0, Math.floor(fighter.armor));
}

/**
 * Jatah rompi satu RONDE: itulah batas atas bar rompi, bukan seratus. Rompi
 * diberikan saat ronde dimulai dan tidak ikut pulih saat muncul kembali,
 * jadi bar yang penuh berarti "rompi ronde ini masih utuh", bukan separuh
 * dari angka yang tidak pernah bisa dicapai.
 */
export const ARMOR_PER_ROUND = STARTING_ARMOR;

/**
 * Keterangan singkat di bawah bacaan rompi, atau null bila tidak perlu:
 * rompi yang habis baru datang lagi pada ronde berikutnya — aturan yang
 * sebelumnya hanya hidup di kode dan tidak pernah dikatakan kepada pemain.
 */
export function armorHint(
  fighter: Pick<Fighter, "armor" | "isAlive">,
): string | null {
  if (!fighter.isAlive) return null;
  if (displayArmor(fighter) > 0) return null;
  return "habis · pulih di ronde berikutnya";
}
