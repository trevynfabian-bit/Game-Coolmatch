import { killScore } from "@/lib/game/damage";
import {
  findMatchWinner,
  findRoundWinner,
  hasClinchedMatch,
} from "@/lib/game/round";
import { rankScores } from "@/lib/game/scoreboard";
import type { Difficulty, MatchResult, MatchScoreLine } from "@/types/game";

/**
 * Sesi pertandingan: daftar pesaing dan aturan sebuah pertandingan yang
 * SEDANG BERJALAN, sebagaimana dilaporkan server.
 *
 * Arena tidak menyusun daftar pesaingnya sendiri dari template lawan dan tidak
 * memutuskan sendiri siapa memenangi ronde: ia meminta sesi, membangun
 * petarungnya dari daftar pesaing di dalamnya, melaporkan fakta — siapa
 * menumbangkan siapa, berapa kill tiap orang pada ronde ini — lalu membaca
 * kesimpulan sesi dan memperbarui rosternya dari sana. Bentuknya mengikuti
 * `GET /api/pertandingan/:id`, `POST …/kill`, dan `POST …/ronde` kolom demi
 * kolom, supaya sumber sungguhan tinggal memanggil API tanpa mengubah apa pun
 * di arena. Selama jalur itu belum tersambung, `stubMatchSessionSource`
 * menjawab dengan bentuk yang sama persis dan aturan yang sama persis.
 */
export type SessionCompetitor = MatchScoreLine;

export interface MatchSession {
  matchId: string;
  mapId: string;
  difficulty: Difficulty;
  botCount: number;
  totalRounds: number;
  scoreLimit: number;
  roundSeconds: number;
  isTrial: boolean;
  status: "berjalan" | "selesai";
  /** Sudah TERURUT sebagai klasemen, sama seperti jawaban server. */
  competitors: SessionCompetitor[];
}

/** Satu peserta saat pertandingan dibuka; sama dengan yang diterima server. */
export interface SessionParticipant {
  name: string;
  isBot: boolean;
  color: string;
  /** Senjata yang dibawanya, supaya daftar pesaing sesi sudah lengkap. */
  weaponId?: string | null;
}

/**
 * Permintaan membuka sesi, sama dengan badan `POST /api/pertandingan`.
 * Jumlah ronde, batas kill, dan lama ronde dikirim sebagai fakta aturan yang
 * dipakai arena, supaya server menilai ronde dengan aturan yang sama.
 */
export interface StartSessionRequest {
  mapId: string;
  difficulty: Difficulty;
  botCount: number;
  totalRounds: number;
  scoreLimit: number;
  roundSeconds: number;
  participants: SessionParticipant[];
  isTrial: boolean;
}

/** Satu tembakan mematikan, sama dengan badan `POST /api/pertandingan/:id/kill`. */
export interface KillReport {
  killerName: string;
  victimName: string;
  isHeadshot: boolean;
}

/** Satu peluru yang kena, sama dengan badan `POST /api/pertandingan/:id/hit`. */
export interface HitReport {
  shooterName: string;
  targetName: string;
  /** Kerusakan mentah yang diterapkan, poin utuh. */
  damage: number;
  isHeadshot: boolean;
}

/** Fakta satu ronde, sama dengan badan `POST /api/pertandingan/:id/ronde`. */
export interface FinishRoundRequest {
  roundNumber: number;
  kills: { participantName: string; roundKills: number }[];
}

/** Kesimpulan sesi atas satu ronde, sama dengan jawaban `POST …/ronde`. */
export interface RoundOutcome {
  /** Pemenang ronde ini; null bila rondenya berakhir seri. */
  roundWinner: string | null;
  /** Benar bila ronde ini menutup seluruh pertandingan. */
  matchEnded: boolean;
  /** Juara pertandingan; hanya terisi saat `matchEnded`. */
  matchWinner: string | null;
  /** Hasil dari sudut pandang pemain; hanya terisi saat `matchEnded`. */
  result: MatchResult | null;
  /** Roster sesudah ronde ini, terurut klasemen. */
  scoreboard: SessionCompetitor[];
}

/** Sumber sesi: tiruan sekarang, API server nanti. */
export interface MatchSessionSource {
  start(request: StartSessionRequest): Promise<MatchSession>;
  recordHit(matchId: string, hit: HitReport): Promise<void>;
  recordKill(matchId: string, kill: KillReport): Promise<void>;
  finishRound(
    matchId: string,
    request: FinishRoundRequest,
  ): Promise<RoundOutcome>;
}

/** Benar bila sesi ini tiruan dan tidak punya baris di server. */
export function isStubSession(session: Pick<MatchSession, "matchId">): boolean {
  return session.matchId.startsWith("tiruan-");
}

interface StubState {
  session: MatchSession;
  roundsPlayed: number;
}

let stubCounter = 0;
const stubSessions = new Map<string, StubState>();

function stubState(matchId: string): StubState {
  const state = stubSessions.get(matchId);
  if (!state) throw new Error("Pertandingan tidak ditemukan.");
  return state;
}

