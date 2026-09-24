import { create } from "zustand";
import { apiFetch } from "@/lib/api/client";
import { findKillstreak, type KillstreakId } from "@/lib/game/killstreak";
import { useNotificationStore } from "@/lib/store/notification-store";
import { useKillstreakStore } from "@/lib/store/killstreak-store";
import { useMatchStore } from "@/lib/store/match-store";
import { useWalletStore } from "@/lib/store/wallet-store";
import type { CoinLine } from "@/lib/economy/coin-rules";
import type { MatchSnapshot } from "@/types/game";

/**
 * Siklus hidup pertandingan di server.
 *
 * Arena berjalan penuh di klien; server hanya diberi tahu saat pertandingan
 * dimulai (supaya punya id), saat hadiah killstreak terbuka/dipakai, dan saat
 * pertandingan selesai (server menentukan hasil dan membayar koin). Bila server
 * tidak terjangkau, permainan tetap jalan dan statusnya menjadi "offline".
 */

export interface MatchFinishResult {
  matchId: number;
  result: "menang" | "kalah" | "seri" | "ditinggal";
  winnerName: string | null;
  coins: {
    reward: { lines: CoinLine[]; multiplier: number; total: number };
    alreadyAwarded: boolean;
    excluded: boolean;
    wallet: { balance: number; lifetimeEarned: number };
  };
}

type Status = "idle" | "starting" | "live" | "finishing" | "finished" | "offline";

interface ServerMatchState {
  matchId: number | null;
  status: Status;
  /** Naik tiap pertandingan baru, supaya balasan lama tidak menimpa yang baru. */
  generation: number;
  result: MatchFinishResult | null;
  error: string | null;
}

export const useServerMatchStore = create<ServerMatchState>(() => ({
  matchId: null,
  status: "idle",
  generation: 0,
  result: null,
  error: null,
}));

/** Membuat baris pertandingan di server untuk potret pertandingan ini. */
export async function startServerMatch(snapshot: MatchSnapshot, { isTrial = false } = {}) {
  const generation = useServerMatchStore.getState().generation + 1;
  useServerMatchStore.setState({ matchId: null, status: "starting", generation, result: null, error: null });

  const response = await apiFetch<{ match: { id: number; killstreakLoadout: (KillstreakId | null)[] } }>("/api/pertandingan", {
    method: "POST",
    body: {
      mapId: snapshot.map.id,
      difficulty: snapshot.difficulty,
      botCount: snapshot.botCount,
      totalRounds: snapshot.round.total,
      scoreLimit: snapshot.round.scoreLimit,
      roundSeconds: snapshot.round.durationSeconds,
      isTrial,
    },
  });
  if (useServerMatchStore.getState().generation !== generation) return;
  if (!response.ok) {
    useServerMatchStore.setState({ status: "offline", error: response.message });
    return;
  }
  useServerMatchStore.setState({ matchId: response.data.match.id, status: "live" });
  // Hadiah di arena mengikuti potret loadout yang dicatat server untuk
  // pertandingan ini, jadi tombol 6-8 selalu cocok dengan yang divalidasi.
  if (!isTrial) useKillstreakStore.getState().setLoadout(response.data.match.killstreakLoadout);
}

/** Melaporkan kejadian killstreak; gagal diam-diam karena tidak boleh mengganggu permainan. */
export function reportKillstreakEvent(rewardId: KillstreakId, kind: "terbuka" | "dipakai" | "kill", streak: number) {
  const { matchId, status } = useServerMatchStore.getState();
  if (!matchId || status !== "live") return;
  void apiFetch(`/api/pertandingan/${matchId}/killstreak`, {
    method: "POST",
    body: { rewardId, kind, streak },
  });
}

function finishBody(abandoned: boolean) {
  const { fighters } = useMatchStore.getState();
  return {
    participants: fighters.map((fighter) => ({
      name: fighter.name,
      isBot: !fighter.isLocal,
      kills: fighter.kills,
      deaths: fighter.deaths,
      score: fighter.score,
      roundWins: fighter.roundWins,
    })),
    bestStreak: useKillstreakStore.getState().bestStreak,
    abandoned,
  };
}

/** Menutup pertandingan di server dan menyimpan hasil (termasuk koin) untuk layar akhir. */
export async function finishServerMatch() {
  const { matchId, status, generation } = useServerMatchStore.getState();
  if (!matchId || status !== "live") return;
  useServerMatchStore.setState({ status: "finishing" });

  const response = await apiFetch<MatchFinishResult>(`/api/pertandingan/${matchId}/selesai`, {
    method: "POST",
    body: finishBody(false),
  });
  if (useServerMatchStore.getState().generation !== generation) return;
  if (!response.ok) {
    useServerMatchStore.setState({ status: "offline", error: response.message });
    return;
  }
  useServerMatchStore.setState({ status: "finished", result: response.data });
  useWalletStore.getState().applyServerResult({ wallet: response.data.coins.wallet });
  void useWalletStore.getState().load();
  await announceMatchRewards(response.data);
}

/**
 * Mengubah hasil pertandingan menjadi notifikasi hadiah: koin yang didapat,
 * dan hadiah killstreak yang baru terbuka lewat pencapaian (statistik pemain
 * bertambah dari pertandingan ini). Dialog perayaannya sendiri baru muncul
 * setelah pemain meninggalkan arena — RewardCelebration diam di arena.
 */
async function announceMatchRewards(result: MatchFinishResult) {
  const notifications = useNotificationStore.getState();
  const { total } = result.coins.reward;
  if (total > 0 && !result.coins.alreadyAwarded) {
    notifications.push({
      kind: "koin",
      title: `+${total} koin dari pertandingan`,
      body: result.coins.reward.lines.map((line) => line.label).join(", "),
      itemId: null,
      amount: total,
    });
  }

  const streaks = useKillstreakStore.getState();
  const lockedBefore = new Set(streaks.rewardStatus.filter((item) => !item.unlocked).map((item) => item.id));
  await streaks.loadLoadout();
  for (const reward of useKillstreakStore.getState().rewardStatus) {
    if (!reward.unlocked || !lockedBefore.has(reward.id)) continue;
    const info = findKillstreak(reward.id);
    notifications.push({
      kind: "hadiah",
      title: `${info.name} terbuka`,
      body: "Syarat pencapaiannya terpenuhi. Pasang di loadout hadiah untuk memakainya.",
      itemId: reward.id,
      amount: null,
    });
  }
}

/**
 * Menandai pertandingan yang ditinggal di tengah jalan (pindah halaman atau
 * menutup tab). Memakai `keepalive` supaya permintaan tetap terkirim walau
 * halaman sedang ditutup.
 */
export function abandonServerMatch() {
  const { matchId, status } = useServerMatchStore.getState();
  if (!matchId || status !== "live") return;
  useServerMatchStore.setState({ status: "finished" });
  try {
    void fetch(`/api/pertandingan/${matchId}/selesai`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(finishBody(true)),
      keepalive: true,
      credentials: "same-origin",
    });
  } catch {
    // Tidak ada yang bisa dilakukan saat halaman ditutup.
  }
}
