import { and, asc, eq, sql } from "drizzle-orm";
import { killScore } from "@/lib/game/damage";
import { rankScores } from "@/lib/game/scoreboard";
import {
  DIFFICULTY_PROFILES,
  MAX_BOTS,
  MIN_BOTS,
} from "@/lib/game/difficulty";
import type { Difficulty, MatchScoreLine } from "@/types/game";
import { db } from "@/server/db/client";
import { matchRounds, matchScores, matches } from "@/server/db/schema";
import { ensureMapRow, findMapName } from "@/server/maps/map-store";

/** Satu peserta pertandingan saat pertandingan dimulai. */
export interface ParticipantInput {
  name: string;
  isBot: boolean;
  color: string;
}

export interface StartMatchInput {
  mapId: string;
  mapName: string;
  mapDescription: string;
  difficulty: Difficulty;
  botCount: number;
  totalRounds: number;
  scoreLimit: number;
  roundSeconds: number;
  participants: ParticipantInput[];
}

export interface KillInput {
  killerName: string;
  victimName: string;
  isHeadshot: boolean;
}

/** Perolehan satu peserta sesudah sebuah kejadian dicatat. */
export interface ScoreLineSnapshot {
  participantName: string;
  kills: number;
  deaths: number;
  score: number;
}

export type Parsed<T> = { ok: true; value: T } | { ok: false; message: string };

function nonEmptyString(value: unknown): value is string {
  return typeof value === "string" && value.trim().length > 0;
}

function positiveInt(value: unknown): value is number {
  return typeof value === "number" && Number.isInteger(value) && value > 0;
}

/** Memeriksa badan permintaan "mulai pertandingan". */
export function parseStartMatch(body: unknown): Parsed<StartMatchInput> {
  if (typeof body !== "object" || body === null || Array.isArray(body)) {
    return { ok: false, message: "Badan permintaan harus berupa objek JSON." };
  }
  const b = body as Record<string, unknown>;

  if (!nonEmptyString(b.mapId) || !nonEmptyString(b.mapName)) {
    return { ok: false, message: "Peta harus punya id dan nama." };
  }
  if (typeof b.difficulty !== "string" || !(b.difficulty in DIFFICULTY_PROFILES)) {
    return {
      ok: false,
      message: `Tingkat kesulitan "${String(b.difficulty)}" tidak dikenal.`,
    };
  }
  if (
    typeof b.botCount !== "number" ||
    !Number.isInteger(b.botCount) ||
    b.botCount < MIN_BOTS ||
    b.botCount > MAX_BOTS
  ) {
    return {
      ok: false,
      message: `Jumlah musuh harus bilangan bulat antara ${MIN_BOTS} dan ${MAX_BOTS}.`,
    };
  }
  if (!positiveInt(b.totalRounds) || !positiveInt(b.scoreLimit) || !positiveInt(b.roundSeconds)) {
    return {
      ok: false,
      message: "Jumlah ronde, batas kill, dan lama ronde harus bilangan bulat positif.",
    };
  }
  if (!Array.isArray(b.participants) || b.participants.length < 2) {
    return { ok: false, message: "Pertandingan butuh minimal dua peserta." };
  }

  const participants: ParticipantInput[] = [];
  for (const raw of b.participants) {
    if (typeof raw !== "object" || raw === null) {
      return { ok: false, message: "Tiap peserta harus berupa objek." };
    }
    const p = raw as Record<string, unknown>;
    if (!nonEmptyString(p.name)) {
      return { ok: false, message: "Tiap peserta harus punya nama." };
    }
    if (typeof p.isBot !== "boolean") {
      return { ok: false, message: `Peserta "${p.name}" harus menyatakan isBot.` };
    }
    if (!nonEmptyString(p.color)) {
      return { ok: false, message: `Peserta "${p.name}" harus punya warna.` };
    }
    participants.push({ name: p.name, isBot: p.isBot, color: p.color });
  }

  const names = new Set(participants.map((p) => p.name));
  if (names.size !== participants.length) {
    return { ok: false, message: "Nama peserta tidak boleh kembar." };
  }
  // Papan skor membedakan baris pemain dari baris bot lewat isBot, jadi tepat
  // satu peserta yang bukan bot: nol membuat perolehan pemain tidak punya
  // tempat, lebih dari satu membuat "pemain lokal" jadi ambigu.
  if (participants.filter((p) => !p.isBot).length !== 1) {
    return { ok: false, message: "Harus ada tepat satu peserta yang bukan bot." };
  }

  return {
    ok: true,
    value: {
      mapId: b.mapId,
      mapName: b.mapName,
      mapDescription: nonEmptyString(b.mapDescription) ? b.mapDescription : "",
      difficulty: b.difficulty as Difficulty,
      botCount: b.botCount,
      totalRounds: b.totalRounds,
      scoreLimit: b.scoreLimit,
      roundSeconds: b.roundSeconds,
      participants,
    },
  };
}

