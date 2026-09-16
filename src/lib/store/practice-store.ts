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

  recordShot: (targetId: string | null) => void;
  reset: () => void;
}

const emptyPerTarget = () =>
  Object.fromEntries(RANGE_TARGETS.map((target) => [target.id, 0]));

export const usePracticeStore = create<PracticeState>((set) => ({
  shots: 0,
  hits: 0,
  perTarget: emptyPerTarget(),

  recordShot: (targetId) =>
    set((state) => ({
      shots: state.shots + 1,
      hits: targetId ? state.hits + 1 : state.hits,
      perTarget: targetId
        ? { ...state.perTarget, [targetId]: (state.perTarget[targetId] ?? 0) + 1 }
        : state.perTarget,
    })),

  reset: () => set({ shots: 0, hits: 0, perTarget: emptyPerTarget() }),
}));

/** Ketepatan dalam persen; nol tembakan dianggap nol persen. */
export function accuracyPercent(shots: number, hits: number): number {
  return shots === 0 ? 0 : (hits / shots) * 100;
}
