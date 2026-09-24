import { and, asc, eq } from "drizzle-orm";
import { db } from "@/server/db/client";
import {
  KILLSTREAK_EVENT_KINDS,
  KILLSTREAK_IDS,
  killstreakLoadouts,
  matchKillstreakEvents,
  matches,
  killstreakRewards,
  playerKillstreakUnlocks,
} from "@/server/db/schema";
import { DEFAULT_LOADOUT, KILLSTREAKS, LOADOUT_SLOTS, type KillstreakId } from "@/lib/game/killstreak";
import { validateKillstreakEvent } from "@/lib/game/killstreak-rules";
import type { AchievementStat, PlayerAchievementStats } from "@/lib/game/killstreak";
import { getAchievementStats } from "@/server/services/player-stats-service";

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
        unlockStat: reward.unlockAchievement?.stat ?? null,
        unlockValue: reward.unlockAchievement?.value ?? null,
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
  unlockAchievement: { stat: AchievementStat; value: number } | null;
  unlocked: boolean;
  /** Jalan terbukanya: gratis sejak awal, dibeli, atau lewat pencapaian. */
  unlockedVia: "gratis" | "koin" | "pencapaian" | null;
}

/**
 * Membuka hadiah yang syarat pencapaiannya sudah terpenuhi tapi belum
 * tercatat. Dipanggil tiap kali status hadiah dibaca, jadi hadiah terbuka
 * dengan sendirinya begitu statistik pemain mencapai ambang.
 */
function unlockByAchievement(playerId: number, stats: PlayerAchievementStats): void {
  const rows = db.select().from(killstreakRewards).all();
  for (const row of rows) {
    if (row.unlockPrice === 0 || !row.unlockStat || row.unlockValue == null) continue;
    if (stats[row.unlockStat] < row.unlockValue) continue;
    db.insert(playerKillstreakUnlocks)
      .values({ playerId, rewardId: row.id, via: "pencapaian", unlockedAt: Date.now() })
      .onConflictDoNothing()
      .run();
  }
}

/** Katalog hadiah beserta status terbukanya untuk pemain ini. */
export function getRewardsFor(playerId: number, stats = getAchievementStats(playerId)): KillstreakRewardView[] {
  syncKillstreakCatalog();
  unlockByAchievement(playerId, stats);
  const unlocks = new Map(
    db
      .select()
      .from(playerKillstreakUnlocks)
      .where(eq(playerKillstreakUnlocks.playerId, playerId))
      .all()
      .map((row) => [row.rewardId, row.via]),
  );
  return db
    .select()
    .from(killstreakRewards)
    .all()
    .sort((a, b) => a.killsRequired - b.killsRequired)
    .map((row) => {
      const via = row.unlockPrice === 0 ? "gratis" : (unlocks.get(row.id) ?? null);
      return {
        id: row.id,
        name: row.name,
        kills: row.killsRequired,
        durationSeconds: row.durationSeconds,
        unlockPrice: row.unlockPrice,
        unlockAchievement:
          row.unlockStat && row.unlockValue != null ? { stat: row.unlockStat, value: row.unlockValue } : null,
        unlocked: via !== null,
        unlockedVia: via,
      };
    });
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

export type KillstreakEventKind = (typeof KILLSTREAK_EVENT_KINDS)[number];

export interface MatchRewardSummary {
  rewardId: KillstreakId;
  unlocked: number;
  used: number;
  kills: number;
}

/** Ringkasan hadiah per pertandingan: berapa kali terbuka, dipakai, dan kill-nya. */
export function getMatchRewardSummary(matchId: number): MatchRewardSummary[] {
  const events = db
    .select()
    .from(matchKillstreakEvents)
    .where(eq(matchKillstreakEvents.matchId, matchId))
    .all();
  return KILLSTREAK_IDS.map((rewardId) => {
    const mine = events.filter((event) => event.rewardId === rewardId);
    return {
      rewardId,
      unlocked: mine.filter((event) => event.kind === "terbuka").length,
      used: mine.filter((event) => event.kind === "dipakai").length,
      kills: mine.filter((event) => event.kind === "kill").length,
    };
  });
}

/**
 * Mencatat satu kejadian killstreak di pertandingan yang sedang berjalan.
 *
 * Pertandingan harus milik pemain ini dan belum ditutup; selebihnya aturan
 * di `lib/game/killstreak-rules` (loadout, ambang kill beruntun, urutan
 * terbuka → dipakai → kill, jeda waktu, dan batas kill per pemakaian).
 */
export function recordKillstreakEvent(
  playerId: number,
  matchId: number,
  input: { rewardId: KillstreakId; kind: KillstreakEventKind; streak: number },
): MatchRewardSummary[] {
  const match = db
    .select()
    .from(matches)
    .where(and(eq(matches.id, matchId), eq(matches.playerId, playerId)))
    .get();
  if (!match) throw new KillstreakError(404, "pertandingan_tidak_ada", "Pertandingan tidak ditemukan.");
  if (match.endedAt != null) {
    throw new KillstreakError(409, "pertandingan_selesai", "Pertandingan ini sudah selesai.");
  }
  const history = db
    .select()
    .from(matchKillstreakEvents)
    .where(eq(matchKillstreakEvents.matchId, matchId))
    .orderBy(asc(matchKillstreakEvents.at), asc(matchKillstreakEvents.id))
    .all();
  const at = Date.now();
  const verdict = validateKillstreakEvent(
    { ...input, at },
    { loadout: getLoadout(playerId), botCount: match.botCount, history },
  );
  if (!verdict.ok) {
    // Laporan yang cacat (angka salah) 400; yang bertentangan dengan keadaan 409.
    const status = verdict.code === "streak_kurang" || verdict.code === "hadiah_tidak_dikenal" ? 400 : 409;
    throw new KillstreakError(status, verdict.code, verdict.message);
  }

  db.transaction((tx) => {
    tx.insert(matchKillstreakEvents)
      .values({ matchId, rewardId: input.rewardId, kind: input.kind, streak: input.streak, at })
      .run();
    // Kill beruntun terpanjang ikut dicatat dari laporan yang sudah lolos pemeriksaan.
    if (input.streak > match.bestStreak) {
      tx.update(matches).set({ bestStreak: input.streak }).where(eq(matches.id, matchId)).run();
    }
  });

  return getMatchRewardSummary(matchId);
}