/**
 * Sumber sesi tiruan: menjawab seketika, seolah server menerima permintaannya
 * apa adanya, dan menyimpulkan ronde dengan fungsi aturan yang SAMA dengan
 * yang dipakai server — `findRoundWinner`, `hasClinchedMatch`,
 * `findMatchWinner`, `rankScores`. Kill dihitung dengan `killScore`, seperti
 * di server. Id-nya diawali "tiruan-" supaya tidak pernah tertukar dengan id
 * pertandingan sungguhan.
 *
 * Nomor ronde harus tepat melanjutkan ronde terakhir, seperti di server: itu
 * yang menahan permintaan yang terkirim dua kali agar tidak menambah
 * kemenangan ronde dua kali.
 */
export const stubMatchSessionSource: MatchSessionSource = {
  async start(request) {
    stubCounter += 1;
    const session: MatchSession = {
      matchId: `tiruan-${stubCounter}`,
      mapId: request.mapId,
      difficulty: request.difficulty,
      botCount: request.botCount,
      totalRounds: request.totalRounds,
      scoreLimit: request.scoreLimit,
      roundSeconds: request.roundSeconds,
      isTrial: request.isTrial,
      status: "berjalan",
      competitors: request.participants.map((p, index) => ({
        id: String(index + 1),
        participantName: p.name,
        isBot: p.isBot,
        isLocal: !p.isBot,
        kills: 0,
        deaths: 0,
        score: 0,
        roundWins: 0,
        isWinner: false,
        color: p.color,
        weaponId: p.weaponId ?? null,
        damageDealt: 0,
        damageTaken: 0,
        hitsLanded: 0,
        headshots: 0,
      })),
    };
    stubSessions.set(session.matchId, { session, roundsPlayed: 0 });
    return session;
  },

  async recordHit(matchId, hit) {
    const { session } = stubState(matchId);
    if (session.status === "selesai") {
      throw new Error("Pertandingan sudah ditutup.");
    }
    if (!Number.isInteger(hit.damage) || hit.damage <= 0) {
      throw new Error("Kerusakan harus bilangan bulat positif.");
    }
    const shooter = session.competitors.find(
      (c) => c.participantName === hit.shooterName,
    );
    const target = session.competitors.find(
      (c) => c.participantName === hit.targetName,
    );
    if (!shooter || !target) {
      throw new Error("Penembak atau sasaran bukan peserta pertandingan ini.");
    }
    shooter.damageDealt = (shooter.damageDealt ?? 0) + hit.damage;
    shooter.hitsLanded = (shooter.hitsLanded ?? 0) + 1;
    shooter.headshots = (shooter.headshots ?? 0) + (hit.isHeadshot ? 1 : 0);
    target.damageTaken = (target.damageTaken ?? 0) + hit.damage;
  },

  async recordKill(matchId, kill) {
    const { session } = stubState(matchId);
    if (session.status === "selesai") {
      throw new Error("Pertandingan sudah ditutup.");
    }
    const killer = session.competitors.find(
      (c) => c.participantName === kill.killerName,
    );
    const victim = session.competitors.find(
      (c) => c.participantName === kill.victimName,
    );
    if (!killer || !victim) {
      throw new Error("Penembak atau korban bukan peserta pertandingan ini.");
    }
    killer.kills += 1;
    killer.score += killScore(kill.isHeadshot);
    victim.deaths += 1;
  },

  async finishRound(matchId, request) {
    const state = stubState(matchId);
    const { session } = state;
    if (session.status === "selesai") {
      throw new Error(
        "Pertandingan sudah ditutup, ronde baru tidak bisa dicatat.",
      );
    }
    // Seperti server: fakta ronde harus menyebut kill tiap peserta.
    if (request.kills.length === 0) {
      throw new Error("Kill tiap peserta pada ronde ini harus disertakan.");
    }
    const berikutnya = state.roundsPlayed + 1;
    if (request.roundNumber !== berikutnya) {
      throw new Error(
        `Ronde berikutnya adalah ronde ${berikutnya}, bukan ${request.roundNumber}.`,
      );
    }
    for (const k of request.kills) {
      if (
        !session.competitors.some(
          (c) => c.participantName === k.participantName,
        )
      ) {
        throw new Error(
          `"${k.participantName}" bukan peserta pertandingan ini.`,
        );
      }
    }

    // Peserta yang tidak disebut dianggap nol kill pada ronde ini.
    const roundKills = new Map(
      request.kills.map((k) => [k.participantName, k.roundKills]),
    );
    const standings = session.competitors.map((c) => ({
      name: c.participantName,
      isBot: c.isBot,
      roundKills: roundKills.get(c.participantName) ?? 0,
      roundWins: c.roundWins,
      kills: c.kills,
      deaths: c.deaths,
    }));

    const winner = findRoundWinner(standings);
    if (winner) {
      winner.roundWins += 1;
      const line = session.competitors.find(
        (c) => c.participantName === winner.name,
      );
      if (line) line.roundWins += 1;
    }
    state.roundsPlayed = request.roundNumber;

    const isLastRound = request.roundNumber >= session.totalRounds;
    const isDecided =
      isLastRound ||
      hasClinchedMatch(standings, request.roundNumber, session.totalRounds);

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
      session.status = "selesai";
      for (const c of session.competitors) {
        c.isWinner = c.participantName === matchWinner;
      }
    }

    session.competitors = rankScores(session.competitors);
    return {
      roundWinner: winner?.name ?? null,
      matchEnded: isDecided,
      matchWinner,
      result,
      scoreboard: session.competitors.map((c) => ({ ...c })),
    };
  },
};
