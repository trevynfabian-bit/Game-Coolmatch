import type { WeaponType } from "@/types/game";

/**
 * Bunyi pelatuk yang ditarik tanpa peluru, per senjata.
 *
 * Ketukan kosong adalah satu-satunya bunyi di permainan ini yang bisa terjadi
 * SECEPAT laju tembak senjatanya, dan itulah masalahnya: senapan serbu yang
 * pelatuknya ditahan pada magasin kosong menembakkan sepuluh ketukan per detik
 * ke telinga pemain. Karena itu tabel di bawah ditemani jarak minimum antar
 * ketukan — kabar "magasin kosong" hanya perlu sampai sekali, sisanya derau.
 *
 * Wataknya tetap dibedakan per senjata dengan alasan yang sama seperti
 * letupannya: pemain harus bisa tahu senjata mana yang kosong tanpa melihat
 * HUD, terutama saat berpindah senjata di tengah baku tembak.
 */

export interface EmptyVoice {
  gain: number;
  /** Batas bawah highpass; makin rendah makin berat bunyinya. */
  cutoff: number;
  decay: number;
  /**
   * Nada rendah yang menyertai, hertz; null untuk ketukan yang sepenuhnya
   * kering. Senjata berat punya bagian bergerak yang berat pula.
   */
  thunk: number | null;
}

export const EMPTY_VOICE: Record<WeaponType, EmptyVoice> = {
  pistol: { gain: 0.12, cutoff: 2200, decay: 0.04, thunk: null },
  smg: { gain: 0.1, cutoff: 2600, decay: 0.035, thunk: null },
  rifle: { gain: 0.14, cutoff: 1900, decay: 0.05, thunk: 150 },
  shotgun: { gain: 0.17, cutoff: 1300, decay: 0.07, thunk: 95 },
  sniper: { gain: 0.16, cutoff: 1500, decay: 0.07, thunk: 110 },
};

/**
 * Jarak minimum antar ketukan kosong, detik.
 *
 * Kira-kira lima ketukan per detik — masih terasa seperti menarik pelatuk
 * berulang kali, tetapi tidak lagi seperti senjata yang benar-benar menembak.
 * Angkanya sengaja lebih besar daripada jeda tembak senjata tercepat (SMG,
 * sekitar 0,067 detik), sebab kalau tidak, pembatas ini tidak membatasi apa
 * pun pada senjata yang justru paling membutuhkannya.
 */
export const EMPTY_CLICK_GAP = 0.22;

/**
 * Benar bila ketukan kosong berikutnya boleh berbunyi.
 *
 * Ketukan pertama selalu boleh: yang dibatasi adalah pengulangannya, bukan
 * kabarnya. Waktu yang mundur — konteks audio yang diganti — diperlakukan
 * seperti ketukan pertama, bukan dibungkam selamanya.
 */
export function emptyClickAllowed(lastAt: number | null, now: number): boolean {
  if (lastAt === null || !Number.isFinite(lastAt)) return true;
  if (now < lastAt) return true;
  return now - lastAt >= EMPTY_CLICK_GAP;
}
