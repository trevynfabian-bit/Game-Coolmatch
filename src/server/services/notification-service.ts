import { and, count, desc, eq, inArray, isNull, lt } from "drizzle-orm";
import { db } from "@/server/db/client";
import {
  REWARD_NOTIFICATION_KINDS,
  playerWeapons,
  rewardNotifications,
  type RewardNotificationRow,
} from "@/server/db/schema";
import type { RewardNotification } from "@/types/economy";

/**
 * Kotak masuk hadiah pemain. Hadiah dicatat oleh layanan yang memberikannya
 * (koin pertandingan, skin, upgrade, killstreak, senjata) lewat
 * `recordNotification`; klien membaca daftar dan jumlah yang belum dilihat.
 */

export type NotificationKind = (typeof REWARD_NOTIFICATION_KINDS)[number];

export function toNotificationDto(row: RewardNotificationRow): RewardNotification {
  return {
    id: row.id,
    kind: row.kind,
    title: row.title,
    body: row.body,
    itemId: row.itemId,
    amount: row.amount,
    createdAt: row.createdAt,
    seenAt: row.seenAt,
  };
}

export interface ListNotificationsOptions {
  /** true: hanya yang belum dilihat. */
  unseenOnly?: boolean;
  limit?: number;
  /** Kursor: hanya notifikasi dengan id lebih kecil dari ini. */
  beforeId?: number;
}

/** Notifikasi pemain, terbaru lebih dulu. */
export function listNotifications(
  playerId: number,
  { unseenOnly = false, limit = 30, beforeId }: ListNotificationsOptions = {},
): RewardNotification[] {
  const conditions = [eq(rewardNotifications.playerId, playerId)];
  if (unseenOnly) conditions.push(isNull(rewardNotifications.seenAt));
  if (beforeId !== undefined) conditions.push(lt(rewardNotifications.id, beforeId));
  return db
    .select()
    .from(rewardNotifications)
    .where(and(...conditions))
    .orderBy(desc(rewardNotifications.id))
    .limit(Math.max(1, Math.min(100, limit)))
    .all()
    .map(toNotificationDto);
}

/** Jumlah notifikasi yang belum dilihat, untuk lencana di menu. */
export function countUnseen(playerId: number): number {
  const row = db
    .select({ value: count() })
    .from(rewardNotifications)
    .where(and(eq(rewardNotifications.playerId, playerId), isNull(rewardNotifications.seenAt)))
    .get();
  return row?.value ?? 0;
}

export interface NewNotification {
  playerId: number;
  kind: NotificationKind;
  title: string;
  body?: string;
  itemId?: string | null;
  amount?: number | null;
  /** Kunci peristiwa, mis. "pertandingan:12" atau "skin:skin-loreng-hutan". */
  sourceId: string;
}

type Executor = Pick<typeof db, "insert">;

/**
 * Mencatat satu notifikasi. Idempoten per (pemain, sourceId): peristiwa yang
 * sama dicatat ulang tidak menambah baris. Bisa dipanggil di dalam transaksi
 * pemberi hadiah supaya hadiah dan notifikasinya lahir bersamaan.
 */
export function recordNotification(input: NewNotification, executor: Executor = db): void {
  executor
    .insert(rewardNotifications)
    .values({
      playerId: input.playerId,
      kind: input.kind,
      title: input.title.slice(0, 120),
      body: (input.body ?? "").slice(0, 400),
      itemId: input.itemId ?? null,
      amount: input.amount ?? null,
      sourceId: input.sourceId,
    })
    .onConflictDoNothing({ target: [rewardNotifications.playerId, rewardNotifications.sourceId] })
    .run();
}

export type MarkSeenTarget =
  | { all: true }
  | { ids: number[] }
  | { kind: NotificationKind; itemId: string };

/**
 * Menandai notifikasi pemain sudah dilihat: semua, per id, atau semua yang
 * menunjuk satu item (dipakai saat pemain membuka item itu di koleksi).
 * Hanya baris milik pemain sendiri yang belum dilihat yang tersentuh, jadi
 * aman dipanggil berulang dan `seen_at` pertama tidak pernah tertimpa.
 */
export function markSeen(playerId: number, target: MarkSeenTarget, at = Date.now()): number {
  const conditions = [eq(rewardNotifications.playerId, playerId), isNull(rewardNotifications.seenAt)];
  if ("ids" in target) {
    if (target.ids.length === 0) return 0;
    conditions.push(inArray(rewardNotifications.id, target.ids));
  } else if ("kind" in target) {
    conditions.push(eq(rewardNotifications.kind, target.kind), eq(rewardNotifications.itemId, target.itemId));
  }
  return db.transaction((tx) => {
    // Notifikasi senjata yang ditandai dilihat ikut menghapus penanda "Baru"
    // senjata itu di koleksi, supaya keduanya tidak pernah berselisih.
    const weaponIds = tx
      .select({ itemId: rewardNotifications.itemId })
      .from(rewardNotifications)
      .where(and(...conditions, eq(rewardNotifications.kind, "senjata")))
      .all()
      .map((row) => row.itemId)
      .filter((id): id is string => id != null);
    const changed = tx.update(rewardNotifications).set({ seenAt: at }).where(and(...conditions)).run().changes;
    if (weaponIds.length > 0) {
      tx.update(playerWeapons)
        .set({ announcedAt: at })
        .where(
          and(eq(playerWeapons.playerId, playerId), inArray(playerWeapons.weaponId, weaponIds), isNull(playerWeapons.announcedAt)),
        )
        .run();
    }
    return changed;
  });
}
