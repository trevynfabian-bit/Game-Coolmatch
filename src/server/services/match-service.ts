import { and, eq } from "drizzle-orm";
import { db } from "@/server/db/client";
import {
  DIFFICULTIES,
  maps,
  matchRounds,
  matchScores,
  matches,
  type MatchRow,
} from "@/server/db/schema";
import { MAX_BOTS, MIN_BOTS } from "@/lib/game/difficulty";
import { findMatchWinner } from "@/lib/game/round";
import { MOCK_MAPS } from "@/lib/mock/maps";
import { ApiError } from "@/server/api/http";
import { awardMatchCoins, type MatchCoinAward } from "@/server/services/coin-service";

/**
 * Layanan pertandingan: membuat baris pertandingan saat arena dibuka dan
 * menutupnya saat selesai.
 *
 * Klien hanya mengirim fakta mentah (perolehan tiap peserta); juara dan hasil
 * pertandingan dihitung di sini dengan aturan yang sama persis dengan HUD
 * (`findMatchWinner`), sehingga klien tidak bisa sekadar mengaku menang.
 */

export type Difficulty = (typeof DIFFICULTIES)[number];

/** Batas akal sehat perolehan satu peserta dalam satu pertandingan. */
const MAX_KILLS_PER_ROUND = 60;

export interface StartMatchInput {
  mapId: string;
  difficulty: Difficulty;
  botCount: number;
  totalRounds: number;
  scoreLimit: number;
  roundSeconds: number;
  /** Latihan atau uji coba senjata: tercatat, tapi tanpa koin. */
  isTrial?: boolean;
}

/**
 * Peta di kode adalah sumber kebenarannya; barisnya di database dibuat saat
 * pertama kali dipakai supaya kunci asing `matches.map_id` selalu sah.
 */
function ensureMap(mapId: string) {
  const map = MOCK_MAPS.find((item) => item.id === mapId);
  if (!map) throw new ApiError(404, "peta_tidak_ada", "Peta tidak dikenal.");
  db.insert(maps)
    .values({ id: map.id, name: map.name, description: map.description, previewUrl: map.previewUrl })
    .onConflictDoNothing()
    .run();
}

export function startMatch(playerId: number, input: StartMatchInput): MatchRow {
  if (input.botCount < MIN_BOTS || input.botCount > MAX_BOTS) {
    throw new ApiError(400, "isian_tidak_sah", `Jumlah lawan harus ${MIN_BOTS}..${MAX_BOTS}.`);
  }
  ensureMap(input.mapId);
  return db
    .insert(matches)
    .values({ playerId, ...input, isTrial: input.isTrial === true, startedAt: Date.now() })
    .returning()
    .get();
}

export interface ParticipantFacts {
  name: string;
  isBot: boolean;
  kills: number;
  deaths: number;
  score: number;
  roundWins: number;
}

export interface RoundFacts {
  roundNumber: number;
  winnerName: string | null;
  endedReason: "batas_kill" | "waktu_habis" | "ditinggal";
  playerKills: number;
}

export interface FinishMatchInput {
  participants: ParticipantFacts[];
  rounds: RoundFacts[];
  /** Kill beruntun terpanjang pemain; dijepit oleh layanan koin. */
  bestStreak: number;
  /** Benar bila pemain keluar sebelum ronde terakhir usai. */
  abandoned: boolean;
}

export interface FinishMatchResult {
  matchId: number;
  result: NonNullable<MatchRow["result"]>;
  winnerName: string | null;
  coins: MatchCoinAward;
}

function validateFacts(match: MatchRow, input: FinishMatchInput) {
  const locals = input.participants.filter((p) => !p.isBot);
  if (locals.length !== 1) {
    throw new ApiError(400, "peserta_tidak_sah", "Harus ada tepat satu pemain manusia.");
  }
  if (input.participants.length > match.botCount + 1) {
    throw new ApiError(400, "peserta_tidak_sah", "Jumlah peserta melebihi jumlah lawan.");
  }
  const names = new Set(input.participants.map((p) => p.name));
  if (names.size !== input.participants.length) {
    throw new ApiError(400, "peserta_tidak_sah", "Nama peserta harus unik.");
  }
  const maxKills = match.totalRounds * Math.min(match.scoreLimit, MAX_KILLS_PER_ROUND);
  for (const p of input.participants) {
    if (p.kills > maxKills || p.roundWins > match.totalRounds) {
      throw new ApiError(400, "perolehan_tidak_masuk_akal", `Perolehan ${p.name} tidak masuk akal.`);
    }
  }
  const totalRoundWins = input.participants.reduce((sum, p) => sum + p.roundWins, 0);
  if (totalRoundWins > match.totalRounds) {
    throw new ApiError(400, "perolehan_tidak_masuk_akal", "Jumlah ronde menang melebihi jumlah ronde.");
  }
}

/**
 * Menutup pertandingan, menyimpan perolehan akhir, lalu membayar koinnya.
 *
 * Aman dipanggil ulang: pertandingan yang sudah ditutup tidak ditulis ulang,
 * dan koin yang sama tidak dibayar dua kali — pemanggil tetap menerima
 * rincian koin yang sudah tercatat.
 */
export function finishMatch(
  playerId: number,
  matchId: number,
  input: FinishMatchInput,
): FinishMatchResult {
  const match = db
    .select()
    .from(matches)
    .where(and(eq(matches.id, matchId), eq(matches.playerId, playerId)))
    .get();
  if (!match) throw new ApiError(404, "pertandingan_tidak_ada", "Pertandingan tidak ditemukan.");

  if (match.endedAt == null) {
    validateFacts(match, input);
    const local = input.participants.find((p) => !p.isBot)!;
    const winner = input.abandoned ? null : findMatchWinner(input.participants);
    const result: NonNullable<MatchRow["result"]> = input.abandoned
      ? "ditinggal"
      : winner == null
        ? "seri"
        : winner.name === local.name
          ? "menang"
          : "kalah";

    db.transaction((tx) => {
      for (const p of input.participants) {
        tx.insert(matchScores)
          .values({
            matchId,
            participantName: p.name,
            isBot: p.isBot,
            kills: p.kills,
            deaths: p.deaths,
            score: p.score,
            roundWins: p.roundWins,
            isWinner: winner?.name === p.name,
          })
          .onConflictDoNothing()
          .run();
      }
      for (const round of input.rounds) {
        if (round.roundNumber < 1 || round.roundNumber > match.totalRounds) continue;
        tx.insert(matchRounds)
          .values({ matchId, ...round, endedAt: Date.now() })
          .onConflictDoNothing()
          .run();
      }
      tx.update(matches)
        .set({
          result,
          winnerName: winner?.name ?? null,
          endedAt: Date.now(),
          bestStreak: Math.max(match.bestStreak, Math.min(input.bestStreak, local.kills)),
        })
        .where(eq(matches.id, matchId))
        .run();
    });
  }

  const closed = db.select().from(matches).where(eq(matches.id, matchId)).get()!;
  // Kill beruntun untuk bonus koin: yang tercatat lewat kejadian killstreak
  // selama pertandingan, atau yang dilaporkan di akhir bila lebih besar —
  // keduanya tetap dijepit ke total kill oleh layanan koin.
  const coins = awardMatchCoins(playerId, matchId, {
    bestStreak: Math.max(closed.bestStreak, input.bestStreak),
  });

  return {
    matchId,
    result: closed.result!,
    winnerName: closed.winnerName,
    coins,
  };
}
