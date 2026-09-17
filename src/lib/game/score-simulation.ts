import { SCORE_HEADSHOT_BONUS, killScore } from "@/lib/game/damage";
import { difficultyProfile } from "@/lib/game/difficulty";
import { findRoundWinner, hasClinchedMatch } from "@/lib/game/round";
import { buildMatchSnapshot } from "@/lib/mock/match";
import { findWeapon } from "@/lib/mock/weapons";
import type { Difficulty, Fighter, KillFeedEntry } from "@/types/game";

/**
 * Simulasi pembaruan skor: sebuah pertandingan yang berjalan sendiri dan
 * menghasilkan kejadian kill satu per satu, lengkap dengan akibatnya pada
 * kill, kematian, skor, dan kemenangan ronde tiap peserta.
 *
 * Gunanya dua. Pertama, papan skor langsung bisa ditunjukkan dan diperiksa
 * tanpa harus memainkan pertandingan penuh lebih dulu — cukup buka halaman
 * skor. Kedua, aturan yang dipakainya adalah aturan yang SAMA dengan arena
 * sungguhan: nilai per kill dari `killScore`, pemenang ronde dari
 * `findRoundWinner`, dan penutupan pertandingan dari `hasClinchedMatch`. Jadi
 * yang disimulasikan hanya SIAPA yang menembak siapa; akibatnya dihitung oleh
 * kode yang sama dengan yang berlaku di arena.
 *
 * Seluruh fungsi di sini murni: keadaan lama tidak pernah diubah, dan acaknya
 * memakai benih yang dibawa di dalam keadaan itu sendiri. Dengan benih yang
 * sama, urutan kejadiannya selalu sama persis — itu yang membuat hasil render
 * di server dan di browser tidak pernah berselisih, sekaligus membuat
 * simulasinya bisa diuji.
 */

/** Satu peserta simulasi beserta perolehannya sampai saat ini. */
export interface SimParticipant {
  id: string;
  name: string;
  color: string;
  isLocal: boolean;
  weaponName: string;
  kills: number;
  deaths: number;
  score: number;
  /** Kill pada ronde yang sedang berjalan; dinolkan tiap ronde baru. */
  roundKills: number;
  roundWins: number;
  /**
   * Bobot peluang menjadi penembak, bukan korban. Angka relatif: peserta
   * berbobot dua kali lipat kira-kira dua kali lebih sering menembak.
   */
  skill: number;
}

export interface SimRound {
  current: number;
  total: number;
  /** Kill dalam satu ronde yang mengakhiri ronde itu. */
  scoreLimit: number;
  /** Nama pemenang ronde terakhir yang selesai; null bila belum ada. */
  lastWinner: string | null;
}

export interface SimState {
  participants: SimParticipant[];
  round: SimRound;
  status: "live" | "ended";
  /** Terisi hanya saat status `ended`; null bila pertandingan berakhir seri. */
  winnerName: string | null;
  /** Kejadian terbaru di depan, sama seperti kill feed di arena. */
  feed: KillFeedEntry[];
  /** Total kill yang sudah disimulasikan, dipakai sebagai nomor urut kejadian. */
  eventCount: number;
  /** Keadaan pengacak; berubah tiap langkah. */
  seed: number;
}

/** Jumlah kejadian yang disimpan di feed; sisanya dibuang. */
const FEED_LIMIT = 6;

/** Peluang sebuah kill adalah headshot. */
const HEADSHOT_CHANCE = 0.22;

/**
 * Pengacak mulberry32: kecil, cepat, dan sepenuhnya ditentukan benihnya.
 * Mengembalikan angka 0..1 beserta benih berikutnya, jadi pemanggil menyimpan
 * benih itu di keadaan alih-alih menyimpan pengacaknya.
 */
function nextRandom(seed: number): [value: number, nextSeed: number] {
  let t = (seed + 0x6d2b79f5) | 0;
  t = Math.imul(t ^ (t >>> 15), t | 1);
  t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
  return [((t ^ (t >>> 14)) >>> 0) / 4294967296, t | 0];
}

/** Memilih satu indeks dari daftar bobot; bobot lebih besar lebih sering terpilih. */
function pickWeighted(
  weights: number[],
  seed: number,
): [index: number, nextSeed: number] {
  const total = weights.reduce((sum, weight) => sum + Math.max(0, weight), 0);
  const [roll, nextSeed] = nextRandom(seed);
  if (total <= 0) return [0, nextSeed];

  let threshold = roll * total;
  for (let index = 0; index < weights.length; index++) {
    threshold -= Math.max(0, weights[index]);
    if (threshold <= 0) return [index, nextSeed];
  }
  return [weights.length - 1, nextSeed];
}

