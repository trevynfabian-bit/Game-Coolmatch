import { eq, ne, sql } from "drizzle-orm";
import {
  PLAYER_NAME_MAX,
  PLAYER_NAME_MIN,
  checkPlayerName,
  normalizePlayerName,
  type PlayerNameProblem,
} from "@/lib/game/player-name";
import { BOT_NAMES } from "@/lib/mock/bots";
import { db } from "@/server/db/client";
import { players } from "@/server/db/schema";
import { hasOpenMatch } from "@/server/matches/match-store";

/** Bentuk yang dikirim dan diterima endpoint nama pemain. */
export interface PlayerProfilePayload {
  name: string;
  /** Benar setelah pemain menuliskan namanya sendiri, bukan memakai bawaan. */
  hasNamed: boolean;
  createdAt: number;
  updatedAt: number;
}

export type ParsedPlayerName =
  | { ok: true; value: { name: string } }
  | { ok: false; message: string };

/**
 * Kalimat server untuk tiap alasan penolakan.
 *
 * Sengaja terpisah dari kalimat yang dipakai formnya, meskipun aturannya sama
 * persis. Itulah gunanya `checkPlayerName` mengembalikan KODE: bantuan di bawah
 * isian ditulis untuk orang yang sedang mengetik ("Tulis dulu namanya"),
 * sedangkan jawaban API ditulis untuk yang membaca galat — dua pembaca, dua
 * register, satu aturan.
 */
const PROBLEM_MESSAGE: Record<PlayerNameProblem, string> = {
  kosong: "Nama tidak boleh kosong.",
  "terlalu-pendek": `Nama minimal ${PLAYER_NAME_MIN} huruf.`,
  "terlalu-panjang": `Nama maksimal ${PLAYER_NAME_MAX} huruf.`,
  "karakter-terlarang":
    "Nama hanya boleh berisi huruf, angka, spasi, serta tanda titik, strip, dan garis bawah.",
  "tanpa-huruf": "Nama harus memuat setidaknya satu huruf atau angka.",
  "sudah-dipakai": "Nama itu dipakai salah satu lawan otomatis.",
};

/**
 * Memeriksa badan permintaan penyimpanan nama.
 *
 * Aturannya milik `lib/game/player-name`, yang sama dengan yang dipakai layar —
 * bukan disalin ke sini. Nama yang lolos di form karena itu tidak bisa ditolak
 * server, dan sebaliknya; kalau keduanya punya salinan aturan sendiri, yang
 * pertama berselisih adalah nama yang paling jarang diketik orang, jadi
 * selisihnya baru ketahuan lama sesudah ditulis.
 */
export function parsePlayerName(body: unknown): ParsedPlayerName {
  // Array ikut ditolak di sini: `typeof [] === "object"`, jadi tanpa ini sebuah
  // array baru gagal di pemeriksaan berikutnya dengan alasan yang salah.
  if (typeof body !== "object" || body === null || Array.isArray(body)) {
    return { ok: false, message: "Badan permintaan harus berupa objek JSON." };
  }

  const { name } = body as Record<string, unknown>;
  if (typeof name !== "string") {
    return { ok: false, message: "Nama harus berupa teks." };
  }

  const problem = checkPlayerName(name, BOT_NAMES);
  if (problem) return { ok: false, message: PROBLEM_MESSAGE[problem] };

  // Yang disimpan adalah nama yang SUDAH dirapikan, bukan yang diketik apa
  // adanya: tanpa itu "Rio   Ganteng" dan "Rio Ganteng" jadi dua nama berbeda
  // yang terlihat sama persis di papan skor.
  return { ok: true, value: { name: normalizePlayerName(name) } };
}

function toPayload(row: {
  name: string;
  hasNamed: boolean;
  createdAt: number;
  updatedAt: number;
}): PlayerProfilePayload {
  return {
    name: row.name,
    hasNamed: row.hasNamed,
    createdAt: row.createdAt,
    updatedAt: row.updatedAt,
  };
}

/** Profil pemain: namanya, dan apakah ia sudah pernah menamainya sendiri. */
export function loadPlayerProfile(playerId: number): PlayerProfilePayload {
  const [row] = db
    .select()
    .from(players)
    .where(eq(players.id, playerId))
    .limit(1)
    .all();

  if (!row) throw new Error(`Pemain ${playerId} tidak ada`);
  return toPayload(row);
}

/**
 * Menyimpan nama pemain — baik penamaan pertama maupun penggantian.
 *
 * Keduanya satu jalur karena memang satu tindakan: menetapkan nama pemain ke
 * nilai yang dikirim. Memisahkannya jadi dua endpoint berarti dua tempat yang
 * harus sama-sama mengingat penjagaan di bawah ini, dan yang terlupa adalah
 * yang lebih jarang dipakai.
 *
 * `hasNamed` selalu dinaikkan jadi benar, termasuk ketika nama yang disimpan
 * kebetulan sama dengan nama bawaan. Pemain yang sengaja memilih nama itu sudah
 * melewati onboarding, dan menganggapnya belum akan mengirimnya ke sana lagi
 * setiap kali.
 *
 * Nama yang sudah dipakai pemain LAIN ditolak lebih dulu. Indeks uniknya akan
 * menolaknya juga, tetapi sebagai kegagalan database yang keluar jadi 500 —
 * padahal penyebabnya ada di permintaannya.
 */
export function savePlayerName(
  playerId: number,
  value: { name: string },
):
  | { ok: true; profile: PlayerProfilePayload; previousName: string }
  | { ok: false; status: number; message: string } {
  const sebelumnya = loadPlayerProfile(playerId);

  /*
    Nama tidak boleh berganti selagi ada pertandingan yang belum ditutup.

    Daftar peserta sebuah pertandingan dikunci saat ia dimulai, dan kejadian
    kill dicocokkan dengan NAMA peserta, bukan id pemain. Mengganti nama di
    tengah jalan memutus pencocokan itu dari kedua arah: kalau baris pesertanya
    ikut diganti, kejadian yang dikirim arena — yang masih memegang nama sejak
    awal — berhenti dikenali; kalau tidak diganti, papan skor menampilkan nama
    yang bukan namanya lagi. Menolak dengan alasan yang jelas lebih baik
    daripada memilih salah satu kerusakan itu.
  */
  if (hasOpenMatch(playerId)) {
    return {
      ok: false,
      status: 409,
      message:
        "Nama tidak bisa diganti selagi ada pertandingan berjalan. Selesaikan dulu pertandingannya.",
    };
  }

  const bentrok = db
    .select({ id: players.id })
    .from(players)
    .where(sql`${eq(players.name, value.name)} AND ${ne(players.id, playerId)}`)
    .limit(1)
    .all();

  if (bentrok.length > 0) {
    return {
      ok: false,
      status: 400,
      message: "Nama itu sudah dipakai pemain lain.",
    };
  }

  const [row] = db
    .update(players)
    .set({
      name: value.name,
      hasNamed: true,
      updatedAt: sql`(unixepoch() * 1000)`,
    })
    .where(eq(players.id, playerId))
    .returning()
    .all();

  if (!row) {
    return { ok: false, status: 404, message: "Pemain tidak ditemukan." };
  }

  // Nama lamanya ikut dikembalikan supaya layar bisa memastikan penggantiannya
  // — "Rio sekarang Dina" — alih-alih hanya menampilkan nama yang baru dan
  // membiarkan pemain menebak apakah permintaannya benar-benar berlaku.
  return { ok: true, profile: toPayload(row), previousName: sebelumnya.name };
}
