import { create } from "zustand";

/**
 * Preferensi pemain: audio (dan nanti grafis, sensitivitas, tata tombol).
 *
 * Fase frontend memakai nilai tiruan di memori; lapisan backend nanti
 * memuat dan menyimpannya di server supaya preferensi mengikuti pemain.
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

interface SettingsState {
  audio: AudioSettings;
  setAudio: (patch: Partial<AudioSettings>) => void;
  resetAudio: () => void;
}

export const useSettingsStore = create<SettingsState>((set) => ({
  audio: { ...DEFAULT_AUDIO },
  setAudio: (patch) => set((state) => ({ audio: { ...state.audio, ...patch } })),
  resetAudio: () => set({ audio: { ...DEFAULT_AUDIO } }),
}));