/**
 * Bobot kemahiran tiap peserta.
 *
 * Pemain dipatok satu sebagai acuan, dan bot mengikuti akurasi profil tingkat
 * kesulitannya — jadi simulasi pada tingkat Susah benar-benar terlihat lebih
 * berat, bukan sekadar berganti label. Sedikit variasi per bot ditambahkan
 * supaya papan skor tidak berakhir rata sempurna.
 */
function skillFor(fighter: Fighter, difficulty: Difficulty, order: number): number {
  if (fighter.isLocal) return 1;
  const accuracy = difficultyProfile(difficulty).accuracy;
  // Akurasi 0.25 (santai) sampai 0.68 (susah) dipetakan ke sekitar 0.6..1.6.
  const base = 0.45 + accuracy * 1.6;
  // Selang-seling naik-turun 8% memakai urutan roster, bukan acak, supaya
  // keadaan awal simulasi tetap sama di server dan di browser.
  return base * (order % 2 === 0 ? 1.08 : 0.92);
}

export interface SimulationSetup {
  difficulty: Difficulty;
  botCount: number;
  /** Kill per ronde yang mengakhiri ronde. Sengaja kecil agar demo cepat terlihat. */
  scoreLimit?: number;
  totalRounds?: number;
  seed?: number;
}

/**
 * Menyiapkan simulasi dari roster pertandingan yang sama dengan yang dipakai
 * arena, sehingga nama, warna, dan senjata tiap peserta persis sama dengan
 * yang akan dilihat pemain saat benar-benar bertanding.
 */
export function createSimulation({
  difficulty,
  botCount,
  scoreLimit = 5,
  totalRounds = 3,
  seed = 20260917,
}: SimulationSetup): SimState {
  const snapshot = buildMatchSnapshot({ difficulty, botCount });

  return {
    participants: snapshot.fighters.map((fighter, order) => ({
      id: fighter.id,
      name: fighter.name,
      color: fighter.color,
      isLocal: fighter.isLocal,
      weaponName: findWeapon(fighter.weaponId).name,
      kills: 0,
      deaths: 0,
      score: 0,
      roundKills: 0,
      roundWins: 0,
      skill: skillFor(fighter, difficulty, order),
    })),
    round: { current: 1, total: totalRounds, scoreLimit, lastWinner: null },
    status: "live",
    winnerName: null,
    feed: [],
    eventCount: 0,
    seed,
  };
}

/**
 * Bentuk `Fighter` seadanya dari peserta simulasi, hanya untuk kolom yang
 * dibaca penentu pemenang ronde dan penutup pertandingan. Itu memungkinkan
 * simulasi memakai aturan juara yang sama dengan arena alih-alih menuliskan
 * ulang versinya sendiri, yang cepat atau lambat akan berbeda.
 */
function asFighters(participants: SimParticipant[]): Fighter[] {
  return participants.map(
    (p) =>
      ({
        id: p.id,
        roundKills: p.roundKills,
        roundWins: p.roundWins,
        kills: p.kills,
        deaths: p.deaths,
      }) as Fighter,
  );
}

/**
 * Menjalankan simulasi satu kejadian: seorang peserta menumbangkan peserta
 * lain, lalu seluruh akibatnya diterapkan — kill, kematian, skor, kill ronde,
 * dan bila perlu pergantian ronde atau penutupan pertandingan.
 *
 * Mengembalikan keadaan BARU; keadaan yang dioper tidak disentuh. Pertandingan
 * yang sudah selesai dikembalikan apa adanya.
 */
