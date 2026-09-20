import { and, asc, eq, isNull, sql } from "drizzle-orm";
import { killScore } from "@/lib/game/damage";
import {
  findMatchWinner,
  findRoundWinner,
  hasClinchedMatch,
  hasReachedScoreLimit,
} from "@/lib/game/round";
import { rankScores } from "@/lib/game/scoreboard";
import { DIFFICULTY_PROFILES, MAX_BOTS, MIN_BOTS } from "@/lib/game/difficulty";
import type {
  Difficulty,
  MatchResult,
  MatchRoundResult,
  MatchScoreLine,
} from "@/types/game";
import { db } from "@/server/db/client";
import { matchRounds, matchScores, matches } from "@/server/db/schema";
import { ensureMapCatalogue, findMapName } from "@/server/maps/map-store";
import {
  addMatchToProgress,
  loadPlayerProgress,
  loadTotalDeaths,
} from "@/server/players/stats-store";
import {
  evaluateWeaponUnlocks,
  readUnlockedWeaponIds,
} from "@/server/weapons/unlock-store";

/** Satu peserta pertandingan saat pertandingan dimulai. */
export interface ParticipantInput {
  name: string;
  isBot: boolean;
  color: string;
}

export interface StartMatchInput {
  /**
   * Cukup id-nya. Nama dan deskripsi peta dibaca server dari katalognya
   * sendiri; keduanya boleh saja ikut terkirim, tetapi tidak dipercaya.
   */
  mapId: string;
  difficulty: Difficulty;
  botCount: number;
  totalRounds: number;
  scoreLimit: number;
  roundSeconds: number;
  participants: ParticipantInput[];
  /** Benar untuk pertandingan uji coba senjata; bawaannya tidak. */
  isTrial?: boolean;
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

/**
 * Badan permintaan "mulai pertandingan" sebagaimana dikirim klien.
 *
 * `mapId` boleh tidak ada: pemain sudah punya peta pilihan yang tersimpan di
 * server, dan itulah jawaban yang benar untuk "main di peta mana". Klien yang
 * menyebutkannya tetap dilayani — arena bisa saja dibuka langsung pada sebuah
 * peta — tetapi menyebutkannya bukan syarat.
 */
export type StartMatchRequest = Omit<StartMatchInput, "mapId"> & {
  mapId?: string;
};

/** Memeriksa badan permintaan "mulai pertandingan". */
export function parseStartMatch(body: unknown): Parsed<StartMatchRequest> {
  if (typeof body !== "object" || body === null || Array.isArray(body)) {
    return { ok: false, message: "Badan permintaan harus berupa objek JSON." };
  }
  const b = body as Record<string, unknown>;

  // Boleh tidak ada — peta pilihan pemain yang dipakai. Kalau ada, harus
  // berupa teks yang berisi: `{ mapId: "" }` adalah permintaan yang salah,
  // bukan permintaan tanpa peta.
  if (b.mapId !== undefined && !nonEmptyString(b.mapId)) {
    return { ok: false, message: "Id peta tidak boleh kosong." };
  }
  if (
    typeof b.difficulty !== "string" ||
    !(b.difficulty in DIFFICULTY_PROFILES)
  ) {
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
  if (
    !positiveInt(b.totalRounds) ||
    !positiveInt(b.scoreLimit) ||
    !positiveInt(b.roundSeconds)
  ) {
    return {
      ok: false,
      message:
        "Jumlah ronde, batas kill, dan lama ronde harus bilangan bulat positif.",
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
      return {
        ok: false,
        message: `Peserta "${p.name}" harus menyatakan isBot.`,
      };
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
    return {
      ok: false,
      message: "Harus ada tepat satu peserta yang bukan bot.",
    };
  }

  return {
    ok: true,
    value: {
      ...(b.mapId === undefined ? {} : { mapId: b.mapId as string }),
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
    return {
      ok: false,
      message: "Penembak dan korban tidak boleh orang yang sama.",
    };
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
    /*
      Katalog peta ditulis dari katalog di KODE, bukan dari badan permintaan.
      Sebelumnya nama dan deskripsi peta diambil dari yang dikirim klien, dan
      itu berarti setiap pertandingan menimpa keterangan katalog dengan apa pun
      yang kebetulan dikirim — termasuk menimpa deskripsi lengkap sebuah peta
      dengan potongan seadanya. Kunci asing `map_id` yang menjaga sisanya:
      peta yang tidak ada di katalog tidak punya baris, jadi pertandingannya
      ditolak alih-alih diam-diam menciptakan peta baru.
    */
    ensureMapCatalogue();

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
        isTrial: input.isTrial ?? false,
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
/**
 * Benar bila pemain punya pertandingan yang belum ditutup.
 *
 * Dipakai penggantian nama. Daftar peserta sebuah pertandingan DIKUNCI saat ia
 * dimulai — kejadian kill dicocokkan dengan nama peserta, bukan dengan id
 * pemain — jadi mengganti nama di tengah pertandingan memutus pencocokan itu:
 * arena masih memakai nama yang dipegangnya sejak awal, sementara barisnya
 * sudah bernama lain.
 */
export function hasOpenMatch(playerId: number): boolean {
  const [row] = db
    .select({ id: matches.id })
    .from(matches)
    .where(and(eq(matches.playerId, playerId), isNull(matches.endedAt)))
    .limit(1)
    .all();
  return row !== undefined;
}

export function recordKill(
  matchId: number,
  input: KillInput,
): RecordKillResult {
  return db.transaction((tx) => {
    const [match] = tx
      .select()
      .from(matches)
      .where(eq(matches.id, matchId))
      .limit(1)
      .all();

    if (!match) {
      return {
        ok: false,
        status: 404,
        message: "Pertandingan tidak ditemukan.",
      };
    }
    if (match.endedAt !== null) {
      // Menolak di sini menutup jalur paling mungkin bagi catatan yang
      // menyimpang: kejadian yang datang terlambat sesudah total akhir ditulis.
      return {
        ok: false,
        status: 409,
        message:
          "Pertandingan sudah ditutup, kejadian baru tidak bisa dicatat.",
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
  /** Hasil tiap ronde, urut dari ronde pertama. */
  rounds: MatchRoundResult[];
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

  const rounds = db
    .select()
    .from(matchRounds)
    .where(eq(matchRounds.matchId, matchId))
    .orderBy(asc(matchRounds.roundNumber))
    .all();

  const scoreboard = rankScores(
    lines.map(
      (line): MatchScoreLine => ({
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
      }),
    ),
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
    roundsPlayed: rounds.length,
    rounds: rounds.map((row) => ({
      roundNumber: row.roundNumber,
      winnerName: row.winnerName,
      endedReason: row.endedReason,
      playerKills: row.playerKills,
    })),
    scoreboard,
  };
}

/** Kill tiap peserta pada satu ronde, dikirim klien saat rondenya ditutup. */
export interface RoundKillInput {
  participantName: string;
  roundKills: number;
}

export interface FinishRoundInput {
  roundNumber: number;
  kills: RoundKillInput[];
}

/** Memeriksa badan permintaan "tutup ronde". */
export function parseFinishRound(body: unknown): Parsed<FinishRoundInput> {
  if (typeof body !== "object" || body === null || Array.isArray(body)) {
    return { ok: false, message: "Badan permintaan harus berupa objek JSON." };
  }
  const b = body as Record<string, unknown>;

  if (!positiveInt(b.roundNumber)) {
    return { ok: false, message: "Nomor ronde harus bilangan bulat positif." };
  }
  if (!Array.isArray(b.kills) || b.kills.length === 0) {
    return {
      ok: false,
      message: "Kill tiap peserta pada ronde ini harus disertakan.",
    };
  }

  const kills: RoundKillInput[] = [];
  for (const raw of b.kills) {
    if (typeof raw !== "object" || raw === null) {
      return { ok: false, message: "Tiap perolehan ronde harus berupa objek." };
    }
    const k = raw as Record<string, unknown>;
    if (!nonEmptyString(k.participantName)) {
      return {
        ok: false,
        message: "Tiap perolehan ronde harus menyebut nama peserta.",
      };
    }
    if (
      typeof k.roundKills !== "number" ||
      !Number.isInteger(k.roundKills) ||
      k.roundKills < 0
    ) {
      return {
        ok: false,
        message: `Kill ronde "${k.participantName}" harus bilangan bulat tidak negatif.`,
      };
    }
    kills.push({
      participantName: k.participantName,
      roundKills: k.roundKills,
    });
  }

  if (new Set(kills.map((k) => k.participantName)).size !== kills.length) {
    return { ok: false, message: "Nama peserta tidak boleh disebut dua kali." };
  }

  return { ok: true, value: { roundNumber: b.roundNumber, kills } };
}

export type FinishRoundResult =
  | {
      ok: true;
      /** Pemenang ronde ini; null bila rondenya berakhir seri. */
      roundWinner: string | null;
      /** Benar bila ronde ini menutup seluruh pertandingan. */
      matchEnded: boolean;
      /** Juara pertandingan; hanya terisi saat `matchEnded`. */
      matchWinner: string | null;
      /** Hasil dari sudut pandang pemain; hanya terisi saat `matchEnded`. */
      result: MatchResult | null;
      scoreboard: MatchScoreLine[];
    }
  | { ok: false; status: 404 | 409 | 400; message: string };

/**
 * Menutup satu ronde dan, bila syarat kemenangan sudah terpenuhi, menutup
 * seluruh pertandingan.
 *
 * Seluruh aturannya diambil dari lib/game/round — `findRoundWinner`,
 * `hasReachedScoreLimit`, `hasClinchedMatch`, dan `findMatchWinner` — yaitu
 * fungsi yang SAMA persis dengan yang dipakai arena. Itu yang membuat juara
 * versi server tidak mungkin berbeda dari juara yang diumumkan layar akhir
 * kepada pemain. Menuliskan ulang aturannya di sini akan cepat atau lambat
 * menghasilkan dua kebenaran yang berbeda.
 *
 * Yang dikirim klien hanyalah FAKTA rondenya — siapa membunuh berapa kali.
 * Server tidak menerima klaim "si anu menang": kesimpulannya dihitung di sini.
 *
 * Nomor ronde harus tepat melanjutkan ronde terakhir yang tercatat. Itu yang
 * menahan permintaan yang terkirim dua kali agar tidak menambah kemenangan
 * ronde dua kali, sekaligus menahan ronde yang bolong.
 */
export function finishRound(
  matchId: number,
  input: FinishRoundInput,
): FinishRoundResult {
  return db.transaction((tx) => {
    const [match] = tx
      .select()
      .from(matches)
      .where(eq(matches.id, matchId))
      .limit(1)
      .all();

    if (!match) {
      return {
        ok: false,
        status: 404,
        message: "Pertandingan tidak ditemukan.",
      };
    }
    if (match.endedAt !== null) {
      return {
        ok: false,
        status: 409,
        message: "Pertandingan sudah ditutup, ronde baru tidak bisa dicatat.",
      };
    }

    const sudah = tx
      .select()
      .from(matchRounds)
      .where(eq(matchRounds.matchId, matchId))
      .all();
    const berikutnya = sudah.length + 1;
    if (input.roundNumber !== berikutnya) {
      return {
        ok: false,
        status: 409,
        message: `Ronde berikutnya adalah ronde ${berikutnya}, bukan ${input.roundNumber}.`,
      };
    }

    const lines = tx
      .select()
      .from(matchScores)
      .where(eq(matchScores.matchId, matchId))
      .all();
    const byName = new Map(lines.map((line) => [line.participantName, line]));

    for (const k of input.kills) {
      if (!byName.has(k.participantName)) {
        return {
          ok: false,
          status: 404,
          message: `"${k.participantName}" bukan peserta pertandingan ini.`,
        };
      }
    }

    // Peserta yang tidak disebut dianggap nol kill pada ronde ini; itu keadaan
    // yang wajar dan tidak perlu dipaksa disertakan klien.
    const roundKills = new Map<string, number>(
      lines.map((line) => [line.participantName, 0]),
    );
    for (const k of input.kills)
      roundKills.set(k.participantName, k.roundKills);

    const standings = lines.map((line) => ({
      name: line.participantName,
      isBot: line.isBot,
      roundKills: roundKills.get(line.participantName) ?? 0,
      roundWins: line.roundWins,
      kills: line.kills,
      deaths: line.deaths,
    }));

    const winner = findRoundWinner(standings);

    tx.insert(matchRounds)
      .values({
        matchId,
        roundNumber: input.roundNumber,
        winnerName: winner?.name ?? null,
        endedReason: hasReachedScoreLimit(standings, match.scoreLimit)
          ? "batas_kill"
          : "waktu_habis",
        playerKills: standings.find((s) => !s.isBot)?.roundKills ?? 0,
      })
      .run();

    if (winner) {
      tx.update(matchScores)
        .set({ roundWins: sql`${matchScores.roundWins} + 1` })
        .where(
          and(
            eq(matchScores.matchId, matchId),
            eq(matchScores.participantName, winner.name),
          ),
        )
        .run();
      winner.roundWins += 1;
    }

    /**
     * Pertandingan berhenti pada ronde terakhir, ATAU lebih awal begitu gelar
     * tidak bisa berpindah lagi. Memainkan sisa ronde yang sudah tidak
     * mengubah apa pun hanya menahan pemain di pertandingan yang hasilnya
     * sudah ditentukan.
     */
    const isLastRound = input.roundNumber >= match.totalRounds;
    const isDecided =
      isLastRound ||
      hasClinchedMatch(standings, input.roundNumber, match.totalRounds);

    let matchWinner: string | null = null;
    let result: MatchResult | null = null;

    if (isDecided) {
      matchWinner = findMatchWinner(standings)?.name ?? null;
      const local = standings.find((s) => !s.isBot);
      result = !matchWinner
        ? "seri"
        : local && matchWinner === local.name
          ? "menang"
          : "kalah";

      tx.update(matches)
        .set({
          endedAt: sql`(unixepoch() * 1000)`,
          result,
          winnerName: matchWinner,
        })
        .where(eq(matches.id, matchId))
        .run();

      if (matchWinner) {
        tx.update(matchScores)
          .set({ isWinner: true })
          .where(
            and(
              eq(matchScores.matchId, matchId),
              eq(matchScores.participantName, matchWinner),
            ),
          )
          .run();
      }
    }

    return {
      ok: true,
      roundWinner: winner?.name ?? null,
      matchEnded: isDecided,
      matchWinner,
      result,
      scoreboard: loadLiveScoreboard(matchId)!.scoreboard,
    };
  });
}

/** Perolehan akhir satu peserta, dihitung arena sepanjang pertandingan. */
export interface FinalScoreInput {
  participantName: string;
  kills: number;
  deaths: number;
  score: number;
  roundWins: number;
}

export interface FinishMatchInput {
  /**
   * "selesai" berarti pertandingan berakhir wajar dan juaranya ditentukan.
   * "ditinggal" berarti pemain keluar di tengah jalan — perolehan sejauh itu
   * tetap disimpan, tetapi tidak ada yang berhak disebut juara.
   */
  reason: "selesai" | "ditinggal";
  /** Total akhir dari arena; boleh kosong, lihat catatan pada finishMatch. */
  scores?: FinalScoreInput[];
}

/** Memeriksa badan permintaan "tutup pertandingan". */
export function parseFinishMatch(body: unknown): Parsed<FinishMatchInput> {
  if (typeof body !== "object" || body === null || Array.isArray(body)) {
    return { ok: false, message: "Badan permintaan harus berupa objek JSON." };
  }
  const b = body as Record<string, unknown>;

  if (b.reason !== "selesai" && b.reason !== "ditinggal") {
    return {
      ok: false,
      message: 'Sebab berakhir harus "selesai" atau "ditinggal".',
    };
  }

  if (b.scores === undefined) {
    return { ok: true, value: { reason: b.reason } };
  }
  if (!Array.isArray(b.scores)) {
    return { ok: false, message: "Perolehan akhir harus berupa daftar." };
  }

  const scores: FinalScoreInput[] = [];
  for (const raw of b.scores) {
    if (typeof raw !== "object" || raw === null) {
      return { ok: false, message: "Tiap perolehan akhir harus berupa objek." };
    }
    const r = raw as Record<string, unknown>;
    if (!nonEmptyString(r.participantName)) {
      return {
        ok: false,
        message: "Tiap perolehan akhir harus menyebut nama peserta.",
      };
    }
    for (const field of ["kills", "deaths", "score", "roundWins"] as const) {
      const value = r[field];
      if (typeof value !== "number" || !Number.isInteger(value) || value < 0) {
        return {
          ok: false,
          message: `${field} milik "${r.participantName}" harus bilangan bulat tidak negatif.`,
        };
      }
    }
    scores.push({
      participantName: r.participantName,
      kills: r.kills as number,
      deaths: r.deaths as number,
      score: r.score as number,
      roundWins: r.roundWins as number,
    });
  }

  if (new Set(scores.map((s) => s.participantName)).size !== scores.length) {
    return { ok: false, message: "Nama peserta tidak boleh disebut dua kali." };
  }

  return { ok: true, value: { reason: b.reason, scores } };
}

/**
 * Kemajuan pemain sesudah pertandingan ini, beserta senjata yang terbuka
 * karenanya.
 *
 * Ikut pada jawaban penutupan pertandingan, bukan dibiarkan dijemput
 * permintaan terpisah: layar ringkasan akhir sudah ingin merayakan senjata
 * baru tepat saat peluit berbunyi, dan permintaan kedua di saat itu berarti
 * perayaan yang datang terlambat — atau tidak datang sama sekali kalau
 * permintaannya gagal.
 */
export interface MatchProgress {
  matchesPlayed: number;
  wins: number;
  totalKills: number;
  totalDeaths: number;
  /** Seluruh senjata yang dimiliki pemain sesudah pertandingan ini. */
  unlockedWeaponIds: string[];
  /** Yang baru terbuka karena pertandingan ini; kosong bila tidak ada. */
  newlyUnlockedWeaponIds: string[];
}

export type FinishMatchResult =
  | { ok: true; summary: LiveScoreboard; progress: MatchProgress }
  | { ok: false; status: 404 | 409; message: string };

/**
 * Menutup sebuah pertandingan dan menetapkan hasil akhirnya.
 *
 * Ada dua cara pertandingan berakhir, dan keduanya perlu jalur ini:
 *
 * Yang WAJAR — syarat kemenangan tercapai — biasanya sudah ditutup endpoint
 * ronde. Jalur ini tetap dibutuhkan untuk menyerahkan TOTAL AKHIR dari arena.
 * Arena-lah yang benar-benar menghitung pertarungannya; catatan bertahap di
 * server hanya penyelamat, dan permintaan yang sempat terkirim dua kali bisa
 * membuatnya menyimpang. Menimpanya dengan total arena menyelesaikan selisih
 * itu sekaligus.
 *
 * Yang DITINGGAL — pemain keluar di tengah jalan. Perolehan sejauh itu tetap
 * disimpan supaya pertandingannya tidak hilang tanpa jejak, tetapi tidak ada
 * yang berhak disebut juara: syarat kemenangannya memang tidak pernah diuji.
 *
 * Juara dihitung `findMatchWinner`, aturan yang sama dengan arena. Server tidak
 * menerima klaim juara dari klien — hanya angkanya.
 */
/** Hasil bagian yang berjalan di dalam transaksi penutupan. */
type ClosedMatch =
  | { ok: true; summary: LiveScoreboard; playerId: number; isTrial: boolean }
  | { ok: false; status: 404 | 409; message: string };

function closeMatch(matchId: number, input: FinishMatchInput): ClosedMatch {
  return db.transaction((tx) => {
    const [match] = tx
      .select()
      .from(matches)
      .where(eq(matches.id, matchId))
      .limit(1)
      .all();

    if (!match) {
      return {
        ok: false,
        status: 404,
        message: "Pertandingan tidak ditemukan.",
      };
    }
    if (match.endedAt !== null) {
      return {
        ok: false,
        status: 409,
        message: "Pertandingan sudah ditutup.",
      };
    }

    const lines = tx
      .select()
      .from(matchScores)
      .where(eq(matchScores.matchId, matchId))
      .all();
    const known = new Set(lines.map((line) => line.participantName));

    for (const s of input.scores ?? []) {
      if (!known.has(s.participantName)) {
        return {
          ok: false,
          status: 404,
          message: `"${s.participantName}" bukan peserta pertandingan ini.`,
        };
      }
    }

    for (const s of input.scores ?? []) {
      tx.update(matchScores)
        .set({
          kills: s.kills,
          deaths: s.deaths,
          score: s.score,
          roundWins: s.roundWins,
        })
        .where(
          and(
            eq(matchScores.matchId, matchId),
            eq(matchScores.participantName, s.participantName),
          ),
        )
        .run();
    }

    const akhir = tx
      .select()
      .from(matchScores)
      .where(eq(matchScores.matchId, matchId))
      .all()
      .map((line) => ({
        name: line.participantName,
        isBot: line.isBot,
        roundWins: line.roundWins,
        kills: line.kills,
        deaths: line.deaths,
      }));

    // Pertandingan yang ditinggal tidak punya juara: syarat kemenangannya tidak
    // pernah diuji, dan menobatkan yang kebetulan unggul saat pemain keluar
    // akan mencatat kemenangan yang tidak pernah diperjuangkan siapa pun.
    const matchWinner =
      input.reason === "ditinggal"
        ? null
        : (findMatchWinner(akhir)?.name ?? null);
    const local = akhir.find((s) => !s.isBot);
    const result: MatchResult =
      input.reason === "ditinggal"
        ? "ditinggal"
        : !matchWinner
          ? "seri"
          : local && matchWinner === local.name
            ? "menang"
            : "kalah";

    tx.update(matches)
      .set({
        endedAt: sql`(unixepoch() * 1000)`,
        result,
        winnerName: matchWinner,
      })
      .where(eq(matches.id, matchId))
      .run();

    // Penanda juara disetel ulang dari nol: total akhir bisa memindahkan juara
    // dari orang yang tadinya unggul menurut catatan bertahap.
    tx.update(matchScores)
      .set({ isWinner: false })
      .where(eq(matchScores.matchId, matchId))
      .run();

    if (matchWinner) {
      tx.update(matchScores)
        .set({ isWinner: true })
        .where(
          and(
            eq(matchScores.matchId, matchId),
            eq(matchScores.participantName, matchWinner),
          ),
        )
        .run();
    }

    /*
      Kemajuan pemain ditambahkan DI DALAM transaksi yang sama dengan
      penutupan pertandingannya. Pertandingan yang tercatat selesai tetapi
      tidak menambah kemajuan adalah riwayat yang membantah statistiknya
      sendiri, dan pemain yang menghitung ulang akan selalu menemukan selisih
      yang tidak bisa dijelaskan.

      Pertandingan yang DITINGGAL tetap dihitung sebagai pertandingan yang
      dimainkan — pemain memang memainkannya — tetapi tidak pernah menambah
      kemenangan. Kalau ditinggal tidak dihitung sama sekali, keluar dari
      pertandingan yang sedang kalah jadi cara gratis menjaga tingkat
      kemenangan tetap tinggi.
    */
    /*
      Pertandingan UJI COBA tidak pernah menambah kemajuan. Aturannya sengaja
      pendek dan lawannya sedikit; menghitungnya sama saja menjadikan "coba
      senjata" cara termurah memanen kill dan kemenangan, dan seluruh syarat
      buka senjata kehilangan artinya dalam semalam.

      Yang dilewati hanya penghitungannya. Pertandingannya sendiri tetap
      tercatat lengkap dengan ronde dan klasemennya — riwayat yang melompati
      sebagian pertandingan bukan riwayat.
    */
    if (local && !match.isTrial) {
      addMatchToProgress(
        match.playerId,
        { kills: local.kills, deaths: local.deaths, won: result === "menang" },
        tx,
      );
    }

    return {
      ok: true,
      summary: loadLiveScoreboard(matchId)!,
      playerId: match.playerId,
      isTrial: match.isTrial,
    };
  });
}

/**
 * Menutup pertandingan, menambah kemajuan pemain, lalu menilai senjata yang
 * terbuka karenanya.
 *
 * Penilaian senjata berjalan SESUDAH transaksi penutupan selesai, bukan di
 * dalamnya. Dua alasan: transaksi bersarang tidak dibutuhkan untuk sesuatu
 * yang bisa diulang, dan penilaian senjata memang dirancang tahan diulang —
 * ia membandingkan catatan kepemilikan dengan syarat, bukan kemajuan sebelum
 * dan sesudah. Kalau proses mati tepat di antara keduanya, pertandingan tetap
 * tercatat selesai dan kemajuannya tetap bertambah; senjata yang belum sempat
 * diberikan akan menyusul pada penilaian berikutnya, bukan hilang.
 */
export function finishMatch(
  matchId: number,
  input: FinishMatchInput,
): FinishMatchResult {
  const closed = closeMatch(matchId, input);
  if (!closed.ok) return closed;

  /*
    Uji coba juga tidak dinilai syarat bukanya. Kemajuannya memang tidak
    bertambah, jadi penilaian tidak akan menemukan apa pun yang baru — tetapi
    melewatinya membuat maksudnya terbaca di kode, bukan hanya kebetulan
    benar karena angka yang tidak berubah.
  */
  const evaluation = closed.isTrial
    ? {
        progress: loadPlayerProgress(closed.playerId),
        unlocked: readUnlockedWeaponIds(closed.playerId),
        newlyUnlocked: [] as string[],
      }
    : evaluateWeaponUnlocks(closed.playerId);

  return {
    ok: true,
    summary: closed.summary,
    progress: {
      matchesPlayed: evaluation.progress.matchesPlayed,
      wins: evaluation.progress.wins,
      totalKills: evaluation.progress.totalKills,
      totalDeaths: loadTotalDeaths(closed.playerId),
      unlockedWeaponIds: evaluation.unlocked,
      newlyUnlockedWeaponIds: evaluation.newlyUnlocked,
    },
  };
}
