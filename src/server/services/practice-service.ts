import { and, desc, eq } from "drizzle-orm";
import { db } from "@/server/db/client";
import { practiceSessions, type PracticeSessionRow } from "@/server/db/schema";
import { ApiError } from "@/server/api/http";
import { RANGE_TARGETS } from "@/lib/practice/range-map";
import { findCatalogWeapon } from "@/server/services/weapon-service";

/**
 * Catatan latihan sasaran. Terisolasi dari progres: layanan ini tidak pernah
 * menulis ke pertandingan, koin, statistik, atau syarat buka senjata, dan
 * senjata yang belum terbuka pun boleh dilatih.
 */

export interface PracticeResultInput {
  weaponId: string;
  shots: number;
  hits: number;
  perTarget: Record<string, number>;
  durationMs: number;
}

export interface PracticeResult extends PracticeResultInput {
  id: number;
  accuracy: number;
  endedAt: number;
}

const TARGET_IDS = new Set(RANGE_TARGETS.map((target) => target.id));
/** Sesi lebih lama dari ini dianggap salah catat. */
const MAX_DURATION_MS = 6 * 60 * 60 * 1000;

function toResult(row: PracticeSessionRow): PracticeResult {
  return {
    id: row.id,
    weaponId: row.weaponId,
    shots: row.shots,
    hits: row.hits,
    perTarget: row.perTarget,
    durationMs: row.durationMs,
    endedAt: row.endedAt,
    accuracy: row.shots === 0 ? 0 : row.hits / row.shots,
  };
}

/**
 * Menyimpan satu sesi latihan. Angkanya diperiksa supaya masuk akal: kena
 * per sasaran harus berjumlah sama dengan total kena, dan jumlah butir tidak
 * boleh melampaui laju tembak senjata selama sesi berlangsung.
 */
export function recordPracticeSession(playerId: number, input: PracticeResultInput): PracticeResult {
  const weapon = findCatalogWeapon(input.weaponId);
  if (!weapon) throw new ApiError(404, "senjata_tidak_ada", "Senjata tidak dikenal.");
  if (input.hits > input.shots) throw new ApiError(400, "latihan_tidak_sah", "Jumlah kena melebihi jumlah butir.");
  if (input.durationMs > MAX_DURATION_MS) throw new ApiError(400, "latihan_tidak_sah", "Durasi latihan tidak masuk akal.");

  let perTargetSum = 0;
  for (const [targetId, count] of Object.entries(input.perTarget)) {
    if (!TARGET_IDS.has(targetId)) throw new ApiError(400, "latihan_tidak_sah", `Sasaran "${targetId}" tidak dikenal.`);
    perTargetSum += count;
  }
  if (perTargetSum !== input.hits) {
    throw new ApiError(400, "latihan_tidak_sah", "Kena per sasaran harus berjumlah sama dengan total kena.");
  }

  // Butir maksimum: laju tembak sepanjang sesi, ditambah satu magasin penuh
  // sebagai kelonggaran untuk tembakan pertama dan pembulatan waktu.
  const maxShots =
    Math.ceil((weapon.fireRate / 60) * (input.durationMs / 1000) + weapon.magazineSize) * weapon.pellets;
  if (input.shots > maxShots) {
    throw new ApiError(400, "latihan_tidak_sah", "Jumlah butir melampaui laju tembak senjata.");
  }

  const row = db
    .insert(practiceSessions)
    .values({ playerId, ...input, endedAt: Date.now() })
    .returning()
    .get();
  return toResult(row);
}

export interface PracticeOverview {
  recent: PracticeResult[];
  /** Ketepatan terbaik per senjata (minimal 20 butir supaya tidak untung-untungan). */
  bestByWeapon: Record<string, PracticeResult>;
}

const MIN_SHOTS_FOR_BEST = 20;

export function getPracticeOverview(playerId: number, weaponId?: string): PracticeOverview {
  const where = weaponId
    ? and(eq(practiceSessions.playerId, playerId), eq(practiceSessions.weaponId, weaponId))
    : eq(practiceSessions.playerId, playerId);
  const rows = db.select().from(practiceSessions).where(where).orderBy(desc(practiceSessions.endedAt)).limit(200).all();
  const results = rows.map(toResult);
  const bestByWeapon: Record<string, PracticeResult> = {};
  for (const result of results) {
    if (result.shots < MIN_SHOTS_FOR_BEST) continue;
    const best = bestByWeapon[result.weaponId];
    if (!best || result.accuracy > best.accuracy) bestByWeapon[result.weaponId] = result;
  }
  return { recent: results.slice(0, 20), bestByWeapon };
}
