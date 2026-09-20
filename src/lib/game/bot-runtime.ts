import { freshBrain } from "@/lib/game/bot-ai";
import type { BotBrain } from "@/lib/game/bot-ai";
import type { FireState } from "@/lib/game/bot-combat";
import { fighterCollider } from "@/lib/game/collision";
import type { Aabb, PlayerBounds } from "@/lib/game/collision";
import { playerRuntime } from "@/lib/game/player-runtime";
import type { Fighter, Vec3 } from "@/types/game";

/**
 * Posisi musuh yang HIDUP selama ronde berjalan.
 *
 * Posisi di `useMatchStore` adalah tempat seseorang DILETAKKAN — saat
 * pertandingan dimulai, saat ronde berganti, dan saat muncul kembali. Posisi
 * saat berjalan tidak disimpan di sana: memperbarui store tiap frame akan
 * memicu render ulang React untuk setiap penanda petarung, enam puluh kali per
 * detik. Pemain pun sudah memakai pola yang sama lewat runtime-nya sendiri,
 * jadi musuh mengikutinya.
 *
 * Siapa pun yang butuh tahu di mana seorang musuh BERADA sekarang membaca dari
 * sini; store dipakai untuk hal yang jarang berubah seperti nyawa, status
 * hidup, dan skor.
 */
export interface BotRuntimeState {
  x: number;
  y: number;
  z: number;
  yaw: number;
  verticalVelocity: number;
  brain: BotBrain;
  /** Benar bila musuh ini sedang mengejar pemain. */
  engaged: boolean;
  /**
   * Keadaan pelatuk: sisa rentetan, jadwal tembakan berikutnya, jeda napas.
   * Null sampai penggerak musuh menyiapkannya dengan senjata yang dibawa;
   * runtime ini sengaja tidak tahu-menahu soal katalog senjata.
   */
  fire: FireState | null;
}

const bots = new Map<string, BotRuntimeState>();

/** Mengosongkan seluruh ingatan; dipanggil saat pertandingan disusun ulang. */
export function resetBotRuntime(): void {
  bots.clear();
}

/** Menempatkan seorang musuh di titik tertentu dan menyegarkan otaknya. */
export function placeBot(id: string, position: Vec3, yaw: number): BotRuntimeState {
  const state: BotRuntimeState = {
    x: position[0],
    y: position[1],
    z: position[2],
    yaw,
    verticalVelocity: 0,
    brain: freshBrain(),
    engaged: false,
    fire: null,
  };
  bots.set(id, state);
  return state;
}

export function getBot(id: string): BotRuntimeState | undefined {
  return bots.get(id);
}

/**
 * Posisi seorang petarung SAAT INI, siapa pun dia.
 *
 * Pemain lokal dan musuh sama-sama menyimpan posisi jalannya di luar store,
 * masing-masing di runtime-nya sendiri; yang di store adalah tempat mereka
 * terakhir DILETAKKAN. Fungsi ini menyatukan ketiganya supaya pemanggil tidak
 * perlu tahu harus melihat ke mana — inilah satu-satunya jawaban yang benar
 * untuk "di mana dia sekarang".
 */
export function livePosition(fighter: Fighter): Vec3 {
  if (fighter.isLocal) return playerRuntime.position;
  const state = bots.get(fighter.id);
  return state ? [state.x, state.y, state.z] : fighter.position;
}

/**
 * Kotak badan semua petarung yang HIDUP selain `exceptId`, pada posisi mereka
 * saat ini.
 *
 * Inilah yang membuat petarung saling bertabrakan. Tanpa daftar ini, musuh
 * saling menembus dan pemain berjalan menembus musuh; diukur di simulasi, itu
 * terjadi puluhan ribu kali per menit. Daftarnya disusun tiap frame karena
 * semua orang bergerak tiap frame — dan cukup murah, sebab isinya paling
 * banyak sembilan kotak.
 *
 * Yang tumbang tidak ikut. Mayat yang masih menghalangi jalan adalah cara
 * pasti membuat tikungan sempit tersumbat sepanjang sisa ronde.
 */
export function liveColliders(
  fighters: Fighter[],
  exceptId: string | null,
  bounds: PlayerBounds,
): Aabb[] {
  const hasil: Aabb[] = [];
  for (const fighter of fighters) {
    if (!fighter.isAlive || fighter.id === exceptId) continue;
    hasil.push(fighterCollider(livePosition(fighter), bounds));
  }
  return hasil;
}

/** Arah hadap musuh saat ini, atau arah dari store bila belum pernah bergerak. */
export function liveYaw(fighter: Fighter): number {
  return bots.get(fighter.id)?.yaw ?? fighter.rotationY;
}

/**
 * Menyamakan daftar musuh di runtime dengan daftar di store.
 *
 * Musuh yang baru muncul ditempatkan di titik spawn-nya dengan otak segar, dan
 * musuh yang sudah tidak ada dibuang. Dipanggil tiap frame oleh penggerak
 * musuh, jadi respawn dan pergantian ronde otomatis ikut terurus tanpa perlu
 * saling memberi tahu.
 */
export function syncBots(fighters: Fighter[]): void {
  const living = new Set<string>();

  for (const fighter of fighters) {
    if (fighter.isLocal) continue;
    living.add(fighter.id);

    if (!fighter.isAlive) {
      // Yang tumbang dilupakan supaya saat muncul kembali ia benar-benar mulai
      // dari titik spawn barunya, bukan dari tempat ia terakhir berdiri.
      bots.delete(fighter.id);
      continue;
    }

    if (!bots.has(fighter.id)) {
      placeBot(fighter.id, fighter.position, fighter.rotationY);
    }
  }

  for (const id of bots.keys()) {
    if (!living.has(id)) bots.delete(id);
  }
}
