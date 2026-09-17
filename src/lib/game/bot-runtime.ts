import { freshBrain } from "@/lib/game/bot-ai";
import type { BotBrain } from "@/lib/game/bot-ai";
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
   * Waktu tembakan berikutnya, dalam detik pada jam yang sama dengan pemanggil.
   * Nol berarti belum dijadwalkan — musuh yang baru mengunci sasaran menunggu
   * satu jeda penuh dulu, jadi ia tidak langsung menembak pada frame yang sama
   * saat pemain muncul di tikungan.
   */
  nextShotAt: number;
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
    nextShotAt: 0,
  };
  bots.set(id, state);
  return state;
}

export function getBot(id: string): BotRuntimeState | undefined {
  return bots.get(id);
}

/**
 * Posisi musuh saat ini, atau posisi dari store bila ia belum pernah bergerak.
 *
 * Pemanggil tidak perlu tahu mana yang lebih baru — inilah satu-satunya jawaban
 * yang benar untuk "di mana dia sekarang".
 */
export function livePosition(fighter: Fighter): Vec3 {
  const state = bots.get(fighter.id);
  return state ? [state.x, state.y, state.z] : fighter.position;
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