export function stepSimulation(state: SimState): SimState {
  if (state.status === "ended" || state.participants.length < 2) return state;

  let seed = state.seed;

  // Penembak: makin mahir makin sering menembak.
  const [killerIndex, seedAfterKiller] = pickWeighted(
    state.participants.map((p) => p.skill),
    seed,
  );
  seed = seedAfterKiller;

  // Korban: siapa pun selain penembak, dan makin mahir makin JARANG tumbang.
  const [victimOffset, seedAfterVictim] = pickWeighted(
    state.participants
      .filter((_, index) => index !== killerIndex)
      .map((p) => 1 / Math.max(0.2, p.skill)),
    seed,
  );
  seed = seedAfterVictim;

  const victimIndex =
    victimOffset >= killerIndex ? victimOffset + 1 : victimOffset;

  const [headshotRoll, seedAfterHeadshot] = nextRandom(seed);
  seed = seedAfterHeadshot;
  const isHeadshot = headshotRoll < HEADSHOT_CHANCE;

  const killer = state.participants[killerIndex];
  const victim = state.participants[victimIndex];

  let participants = state.participants.map((participant, index) => {
    if (index === killerIndex) {
      return {
        ...participant,
        kills: participant.kills + 1,
        roundKills: participant.roundKills + 1,
        score: participant.score + killScore(isHeadshot),
      };
    }
    if (index === victimIndex) {
      return { ...participant, deaths: participant.deaths + 1 };
    }
    return participant;
  });

  const eventCount = state.eventCount + 1;
  const feed: KillFeedEntry[] = [
    {
      id: `sim-${eventCount}`,
      killerName: killer.name,
      victimName: victim.name,
      weaponName: killer.weaponName,
      isHeadshot,
      atSecond: eventCount,
    },
    ...state.feed,
  ].slice(0, FEED_LIMIT);

  // Ronde belum selesai: cukup laporkan perolehan terbarunya.
  const roundOver = participants.some(
    (p) => p.roundKills >= state.round.scoreLimit,
  );
  if (!roundOver) {
    return { ...state, participants, feed, eventCount, seed, status: "live" };
  }

  // Ronde selesai — pemenangnya ditentukan aturan yang sama dengan arena.
  // Dicocokkan lewat id, bukan lewat angka perolehannya: dua peserta bisa saja
  // punya angka yang sama persis, dan mencocokkan angka akan memberi kemenangan
  // ronde kepada orang yang salah.
  const roundWinner = findRoundWinner(asFighters(participants));
  const winnerIndex = roundWinner
    ? participants.findIndex((p) => p.id === roundWinner.id)
    : -1;

  const lastWinner = winnerIndex >= 0 ? participants[winnerIndex].name : null;
  participants = participants.map((participant, index) => ({
    ...participant,
    roundWins:
      index === winnerIndex ? participant.roundWins + 1 : participant.roundWins,
    roundKills: 0,
  }));

  const isLastRound = state.round.current >= state.round.total;
  const isDecided =
    isLastRound ||
    hasClinchedMatch(
      asFighters(participants),
      state.round.current,
      state.round.total,
    );

  if (isDecided) {
    const ranked = [...participants].sort(
      (a, b) =>
        b.roundWins - a.roundWins ||
        b.score - a.score ||
        b.kills - a.kills ||
        a.deaths - b.deaths,
    );
    // Seri bila dua teratas benar-benar tidak terpisahkan.
    const tied =
      ranked.length > 1 &&
      ranked[0].roundWins === ranked[1].roundWins &&
      ranked[0].score === ranked[1].score &&
      ranked[0].kills === ranked[1].kills &&
      ranked[0].deaths === ranked[1].deaths;

    return {
      ...state,
      participants,
      feed,
      eventCount,
      seed,
      status: "ended",
      winnerName: tied ? null : (ranked[0]?.name ?? null),
      round: { ...state.round, lastWinner },
    };
  }

  return {
    ...state,
    participants,
    feed,
    eventCount,
    seed,
    status: "live",
    round: {
      ...state.round,
      current: state.round.current + 1,
      lastWinner,
    },
  };
}

/** Papan skor simulasi terurut, aturannya sama dengan klasemen akhir arena. */
export function rankParticipants(participants: SimParticipant[]): SimParticipant[] {
  return [...participants].sort(
    (a, b) =>
      b.roundWins - a.roundWins ||
      b.score - a.score ||
      b.kills - a.kills ||
      a.deaths - b.deaths,
  );
}

/** Total kill dan kematian seluruh peserta, dipakai sebagai keterangan simulasi. */
export function simulationTotals(state: SimState): {
  kills: number;
  headshots: number;
} {
  const kills = state.participants.reduce((sum, p) => sum + p.kills, 0);
  // Tiap headshot menambah bonus tetap, jadi selisih skor terhadap kill biasa
  // langsung memberi jumlahnya tanpa perlu menyimpan penghitung tersendiri.
  const scoreTotal = state.participants.reduce((sum, p) => sum + p.score, 0);
  const headshots = Math.round(
    (scoreTotal - kills * (killScore(false) )) / SCORE_HEADSHOT_BONUS,
  );
  return { kills, headshots };
}
