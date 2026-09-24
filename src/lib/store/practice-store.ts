import { create } from "zustand";
import { RANGE_TARGETS } from "@/lib/practice/range-map";

/**
 * Catatan latihan menembak. Semua angkanya dihitung per butir peluru, jadi
 * shotgun yang menyemburkan delapan butir dinilai adil: delapan peluang kena,
 * bukan satu.
 */
interface PracticeState {
  /** Butir peluru yang sudah dilepaskan. */
  shots: number;
  /** Butir yang mengenai sasaran. */
  hits: number;
  /** Jumlah kena per sasaran, dikunci id sasaran. */
  perTarget: Record<string, number>;
  /** Waktu tembakan pertama sesi ini; null sebelum menembak. */
  startedAt: number | null;

  recordShot: (targetId: string | null) => void;
  reset: () => void;
}

const emptyPerTarget = () =>
  Object.fromEntries(RANGE_TARGETS.map((target) => [target.id, 0]));

export const usePracticeStore = create<PracticeState>((set) => ({
  shots: 0,
  hits: 0,
  perTarget: emptyPerTarget(),
  startedAt: null,

  recordShot: (targetId) =>
    set((state) => ({
      startedAt: state.startedAt ?? Date.now(),
      shots: state.shots + 1,
      hits: targetId ? state.hits + 1 : state.hits,
      perTarget: targetId
        ? { ...state.perTarget, [targetId]: (state.perTarget[targetId] ?? 0) + 1 }
        : state.perTarget,
    })),

  reset: () => set({ shots: 0, hits: 0, perTarget: emptyPerTarget(), startedAt: null }),
}));

/**
 * Menyimpan sesi latihan yang sedang berjalan ke /api/latihan lalu memulai
 * sesi baru. Memakai `keepalive` supaya tetap terkirim saat halaman ditutup.
 * Sesi tanpa tembakan tidak disimpan. Hasil latihan terisolasi dari progres.
 */
export function savePracticeSession(weaponId: string): void {
  const { shots, hits, perTarget, startedAt, reset } = usePracticeStore.getState();
  if (shots === 0) return;
  const body = {
    weaponId,
    shots,
    hits,
    perTarget: Object.fromEntries(Object.entries(perTarget).filter(([, count]) => count > 0)),
    durationMs: Math.max(0, Date.now() - (startedAt ?? Date.now())),
  };
  reset();
  try {
    void fetch("/api/latihan", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(body),
      credentials: "same-origin",
      keepalive: true,
    }).catch(() => {});
  } catch {
    // Catatan latihan bersifat pelengkap; gagal kirim tidak mengganggu apa pun.
  }
}

/** Ketepatan dalam persen; nol tembakan dianggap nol persen. */
export function accuracyPercent(shots: number, hits: number): number {
  return shots === 0 ? 0 : (hits / shots) * 100;
}