/** Memeriksa badan permintaan "rekam kill". */
export function parseKill(body: unknown): Parsed<KillInput> {
  if (typeof body !== "object" || body === null || Array.isArray(body)) {
    return { ok: false, message: "Badan permintaan harus berupa objek JSON." };
  }
  const b = body as Record<string, unknown>;

  if (!nonEmptyString(b.killerName) || !nonEmptyString(b.victimName)) {
    return { ok: false, message: "Nama penembak dan korban harus diisi." };
  }
  if (b.killerName === b.victimName) {
    return { ok: false, message: "Penembak dan korban tidak boleh orang yang sama." };
  }
  if (typeof b.isHeadshot !== "boolean") {
    return { ok: false, message: "isHeadshot harus bernilai true atau false." };
  }

  return {
    ok: true,
    value: {
      killerName: b.killerName,
      victimName: b.victimName,
      isHeadshot: b.isHeadshot,
    },
  };
}

/**
 * Membuka sebuah pertandingan baru beserta baris perolehan seluruh pesertanya.
 *
 * Daftar peserta dikunci di sini, bukan dibuat menyusul saat kill pertama
 * dicatat. Sebabnya: baris perolehan butuh warna dan status bot tiap peserta,
 * dan keduanya hanya diketahui saat roster disusun. Membuatnya menyusul berarti
 * endpoint kill harus mengarang warna untuk nama yang belum dikenalnya.
 *
 * `endedAt` sengaja dibiarkan kosong. Pertandingan yang ditinggal di tengah
 * jalan karena itu tetap punya barisnya beserta perolehan sejauh yang sempat
 * tercatat, alih-alih hilang tanpa jejak.
 */
export function startMatch(playerId: number, input: StartMatchInput): number {
  return db.transaction((tx) => {
    ensureMapRow({
      id: input.mapId,
      name: input.mapName,
      description: input.mapDescription,
      previewUrl: null,
    });

    const [row] = tx
      .insert(matches)
      .values({
        playerId,
        mapId: input.mapId,
        difficulty: input.difficulty,
        botCount: input.botCount,
        totalRounds: input.totalRounds,
        scoreLimit: input.scoreLimit,
        roundSeconds: input.roundSeconds,
      })
      .returning()
      .all();

    tx.insert(matchScores)
      .values(
        input.participants.map((p) => ({
          matchId: row.id,
          participantName: p.name,
          isBot: p.isBot,
          color: p.color,
        })),
      )
      .run();

    return row.id;
  });
}

export type RecordKillResult =
  | { ok: true; killer: ScoreLineSnapshot; victim: ScoreLineSnapshot }
  | { ok: false; status: 404 | 409; message: string };

/**
 * Mencatat satu tembakan mematikan: penembak bertambah satu kill beserta
 * nilainya, korban bertambah satu kematian.
 *
 * Nilai per kill dihitung `killScore` — fungsi yang sama dengan yang dipakai
 * arena — sehingga skor yang tersimpan tidak bisa berselisih dengan skor yang
 * dilihat pemain di layar.
 *
 * Keduanya diperbarui dalam SATU transaksi. Kalau tidak, kegagalan di tengah
 * bisa meninggalkan kill yang tercatat tanpa kematian pasangannya, dan papan
 * skor jadi tidak mungkin dijumlahkan.
 *
 * Catatan penting soal pengulangan: permintaan yang dikirim dua kali akan
 * dihitung dua kali. Itu dibiarkan karena catatan bertahap ini bukan sumber
 * kebenaran — gunanya menyelamatkan perolehan pertandingan yang DITINGGAL di
 * tengah jalan. Pertandingan yang selesai dengan wajar ditutup dengan total
 * akhir dari arena, yang menimpa akumulasi di sini.
 */
