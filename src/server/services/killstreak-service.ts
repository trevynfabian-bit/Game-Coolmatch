import { eq } from "drizzle-orm";
import { db } from "@/server/db/client";
import {
  KILLSTREAK_IDS,
  killstreakLoadouts,
  killstreakRewards,
  playerKillstreakUnlocks,
} from "@/server/db/schema";
import { DEFAULT_LOADOUT, KILLSTREAKS, LOADOUT_SLOTS, type KillstreakId } from "@/lib/game/killstreak";

/**
 * Layanan killstreak: katalog hadiah, hadiah yang terbuka, dan loadout
 * pemain. Katalog di kode disalin ke `killstreak_rewards` sekali per proses.
 */

export class KillstreakError extends Error {
  constructor(
    public readonly status: number,
    public readonly code: string,
    message: string,
  ) {
    super(message);
    this.name = "KillstreakError";
  }
}

let catalogSynced = false;

export function syncKillstreakCatalog(): void {
  if (catalogSynced) return;
  db.transaction((tx) => {
    for (const reward of KILLSTREAKS) {
      const values = {
        name: reward.name,
        killsRequired: reward.kills,
        durationSeconds: reward.durationSeconds,
        unlockPrice: reward.unlockPrice,
      };
      tx.insert(killstreakRewards)
        .values({ id: reward.id, ...values })
        .onConflictDoUpdate({ target: killstreakRewards.id, set: values })
        .run();
    }
  });
  catalogSynced = true;
}

export interface KillstreakRewardView {
  id: KillstreakId;
  name: string;
  kills: number;
  durationSeconds: number;
  unlockPrice: number;
  unlocked: boolean;
}

/** Katalog hadiah beserta status terbukanya untuk pemain ini. */
export function getRewardsFor(playerId: number): KillstreakRewardView[] {
  syncKillstreakCatalog();
  const unlocked = new Set(
    db
      .select({ id: playerKillstreakUnlocks.rewardId })
      .from(playerKillstreakUnlocks)
      .where(eq(playerKillstreakUnlocks.playerId, playerId))
      .all()
      .map((row) => row.id),
  );
  return db
    .select()
    .from(killstreakRewards)
    .all()
    .sort((a, b) => a.killsRequired - b.killsRequired)
    .map((row) => ({
      id: row.id,
      name: row.name,
      kills: row.killsRequired,
      durationSeconds: row.durationSeconds,
      unlockPrice: row.unlockPrice,
      unlocked: row.unlockPrice === 0 || unlocked.has(row.id),
    }));
}

export type LoadoutSlots = (KillstreakId | null)[];

/**
 * Loadout pemain. Pemain yang belum pernah menyimpan mendapat loadout bawaan,
 * dan hadiah yang (lagi) tidak terbuka dikosongkan supaya arena tidak pernah
 * menawarkan hadiah yang tidak berhak dipakai.
 */
export function getLoadout(playerId: number): LoadoutSlots {
  const rewards = getRewardsFor(playerId);
  const allowed = new Set(rewards.filter((item) => item.unlocked).map((item) => item.id));
  const row = db.select().from(killstreakLoadouts).where(eq(killstreakLoadouts.playerId, playerId)).get();
  const slots: LoadoutSlots = row ? [row.slot1, row.slot2, row.slot3] : DEFAULT_LOADOUT;
  return Array.from({ length: LOADOUT_SLOTS }, (_, index) => {
    const id = slots[index] ?? null;
    return id && allowed.has(id) ? id : null;
  });
}

/**
 * Menyimpan loadout. Aturannya: tepat tiga slot, isi tiap slot id hadiah atau
 * null, tidak ada hadiah ganda, dan semua hadiah harus sudah terbuka.
 */
export function saveLoadout(playerId: number, slots: unknown): LoadoutSlots {
  if (!Array.isArray(slots) || slots.length !== LOADOUT_SLOTS) {
    throw new KillstreakError(400, "loadout_tidak_sah", `Loadout harus berisi ${LOADOUT_SLOTS} slot.`);
  }
  const clean: LoadoutSlots = slots.map((slot) => {
    if (slot === null) return null;
    if (typeof slot !== "string" || !(KILLSTREAK_IDS as readonly string[]).includes(slot)) {
      throw new KillstreakError(400, "hadiah_tidak_dikenal", "Ada hadiah yang tidak dikenal di loadout.");
    }
    return slot as KillstreakId;
  });

  const picked = clean.filter((slot): slot is KillstreakId => slot !== null);
  if (new Set(picked).size !== picked.length) {
    throw new KillstreakError(400, "hadiah_ganda", "Satu hadiah hanya boleh dipasang di satu slot.");
  }
  const rewards = getRewardsFor(playerId);
  const locked = picked.filter((id) => !rewards.find((item) => item.id === id)?.unlocked);
  if (locked.length > 0) {
    const names = locked.map((id) => rewards.find((item) => item.id === id)?.name ?? id).join(", ");
    throw new KillstreakError(409, "hadiah_terkunci", `Buka dulu ${names} sebelum memasangnya.`);
  }

  const values = { slot1: clean[0], slot2: clean[1], slot3: clean[2], updatedAt: Date.now() };
  db.insert(killstreakLoadouts)
    .values({ playerId, ...values })
    .onConflictDoUpdate({ target: killstreakLoadouts.playerId, set: values })
    .run();
  return getLoadout(playerId);
}
