import type { Difficulty } from "@/types/game";

/**
 * Sesi pertandingan: daftar pesaing dan aturan sebuah pertandingan yang
 * SEDANG BERJALAN, sebagaimana dilaporkan server.
 *
 * Arena tidak lagi menyusun daftar pesaingnya sendiri dari template lawan;
 * ia meminta sesi, lalu membangun petarungnya dari daftar pesaing di dalam
 * sesi itu. Bentuknya mengikuti jawaban `GET /api/pertandingan/:id` — kolom
 * demi kolom — supaya sumber sungguhan tinggal memanggil API tanpa mengubah
 * apa pun di arena. Selama jalur itu belum tersambung, `stubMatchSessionSource`
 * membuat sesi tiruan dengan bentuk yang sama persis.
 */
export interface SessionCompetitor {
  /** Id baris pesaing di server; pada sesi tiruan hanya penanda urutan. */
  id: string;
  name: string;
  isBot: boolean;
  /** Benar untuk pemain yang bermain di perangkat ini. */
  isLocal: boolean;
  /** Warna penanda, sama dengan yang dipakai petarung ini di arena. */
  color: string;
  kills: number;
  deaths: number;
  score: number;
  roundWins: number;
}

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
  /** Urutan pesaing sebagaimana didaftarkan: pemain lokal lebih dulu. */
  competitors: SessionCompetitor[];
}

/** Satu peserta saat pertandingan dibuka; sama dengan yang diterima server. */
export interface SessionParticipant {
  name: string;
  isBot: boolean;
  color: string;
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

/** Sumber sesi: tiruan sekarang, API server nanti. */
export interface MatchSessionSource {
  start(request: StartSessionRequest): Promise<MatchSession>;
}

let stubCounter = 0;

/**
 * Sumber sesi tiruan: menjawab seketika dengan sesi yang isinya persis
 * permintaan, seolah server menerimanya apa adanya. Id-nya diawali "tiruan-"
 * supaya tidak pernah tertukar dengan id pertandingan sungguhan, dan supaya
 * pemanggil yang mencatat kejadian ke server bisa mengenali sesi yang tidak
 * punya baris di sana.
 */
export const stubMatchSessionSource: MatchSessionSource = {
  async start(request) {
    stubCounter += 1;
    return {
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
        name: p.name,
        isBot: p.isBot,
        isLocal: !p.isBot,
        color: p.color,
        kills: 0,
        deaths: 0,
        score: 0,
        roundWins: 0,
      })),
    };
  },
};

/** Benar bila sesi ini tiruan dan tidak punya baris di server. */
export function isStubSession(session: Pick<MatchSession, "matchId">): boolean {
  return session.matchId.startsWith("tiruan-");
}
