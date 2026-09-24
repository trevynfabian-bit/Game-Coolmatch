import { create } from "zustand";
import { apiFetch } from "@/lib/api/client";
import type { KillstreakId } from "@/lib/game/killstreak";
import { useNotificationStore } from "@/lib/store/notification-store";
import { useKillstreakStore } from "@/lib/store/killstreak-store";
import { useMatchStore } from "@/lib/store/match-store";
import { useWalletStore } from "@/lib/store/wallet-store";
import type { CoinLine } from "@/lib/economy/coin-rules";
import type { KillFeedEntry, MatchSnapshot } from "@/types/game";

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
  /** Benar bila pertandingan berjalan adalah uji coba (tanpa koin/statistik/killstreak). */
  isTrial: boolean;
}

export const useServerMatchStore = create<ServerMatchState>(() => ({
  matchId: null,
  status: "idle",
  generation: 0,
  result: null,
  error: null,
  isTrial: false,
}));

/** Membuat baris pertandingan di server untuk potret pertandingan ini. */
export async function startServerMatch(
  snapshot: MatchSnapshot,
  // Bawaan: sama dengan pertandingan sebelumnya, supaya "Main lagi" di uji
  // coba tetap uji coba.
  { isTrial = useServerMatchStore.getState().isTrial } = {},
) {
  const generation = useServerMatchStore.getState().generation + 1;
  useServerMatchStore.setState({ matchId: null, status: "starting", generation, result: null, error: null, isTrial });

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
      weaponId: snapshot.fighters.find((fighter) => fighter.isLocal)?.weaponId ?? null,
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

interface PendingKillEvent {
  seq: number;
  roundNumber: number;
  killerName: string;
  victimName: string;
  weaponName: string;
  isHeadshot: boolean;
  atSecond: number;
}

/** Antrean kejadian kill yang belum diterima server, plus nomor urut berikutnya. */
const killSync = { queue: [] as PendingKillEvent[], nextSeq: 1, matchId: null as number | null, sending: false };

/** Menambah kejadian kill ke antrean; dikirim bertahap oleh `flushKillEvents`. */
export function queueKillEvent(entry: KillFeedEntry, roundNumber: number) {
  const { matchId, status, isTrial } = useServerMatchStore.getState();
  if (!matchId || status !== "live" || isTrial) return;
  if (killSync.matchId !== matchId) {
    killSync.matchId = matchId;
    killSync.queue = [];
    killSync.nextSeq = 1;
  }
  killSync.queue.push({
    seq: killSync.nextSeq++,
    roundNumber,
    killerName: entry.killerName,
    victimName: entry.victimName,
    weaponName: entry.weaponName,
    isHeadshot: entry.isHeadshot,
    atSecond: Math.round(entry.atSecond),
  });
}

/**
 * Mengirim antrean kejadian kill ke server. Yang gagal terkirim tetap di
 * antrean dan dicoba lagi pada pengiriman berikutnya; server mengabaikan
 * nomor urut yang sudah pernah diterima, jadi kiriman ulang aman.
 */
export async function flushKillEvents() {
  const { matchId, status } = useServerMatchStore.getState();
  if (!matchId || killSync.matchId !== matchId || killSync.queue.length === 0 || killSync.sending) return;
  if (status !== "live" && status !== "finishing") return;
  const batch = killSync.queue.slice(0, 100);
  killSync.sending = true;
  const response = await apiFetch(`/api/pertandingan/${matchId}/kejadian`, {
    method: "POST",
    body: { events: batch },
  });
  killSync.sending = false;
  if (response.ok || response.status === 400 || response.status === 409) {
    // Diterima, atau ditolak permanen: jangan dikirim ulang terus-menerus.
    const sent = new Set(batch.map((event) => event.seq));
    killSync.queue = killSync.queue.filter((event) => !sent.has(event.seq));
  }
}

/** Melaporkan kejadian killstreak; gagal diam-diam karena tidak boleh mengganggu permainan. */
export function reportKillstreakEvent(rewardId: KillstreakId, kind: "terbuka" | "dipakai" | "kill", streak: number) {
  const { matchId, status, isTrial } = useServerMatchStore.getState();
  if (!matchId || status !== "live" || isTrial) return;
  void apiFetch(`/api/pertandingan/${matchId}/killstreak`, {
    method: "POST",
    body: { rewardId, kind, streak },
  });
}

function finishBody(abandoned: boolean) {
  const { fighters, roundHistory } = useMatchStore.getState();
  return {
    participants: fighters.map((fighter) => ({
      name: fighter.name,
      isBot: !fighter.isLocal,
      kills: fighter.kills,
      deaths: fighter.deaths,
      score: fighter.score,
      roundWins: fighter.roundWins,
    })),
    // Server menentukan ulang pemenang tiap ronde dari catatan ini.
    rounds: roundHistory,
    bestStreak: useKillstreakStore.getState().bestStreak,
    abandoned,
  };
}

/** Menutup pertandingan di server dan menyimpan hasil (termasuk koin) untuk layar akhir. */
export async function finishServerMatch() {
  const { matchId, status, generation } = useServerMatchStore.getState();
  if (!matchId || status !== "live") return;
  useServerMatchStore.setState({ status: "finishing" });
  // Sisa kejadian kill dikirim dulu; setelah ditutup server menolaknya.
  await flushKillEvents();

  const body = finishBody(false);
  const response = await apiFetch<MatchFinishResult>(`/api/pertandingan/${matchId}/selesai`, {
    method: "POST",
    body,
  });
  if (!response.ok && isTransient(response.status)) savePendingResult(matchId, body);
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

const PENDING_KEY = "coolmatch:hasil-tertunda";
/** Hasil tertunda yang lebih tua dari ini dibuang; pemain sudah lama pergi. */
const PENDING_MAX_AGE_MS = 7 * 24 * 60 * 60 * 1000;

interface PendingResult {
  matchId: number;
  body: ReturnType<typeof finishBody>;
  savedAt: number;
}

/** Galat sementara (jaringan putus, server sibuk) layak dicoba lagi; 4xx tidak. */
function isTransient(status: number): boolean {
  return status === 0 || status >= 500;
}

function readPending(): PendingResult[] {
  try {
    const raw = JSON.parse(localStorage.getItem(PENDING_KEY) ?? "[]");
    return Array.isArray(raw)
      ? raw.filter(
          (item): item is PendingResult =>
            item && typeof item.matchId === "number" && item.body && Date.now() - item.savedAt < PENDING_MAX_AGE_MS,
        )
      : [];
  } catch {
    return [];
  }
}

function writePending(items: PendingResult[]) {
  try {
    if (items.length === 0) localStorage.removeItem(PENDING_KEY);
    else localStorage.setItem(PENDING_KEY, JSON.stringify(items));
  } catch {
    // Penyimpanan ditolak: hasil ini hanya bisa dicoba lagi selama tab terbuka.
  }
}

/**
 * Menyimpan hasil pertandingan yang gagal terkirim supaya tidak hilang. Dicoba
 * lagi saat sesi berikutnya dibuka atau koneksi kembali; server menutup
 * pertandingan secara idempoten, jadi kiriman ulang tidak membayar dua kali.
 */
function savePendingResult(matchId: number, body: ReturnType<typeof finishBody>) {
  const items = readPending().filter((item) => item.matchId !== matchId);
  writePending([...items, { matchId, body, savedAt: Date.now() }]);
}

let retrying = false;

/** Mengirim ulang hasil pertandingan yang tertunda. Mengembalikan jumlah yang berhasil. */
export async function retryPendingResults(): Promise<number> {
  if (retrying || typeof window === "undefined") return 0;
  const items = readPending();
  if (items.length === 0) {
    writePending([]);
    return 0;
  }
  retrying = true;
  let saved = 0;
  const remaining: PendingResult[] = [];
  for (const item of items) {
    const response = await apiFetch<MatchFinishResult>(`/api/pertandingan/${item.matchId}/selesai`, {
      method: "POST",
      body: item.body,
    });
    if (response.ok) {
      saved += 1;
      // Layar akhir pertandingan ini masih terbuka: tampilkan angka resminya.
      const state = useServerMatchStore.getState();
      if (state.status === "offline" && state.matchId === item.matchId) {
        useServerMatchStore.setState({ status: "finished", result: response.data, error: null });
      }
    }
    else if (isTransient(response.status)) remaining.push(item);
    // Galat permanen (mis. pertandingan tidak ada lagi) dibuang.
  }
  writePending(remaining);
  retrying = false;
  if (saved > 0) {
    void useWalletStore.getState().load();
    void useKillstreakStore.getState().loadLoadout();
    void useNotificationStore.getState().load();
  }
  return saved;
}

/**
 * Server sudah mencatat notifikasi hadiah pertandingan ini (koin yang masuk
 * dan hadiah killstreak yang terbuka lewat pencapaian). Di sini klien cukup
 * memuat ulang status hadiah dan kotak masuknya. Dialog perayaannya baru
 * muncul setelah pemain meninggalkan arena — RewardCelebration diam di arena.
 */
async function announceMatchRewards(result: MatchFinishResult) {
  if (result.coins.excluded) return;
  await useKillstreakStore.getState().loadLoadout();
  await useNotificationStore.getState().load();
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
