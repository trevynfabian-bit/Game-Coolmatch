import { eq, sql } from "drizzle-orm";
import {
  DEFAULT_MATCH_SETUP,
  DIFFICULTY_PROFILES,
  MAX_BOTS,
  MIN_BOTS,
} from "@/lib/game/difficulty";
import type { Difficulty } from "@/types/game";
import { db } from "@/server/db/client";
import { opponentSettings } from "@/server/db/schema";

/** Bentuk yang dikirim dan diterima endpoint pengaturan lawan. */
export interface OpponentSettingsPayload {
  difficulty: Difficulty;
  botCount: number;
  /** Epoch milidetik saat terakhir disimpan; null berarti masih bawaan. */
  updatedAt: number | null;
}

export type ParsedSettings =
  | { ok: true; value: { difficulty: Difficulty; botCount: number } }
  | { ok: false; message: string };

/**
 * Memeriksa badan permintaan penyimpanan pengaturan.
 *
 * Nilai di luar batas DITOLAK, bukan dijepit diam-diam. Layar pengaturan sudah
 * menjepitnya sebelum mengirim, jadi angka yang lolos ke sini berarti ada yang
 * tidak beres — entah bug di klien atau permintaan yang disusun tangan — dan
 * menjepitnya hanya akan menyembunyikan itu sambil menyimpan sesuatu yang tidak
 * pernah diminta siapa pun. Menolaknya juga membuat jawabannya 400 dengan
 * alasan yang bisa dibaca, bukan 500 dari batasan CHECK di database.
 */
export function parseOpponentSettings(body: unknown): ParsedSettings {
  // Array ikut ditolak di sini: `typeof [] === "object"`, jadi tanpa
  // pemeriksaan ini sebuah array akan lolos dan baru gagal di pemeriksaan
  // berikutnya dengan alasan yang salah — mengeluh soal tingkat kesulitan
  // padahal masalahnya bentuk badan permintaannya.
  if (typeof body !== "object" || body === null || Array.isArray(body)) {
    return { ok: false, message: "Badan permintaan harus berupa objek JSON." };
  }

  const { difficulty, botCount } = body as Record<string, unknown>;

  if (typeof difficulty !== "string" || !(difficulty in DIFFICULTY_PROFILES)) {
    return {
      ok: false,
      message: `Tingkat kesulitan "${String(difficulty)}" tidak dikenal. Pilihannya: ${Object.keys(DIFFICULTY_PROFILES).join(", ")}.`,
    };
  }

  if (typeof botCount !== "number" || !Number.isInteger(botCount)) {
    return {
      ok: false,
      message: "Jumlah musuh harus berupa bilangan bulat.",
    };
  }

  if (botCount < MIN_BOTS || botCount > MAX_BOTS) {
    return {
      ok: false,
      message: `Jumlah musuh harus antara ${MIN_BOTS} dan ${MAX_BOTS}; diterima ${botCount}.`,
    };
  }

  return { ok: true, value: { difficulty: difficulty as Difficulty, botCount } };
}

/**
 * Pengaturan lawan milik seorang pemain.
 *
 * Pemain yang belum pernah menyimpan apa pun mendapat pengaturan BAWAAN dengan
 * `updatedAt` kosong, bukan jawaban 404. Belum memilih bukan keadaan galat —
 * layar pengaturan tetap harus bisa menampilkan sesuatu — dan `updatedAt` yang
 * kosong itulah yang memberi tahu klien bahwa angkanya belum pernah dipilih
 * sendiri oleh pemain.
 */
export function loadOpponentSettings(playerId: number): OpponentSettingsPayload {
  const [row] = db
    .select()
    .from(opponentSettings)
    .where(eq(opponentSettings.playerId, playerId))
    .limit(1)
    .all();

  if (!row) {
    return { ...DEFAULT_MATCH_SETUP, updatedAt: null };
  }

  return {
    difficulty: row.difficulty,
    botCount: row.botCount,
    updatedAt: row.updatedAt,
  };
}

/**
 * Menyimpan pengaturan lawan seorang pemain.
 *
 * Ditulis sebagai SATU upsert, bukan "cari dulu, lalu insert atau update".
 * Dua permintaan yang datang hampir bersamaan pada urutan yang kedua akan
 * sama-sama melihat baris belum ada lalu sama-sama menyisipkan, dan yang kalah
 * cepat gagal karena indeks unik. Dengan upsert, yang datang belakangan cukup
 * menimpa.
 */
export function saveOpponentSettings(
  playerId: number,
  value: { difficulty: Difficulty; botCount: number },
): OpponentSettingsPayload {
  const now = sql`(unixepoch() * 1000)`;

  const [row] = db
    .insert(opponentSettings)
    .values({ playerId, difficulty: value.difficulty, botCount: value.botCount })
    .onConflictDoUpdate({
      target: opponentSettings.playerId,
      set: {
        difficulty: value.difficulty,
        botCount: value.botCount,
        updatedAt: now,
      },
    })
    .returning()
    .all();

  return {
    difficulty: row.difficulty,
    botCount: row.botCount,
    updatedAt: row.updatedAt,
  };
}
