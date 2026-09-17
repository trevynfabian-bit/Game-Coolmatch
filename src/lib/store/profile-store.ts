import { create } from "zustand";
import { createJSONStorage, persist } from "zustand/middleware";
import {
  DEFAULT_PLAYER_NAME,
  isValidPlayerName,
  normalizePlayerName,
} from "@/lib/game/player-name";

/** Kunci penyimpanan; diawali nama game supaya tidak bentrok di domain yang sama. */
const STORAGE_KEY = "coolmatch:profil-pemain";
const STORAGE_VERSION = 1;

interface StoredProfile {
  playerName: string;
  /** Benar setelah pemain menuliskan namanya sendiri, bukan memakai bawaan. */
  hasNamed: boolean;
}

/**
 * Isi localStorage bisa berasal dari versi lama atau disunting tangan, jadi
 * nama yang tidak lolos aturan dijatuhkan ke nama bawaan alih-alih dipercaya.
 * Tanpa ini, nama sepanjang seratus huruf hasil suntingan tangan akan merusak
 * papan skor dan tidak ada satu pun layar yang bisa menolaknya.
 */
function sanitizeName(value: unknown): string {
  if (typeof value !== "string") return DEFAULT_PLAYER_NAME;
  const name = normalizePlayerName(value);
  return isValidPlayerName(name) ? name : DEFAULT_PLAYER_NAME;
}

interface ProfileState extends StoredProfile {
  /** Simpan nama baru. Nama yang tidak sah diabaikan, bukan disimpan diam-diam. */
  setPlayerName: (name: string) => boolean;
}

/**
 * Nama pemain, tersimpan otomatis ke localStorage.
 *
 * Polanya sama dengan peta dan pengaturan lawan: `persist` memulihkan simpanan
 * secara sinkron saat modul dimuat, sehingga layar yang membaca `getState()`
 * sekali pada render pertama sudah mendapat nilai yang benar.
 *
 * `hasNamed` dipisah dari namanya sendiri karena keduanya menjawab pertanyaan
 * berbeda. Pemain yang sengaja menamai dirinya "Kamu" sudah melewati
 * onboarding; membandingkan nama dengan nilai bawaan akan mengirimnya ke sana
 * lagi setiap kali.
 */
export const useProfileStore = create<ProfileState>()(
  persist(
    (set) => ({
      playerName: DEFAULT_PLAYER_NAME,
      hasNamed: false,
      setPlayerName: (name) => {
        const next = normalizePlayerName(name);
        if (!isValidPlayerName(next)) return false;
        set((state) =>
          state.playerName === next && state.hasNamed
            ? state
            : { playerName: next, hasNamed: true },
        );
        return true;
      },
    }),
    {
      name: STORAGE_KEY,
      version: STORAGE_VERSION,
      storage: createJSONStorage(() => localStorage),
      partialize: (state): StoredProfile => ({
        playerName: state.playerName,
        hasNamed: state.hasNamed,
      }),
      merge: (persisted, current): ProfileState => {
        const stored = persisted as Partial<StoredProfile> | undefined;
        const playerName = sanitizeName(stored?.playerName);
        return {
          ...current,
          playerName,
          // Nama yang gagal disanitasi berarti simpanannya tidak bisa dipercaya,
          // jadi pemain diperlakukan seolah belum pernah menamai dirinya.
          hasNamed:
            stored?.hasNamed === true && playerName === stored?.playerName,
        };
      },
    },
  ),
);
