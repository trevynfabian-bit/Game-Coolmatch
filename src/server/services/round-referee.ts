import { ApiError } from "@/server/api/http";
import { findRoundWinner, hasReachedScoreLimit, type RoundRecord } from "@/lib/game/round";

/**
 * Wasit ronde di server: memeriksa catatan ronde dari klien lalu menentukan
 * sendiri pemenang tiap ronde dengan aturan yang sama persis dengan HUD
 * (`findRoundWinner`). Jumlah ronde menang tiap peserta diturunkan dari
 * putusan ini, bukan dari angka yang dikirim klien.
 */

export type RoundFacts = RoundRecord;

export interface ParticipantTotals {
  name: string;
  isBot: boolean;
  kills: number;
  deaths: number;
}

export interface RoundVerdict {
  roundNumber: number;
  winnerName: string | null;
  endedReason: RoundRecord["endedReason"];
  /** Kill pemain manusia pada ronde ini. */
  playerKills: number;
}

export interface RefereeResult {
  verdicts: RoundVerdict[];
  /** Ronde menang per nama peserta menurut putusan server. */
  roundWins: Map<string, number>;
}

function reject(message: string): never {
  throw new ApiError(400, "ronde_tidak_sah", message);
}

export function refereeRounds(
  rules: { totalRounds: number; scoreLimit: number },
  participants: ParticipantTotals[],
  rounds: RoundFacts[],
  { abandoned }: { abandoned: boolean },
): RefereeResult {
  const names = new Set(participants.map((p) => p.name));
  const local = participants.find((p) => !p.isBot);
  const ordered = [...rounds].sort((a, b) => a.roundNumber - b.roundNumber);

  if (ordered.length > rules.totalRounds) reject("Jumlah ronde melebihi aturan pertandingan.");
  ordered.forEach((round, index) => {
    if (round.roundNumber !== index + 1) reject("Nomor ronde harus berurutan mulai dari 1 tanpa lompatan.");
  });
  if (!abandoned && ordered.length > 0 && ordered.length !== rules.totalRounds) {
    reject(`Pertandingan yang tuntas harus punya ${rules.totalRounds} ronde.`);
  }

  const killsSoFar = new Map<string, number>();
  const lastDeaths = new Map<string, number>();
  const roundWins = new Map<string, number>(participants.map((p) => [p.name, 0]));
  const verdicts: RoundVerdict[] = [];

  for (const round of ordered) {
    const seen = new Set<string>();
    for (const standing of round.standings) {
      if (!names.has(standing.name)) reject(`Ronde ${round.roundNumber}: peserta "${standing.name}" tidak dikenal.`);
      if (seen.has(standing.name)) reject(`Ronde ${round.roundNumber}: peserta "${standing.name}" tercatat dua kali.`);
      seen.add(standing.name);
      if (rules.scoreLimit > 0 && standing.roundKills > rules.scoreLimit) {
        reject(`Ronde ${round.roundNumber}: kill ${standing.name} melebihi batas skor.`);
      }
      const previousDeaths = lastDeaths.get(standing.name) ?? 0;
      if (standing.deaths < previousDeaths) reject(`Ronde ${round.roundNumber}: kematian ${standing.name} tidak boleh berkurang.`);
      lastDeaths.set(standing.name, standing.deaths);
      killsSoFar.set(standing.name, (killsSoFar.get(standing.name) ?? 0) + standing.roundKills);
    }
    if (seen.size !== names.size) reject(`Ronde ${round.roundNumber}: semua peserta harus tercatat.`);

    const reached = hasReachedScoreLimit(round.standings, rules.scoreLimit);
    if (round.endedReason === "batas_kill" && !reached) {
      reject(`Ronde ${round.roundNumber}: tidak ada yang mencapai batas skor.`);
    }
    const winner = findRoundWinner(round.standings);
    if (winner) roundWins.set(winner.name, (roundWins.get(winner.name) ?? 0) + 1);
    verdicts.push({
      roundNumber: round.roundNumber,
      winnerName: winner?.name ?? null,
      endedReason: reached ? "batas_kill" : "waktu_habis",
      playerKills: round.standings.find((s) => s.name === local?.name)?.roundKills ?? 0,
    });
  }

  for (const participant of participants) {
    if ((killsSoFar.get(participant.name) ?? 0) > participant.kills) {
      reject(`Kill per ronde ${participant.name} melebihi total kill-nya.`);
    }
    if ((lastDeaths.get(participant.name) ?? 0) > participant.deaths) {
      reject(`Kematian ${participant.name} di catatan ronde melebihi totalnya.`);
    }
  }

  return { verdicts, roundWins };
}