export function recordKill(matchId: number, input: KillInput): RecordKillResult {
  return db.transaction((tx) => {
    const [match] = tx
      .select()
      .from(matches)
      .where(eq(matches.id, matchId))
      .limit(1)
      .all();

    if (!match) {
      return { ok: false, status: 404, message: "Pertandingan tidak ditemukan." };
    }
    if (match.endedAt !== null) {
      // Menolak di sini menutup jalur paling mungkin bagi catatan yang
      // menyimpang: kejadian yang datang terlambat sesudah total akhir ditulis.
      return {
        ok: false,
        status: 409,
        message: "Pertandingan sudah ditutup, kejadian baru tidak bisa dicatat.",
      };
    }

    const lines = tx
      .select()
      .from(matchScores)
      .where(eq(matchScores.matchId, matchId))
      .all();

    const known = new Set(lines.map((line) => line.participantName));
    for (const name of [input.killerName, input.victimName]) {
      if (!known.has(name)) {
        return {
          ok: false,
          status: 404,
          message: `"${name}" bukan peserta pertandingan ini.`,
        };
      }
    }

    const nilai = killScore(input.isHeadshot);

    const [killer] = tx
      .update(matchScores)
      .set({
        kills: sql`${matchScores.kills} + 1`,
        score: sql`${matchScores.score} + ${nilai}`,
      })
      .where(
        and(
          eq(matchScores.matchId, matchId),
          eq(matchScores.participantName, input.killerName),
        ),
      )
      .returning()
      .all();

    const [victim] = tx
      .update(matchScores)
      .set({ deaths: sql`${matchScores.deaths} + 1` })
      .where(
        and(
          eq(matchScores.matchId, matchId),
          eq(matchScores.participantName, input.victimName),
        ),
      )
      .returning()
      .all();

    const ringkas = (row: typeof killer): ScoreLineSnapshot => ({
      participantName: row.participantName,
      kills: row.kills,
      deaths: row.deaths,
      score: row.score,
    });

    return { ok: true, killer: ringkas(killer), victim: ringkas(victim) };
  });
}

/**
 * Keadaan sebuah pertandingan beserta papan skornya saat ini.
 *
 * Bentuk baris skornya sengaja `MatchScoreLine` — tipe yang SAMA dengan yang
 * sudah dipakai halaman skor dan komponen barisnya — supaya klien tidak perlu
 * menerjemahkan apa pun, dan supaya penambahan kolom baru nanti tidak bisa
 * lolos hanya di salah satu sisi.
 */
export interface LiveScoreboard {
  matchId: number;
  mapId: string;
  mapName: string;
  difficulty: Difficulty;
  botCount: number;
  totalRounds: number;
  scoreLimit: number;
  roundSeconds: number;
  /** "berjalan" selama `endedAt` masih kosong. */
  status: "berjalan" | "selesai";
  result: string | null;
  winnerName: string | null;
  startedAt: number;
  endedAt: number | null;
  /** Ronde yang sudah selesai; diturunkan dari catatan ronde, bukan disimpan. */
  roundsPlayed: number;
  /** Sudah TERURUT sebagai klasemen; klien tinggal menampilkannya. */
  scoreboard: MatchScoreLine[];
}

/**
 * Papan skor sebuah pertandingan apa adanya saat ini.
 *
 * Urutannya ditentukan `rankScores` — fungsi yang sama dengan yang dipakai
 * klasemen di klien — jadi papan skor yang datang dari server tidak mungkin
 * berurutan berbeda dari yang tampil di arena. Mengurutkannya di sini juga
 * berarti klien tidak perlu tahu bahwa juara ditentukan kemenangan ronde lebih
 * dulu, baru skor.
 *
 * Mengembalikan null bila pertandingannya tidak ada, supaya pemanggil yang
 * memutuskan itu 404 — modul ini tidak tahu apa-apa soal HTTP.
 */
export function loadLiveScoreboard(matchId: number): LiveScoreboard | null {
  const [match] = db
    .select()
    .from(matches)
    .where(eq(matches.id, matchId))
    .limit(1)
    .all();

  if (!match) return null;

  const lines = db
    .select()
    .from(matchScores)
    .where(eq(matchScores.matchId, matchId))
    .orderBy(asc(matchScores.id))
    .all();

  const [{ jumlah }] = db
    .select({ jumlah: sql<number>`COUNT(*)` })
    .from(matchRounds)
    .where(eq(matchRounds.matchId, matchId))
    .all();

  const scoreboard = rankScores(
    lines.map((line): MatchScoreLine => ({
      id: String(line.id),
      participantName: line.participantName,
      isBot: line.isBot,
      // Satu-satunya peserta yang bukan bot adalah pemain di perangkat ini;
      // itu dijamin saat pertandingan dibuka.
      isLocal: !line.isBot,
      kills: line.kills,
      deaths: line.deaths,
      score: line.score,
      roundWins: line.roundWins,
      isWinner: line.isWinner,
      color: line.color,
    })),
  );

  return {
    matchId: match.id,
    mapId: match.mapId,
    // Nama peta diambil dari tabelnya, bukan disalin ke baris pertandingan:
    // satu peta dipakai banyak pertandingan, dan menyalinnya berarti mengubah
    // nama peta harus menyentuh seluruh riwayat.
    mapName: findMapName(match.mapId) ?? match.mapId,
    difficulty: match.difficulty,
    botCount: match.botCount,
    totalRounds: match.totalRounds,
    scoreLimit: match.scoreLimit,
    roundSeconds: match.roundSeconds,
    status: match.endedAt === null ? "berjalan" : "selesai",
    result: match.result,
    winnerName: match.winnerName,
    startedAt: match.startedAt,
    endedAt: match.endedAt,
    roundsPlayed: Number(jumlah),
    scoreboard,
  };
}
