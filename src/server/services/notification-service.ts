import { and, count, desc, eq, isNull, lt } from "drizzle-orm";
import { db } from "@/server/db/client";
import {
  REWARD_NOTIFICATION_KINDS,
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
