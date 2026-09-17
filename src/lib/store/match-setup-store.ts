import { create } from "zustand";
import { createJSONStorage, persist } from "zustand/middleware";
import { STORAGE_KEYS } from "@/lib/store/storage";
import {
  DEFAULT_MATCH_SETUP,
  DIFFICULTY_PROFILES,
  clampBotCount,
} from "@/lib/game/difficulty";
import type { Difficulty } from "@/types/game";

/**
 * Kunci penyimpanan di localStorage. Diawali nama game supaya tidak bentrok
 * dengan kunci lain pada domain yang sama, dan dipakai apa adanya oleh
 * `persist` untuk membaca maupun menulis.
 */
const STORAGE_KEY = STORAGE_KEYS.matchSetup;

/**
 * Versi bentuk data yang disimpan. Naikkan bila isi `partialize` berubah
 * bentuknya, lalu tambahkan `migrate` — `persist` akan membuang simpanan lama
 * yang versinya berbeda bila tidak ada migrasi, jadi pemain tidak pernah
 * mendapat bentuk data yang sudah tidak dikenali.
 */
const STORAGE_VERSION = 1;

/** Bagian state yang benar-benar disimpan; sisanya adalah fungsi. */
interface StoredSetup {
  difficulty: Difficulty;
  botCount: number;
}

/**
 * Isi localStorage bisa berasal dari versi lama, disunting tangan lewat
 * devtools, atau rusak separuh. Karena itu apa pun yang dibaca kembali
 * dibersihkan dulu, bukan dipercaya begitu saja — nilai yang tidak dikenali
 * jatuh ke pilihan bawaan.
 */
function sanitizeDifficulty(value: unknown): Difficulty {
  return typeof value === "string" && value in DIFFICULTY_PROFILES
    ? (value as Difficulty)
    : DEFAULT_MATCH_SETUP.difficulty;
}

function sanitizeBotCount(value: unknown): number {
  return typeof value === "number" && Number.isFinite(value)
    ? clampBotCount(value)
    : DEFAULT_MATCH_SETUP.botCount;
}

/**
 * Pengaturan lawan yang dipilih pemain sebelum bertanding: tingkat kesulitan
 * dan jumlah musuh otomatis. Dibaca arena saat pertandingan disusun.
 */
interface MatchSetupState extends StoredSetup {
  setDifficulty: (difficulty: Difficulty) => void;
  /** Jumlah musuh selalu dijepit ke rentang yang didukung peta. */
  setBotCount: (count: number) => void;
}

/**
 * Pilihan pemain disimpan otomatis ke localStorage setiap kali berubah, jadi
 * kembali ke layar pengaturan — atau membuka game besok — langsung memakai
 * pengaturan terakhir tanpa perlu tombol simpan.
 *
 * Dua hal membuat ini aman dipakai bersama Next:
 * - `persist` memulihkan simpanan secara SINKRON saat modul ini dimuat, jadi
 *   arena yang membaca `getState()` sekali pada render pertama sudah mendapat
 *   nilai yang benar, bukan bawaan.
 * - Zustand menyimpan state awal terpisah dan memakainya sebagai potret
 *   server, sehingga render hasil prerender tetap cocok dengan render hidrasi;
 *   nilai simpanan baru dipakai pada render berikutnya.
 */
export const useMatchSetupStore = create<MatchSetupState>()(
  persist(
    (set) => ({
      difficulty: DEFAULT_MATCH_SETUP.difficulty,
      botCount: DEFAULT_MATCH_SETUP.botCount,

      setDifficulty: (difficulty) =>
        set((state) =>
          state.difficulty === difficulty ? state : { difficulty },
        ),

      setBotCount: (count) =>
        set((state) => {
          const botCount = clampBotCount(count);
          return state.botCount === botCount ? state : { botCount };
        }),
    }),
    {
      name: STORAGE_KEY,
      version: STORAGE_VERSION,
      // Di server tidak ada localStorage; createJSONStorage mengembalikan
      // undefined dan persist melewati pemulihan tanpa melempar error.
      storage: createJSONStorage(() => localStorage),
      // Hanya pilihannya yang disimpan — fungsi tidak perlu ikut.
      partialize: (state): StoredSetup => ({
        difficulty: state.difficulty,
        botCount: state.botCount,
      }),
      merge: (persisted, current): MatchSetupState => {
        const saved = (persisted ?? {}) as Partial<StoredSetup>;
        return {
          ...current,
          difficulty: sanitizeDifficulty(saved.difficulty),
          botCount: sanitizeBotCount(saved.botCount),
        };
      },
    },
  ),
);
