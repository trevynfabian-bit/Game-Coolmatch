import { create } from "zustand";
import { createJSONStorage, persist } from "zustand/middleware";

/**
 * Preferensi pemain: audio (dan nanti grafis, sensitivitas, tata tombol).
 *
 * Disimpan otomatis di localStorage supaya langsung berlaku saat game dibuka
 * lagi; lapisan backend menyelaraskannya ke server supaya ikut pindah
 * perangkat. Apa pun yang dibaca kembali dibersihkan dulu karena simpanan
 * bisa rusak atau berasal dari versi lama.
 */

export interface AudioSettings {
  /** Volume utama 0..1, mengali semua kanal. */
  master: number;
  /** Efek suara: tembakan, ledakan, langkah. */
  sfx: number;
  /** Musik latar prosedural. */
  music: number;
  /** Bunyi antarmuka dan konfirmasi kena. */
  ui: number;
  muted: boolean;
}

export const DEFAULT_AUDIO: AudioSettings = {
  master: 0.8,
  sfx: 0.9,
  music: 0.5,
  ui: 0.7,
  muted: false,
};

const STORAGE_KEY = "coolmatch:pengaturan";
const STORAGE_VERSION = 1;

function volume(value: unknown, fallback: number): number {
  return typeof value === "number" && Number.isFinite(value) ? Math.min(1, Math.max(0, value)) : fallback;
}

export function sanitizeAudio(value: unknown): AudioSettings {
  const raw = (value && typeof value === "object" ? value : {}) as Partial<AudioSettings>;
  return {
    master: volume(raw.master, DEFAULT_AUDIO.master),
    sfx: volume(raw.sfx, DEFAULT_AUDIO.sfx),
    music: volume(raw.music, DEFAULT_AUDIO.music),
    ui: volume(raw.ui, DEFAULT_AUDIO.ui),
    muted: typeof raw.muted === "boolean" ? raw.muted : DEFAULT_AUDIO.muted,
  };
}

interface StoredSettings {
  audio: AudioSettings;
}

interface SettingsState extends StoredSettings {
  setAudio: (patch: Partial<AudioSettings>) => void;
  resetAudio: () => void;
  toggleMute: () => void;
}

export const useSettingsStore = create<SettingsState>()(
  persist(
    (set) => ({
      audio: { ...DEFAULT_AUDIO },
      setAudio: (patch) => set((state) => ({ audio: sanitizeAudio({ ...state.audio, ...patch }) })),
      resetAudio: () => set({ audio: { ...DEFAULT_AUDIO } }),
      toggleMute: () => set((state) => ({ audio: { ...state.audio, muted: !state.audio.muted } })),
    }),
    {
      name: STORAGE_KEY,
      version: STORAGE_VERSION,
      storage: createJSONStorage(() => localStorage),
      partialize: (state): StoredSettings => ({ audio: state.audio }),
      merge: (persisted, current): SettingsState => {
        const saved = (persisted ?? {}) as Partial<StoredSettings>;
        return { ...current, audio: sanitizeAudio(saved.audio) };
      },
    },
  ),
);
