import { KILLSTREAKS, type KillstreakId } from "@/lib/game/killstreak";

/**
 * Aturan sah-tidaknya kejadian killstreak, sebagai fungsi murni.
 *
 * Server memanggilnya sebelum mencatat kejadian, dengan riwayat kejadian
 * pertandingan itu. Klien tidak dipercaya begitu saja: urutan, jeda waktu,
 * dan jumlah kill per pemakaian semuanya diperiksa di sini.
 */

export type KillstreakEventKind = "terbuka" | "dipakai" | "kill";

export interface KillstreakEventRecord {
  rewardId: KillstreakId;
  kind: KillstreakEventKind;
  streak: number;
  /** Milidetik epoch. */
  at: number;
}

export interface KillstreakContext {
  /** Hadiah di loadout pemain. */
  loadout: (KillstreakId | null)[];
  /** Jumlah musuh di pertandingan; batas kill per pemakaian. */
  botCount: number;
  /** Riwayat kejadian pertandingan ini, urut waktu. */
  history: KillstreakEventRecord[];
}

export type RuleResult = { ok: true } | { ok: false; code: string; message: string };

/** Detik minimum per kill: tidak ada yang bisa membunuh lebih cepat dari ini secara wajar. */
export const MIN_SECONDS_PER_KILL = 0.6;
/** Kelonggaran untuk kill yang tercatat sesaat sesudah hadiah berakhir (jaringan lambat). */
export const KILL_GRACE_SECONDS = 4;

/** Kill terbanyak yang masuk akal dari SATU pemakaian hadiah. */
export function maxKillsPerUse(rewardId: KillstreakId, botCount: number): number {
  if (rewardId === "uav") return 0; // UAV hanya menampilkan musuh, tidak melukai.
  if (rewardId === "serangan_udara") return botCount;
  return botCount * 3; // Helikopter terbang cukup lama untuk membunuh musuh yang muncul lagi.
}

const fail = (code: string, message: string): RuleResult => ({ ok: false, code, message });

export function validateKillstreakEvent(event: KillstreakEventRecord, context: KillstreakContext): RuleResult {
  const reward = KILLSTREAKS.find((item) => item.id === event.rewardId);
  if (!reward) return fail("hadiah_tidak_dikenal", "Hadiah tidak dikenal.");
  if (!context.loadout.includes(event.rewardId)) {
    return fail("bukan_loadout", "Hadiah itu tidak ada di loadout-mu.");
  }

  const mine = context.history.filter((item) => item.rewardId === event.rewardId);
  const unlocks = mine.filter((item) => item.kind === "terbuka");
  const uses = mine.filter((item) => item.kind === "dipakai");
  const kills = mine.filter((item) => item.kind === "kill");

  switch (event.kind) {
    case "terbuka": {
      if (event.streak < reward.kills) {
        return fail("streak_kurang", `${reward.name} butuh ${reward.kills} kill beruntun.`);
      }
      // Membuka hadiah yang sama lagi butuh kill beruntun baru dari nol, jadi
      // paling cepat sekian kill kemudian.
      const last = unlocks[unlocks.length - 1];
      if (last && (event.at - last.at) / 1000 < reward.kills * MIN_SECONDS_PER_KILL) {
        return fail("terlalu_cepat", `${reward.name} tidak mungkin terbuka lagi secepat itu.`);
      }
      return { ok: true };
    }
    case "dipakai": {
      if (uses.length >= unlocks.length) {
        return fail("belum_terbuka", `${reward.name} belum terbuka di pertandingan ini.`);
      }
      const lastUse = uses[uses.length - 1];
      if (lastUse && (event.at - lastUse.at) / 1000 < reward.durationSeconds) {
        return fail("masih_aktif", `${reward.name} masih berjalan.`);
      }
      return { ok: true };
    }
    case "kill": {
      const lastUse = uses[uses.length - 1];
      if (!lastUse) return fail("belum_dipakai", `${reward.name} belum dipakai di pertandingan ini.`);
      const window = reward.durationSeconds + KILL_GRACE_SECONDS;
      if ((event.at - lastUse.at) / 1000 > window) {
        return fail("di_luar_waktu", `${reward.name} sudah berakhir saat kill itu terjadi.`);
      }
      const killsThisUse = kills.filter((item) => item.at >= lastUse.at).length;
      if (killsThisUse >= maxKillsPerUse(event.rewardId, context.botCount)) {
        return fail("kill_berlebihan", `Kill dari ${reward.name} melebihi batas wajar.`);
      }
      return { ok: true };
    }
  }
}
