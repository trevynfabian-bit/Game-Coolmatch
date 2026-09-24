import { create } from "zustand";
import { createJSONStorage, persist } from "zustand/middleware";

/**
 * Preferensi pemain: audio, grafis, dan kontrol (sensitivitas, tata tombol).
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

export type GraphicsQuality = "rendah" | "sedang" | "tinggi";

export interface GraphicsSettings {
  quality: GraphicsQuality;
  /** Skala resolusi 0.5..1 terhadap kerapatan piksel layar. */
  resolutionScale: number;
  /** Sudut pandang kamera dalam derajat. */
  fov: number;
  showFps: boolean;
}

export const DEFAULT_GRAPHICS: GraphicsSettings = {
  quality: "sedang",
  resolutionScale: 1,
  fov: 75,
  showFps: true,
};

/** Arti tiap preset kualitas bagi kanvas 3D. */
export const QUALITY_PRESETS: Record<GraphicsQuality, { label: string; shadows: boolean; maxDpr: number; antialias: boolean; blurb: string }> = {
  rendah: { label: "Rendah", shadows: false, maxDpr: 1, antialias: false, blurb: "Tanpa bayangan, piksel standar. Untuk laptop lama." },
  sedang: { label: "Sedang", shadows: true, maxDpr: 1.5, antialias: true, blurb: "Bayangan menyala, tepi halus. Seimbang." },
  tinggi: { label: "Tinggi", shadows: true, maxDpr: 2, antialias: true, blurb: "Kerapatan piksel penuh di layar tajam." },
};

export const FOV_RANGE = { min: 65, max: 100 } as const;

export function sanitizeGraphics(value: unknown): GraphicsSettings {
  const raw = (value && typeof value === "object" ? value : {}) as Partial<GraphicsSettings>;
  const quality = raw.quality && raw.quality in QUALITY_PRESETS ? raw.quality : DEFAULT_GRAPHICS.quality;
  const scale = typeof raw.resolutionScale === "number" && Number.isFinite(raw.resolutionScale)
    ? Math.min(1, Math.max(0.5, raw.resolutionScale))
    : DEFAULT_GRAPHICS.resolutionScale;
  const fov = typeof raw.fov === "number" && Number.isFinite(raw.fov)
    ? Math.min(FOV_RANGE.max, Math.max(FOV_RANGE.min, Math.round(raw.fov)))
    : DEFAULT_GRAPHICS.fov;
  return {
    quality,
    resolutionScale: scale,
    fov,
    showFps: typeof raw.showFps === "boolean" ? raw.showFps : DEFAULT_GRAPHICS.showFps,
  };
}

/** Rentang kerapatan piksel kanvas dari pengaturan grafis. */
export function canvasDpr(graphics: GraphicsSettings): [number, number] {
  const max = QUALITY_PRESETS[graphics.quality].maxDpr * graphics.resolutionScale;
  return [Math.min(1, max), Math.max(0.5, max)];
}

export interface ControlSettings {
  /** Pengali kecepatan pandangan mouse; 1 = bawaan three.js. */
  sensitivity: number;
}

export const DEFAULT_CONTROLS: ControlSettings = {
  sensitivity: 1,
};

export const SENSITIVITY_RANGE = { min: 0.2, max: 3, step: 0.05 } as const;

/** Radian per piksel gerak mouse pada sensitivitas 1 (sama dengan PointerLockControls). */
export const BASE_RADIANS_PER_PIXEL = 0.002;

export function sanitizeControls(value: unknown): ControlSettings {
  const raw = (value && typeof value === "object" ? value : {}) as Partial<ControlSettings>;
  const sensitivity = typeof raw.sensitivity === "number" && Number.isFinite(raw.sensitivity)
    ? Math.min(SENSITIVITY_RANGE.max, Math.max(SENSITIVITY_RANGE.min, Math.round(raw.sensitivity * 100) / 100))
    : DEFAULT_CONTROLS.sensitivity;
  return { sensitivity };
}

const STORAGE_KEY = "coolmatch:pengaturan";
const STORAGE_VERSION = 3;

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
  graphics: GraphicsSettings;
  controls: ControlSettings;
}

interface SettingsState extends StoredSettings {
  setAudio: (patch: Partial<AudioSettings>) => void;
  resetAudio: () => void;
  toggleMute: () => void;
  setGraphics: (patch: Partial<GraphicsSettings>) => void;
  resetGraphics: () => void;
  setControls: (patch: Partial<ControlSettings>) => void;
  resetControls: () => void;
}

export const useSettingsStore = create<SettingsState>()(
  persist(
    (set) => ({
      audio: { ...DEFAULT_AUDIO },
      graphics: { ...DEFAULT_GRAPHICS },
      setGraphics: (patch) => set((state) => ({ graphics: sanitizeGraphics({ ...state.graphics, ...patch }) })),
      resetGraphics: () => set({ graphics: { ...DEFAULT_GRAPHICS } }),
      controls: { ...DEFAULT_CONTROLS },
      setControls: (patch) => set((state) => ({ controls: sanitizeControls({ ...state.controls, ...patch }) })),
      resetControls: () => set({ controls: { ...DEFAULT_CONTROLS } }),
      setAudio: (patch) => set((state) => ({ audio: sanitizeAudio({ ...state.audio, ...patch }) })),
      resetAudio: () => set({ audio: { ...DEFAULT_AUDIO } }),
      toggleMute: () => set((state) => ({ audio: { ...state.audio, muted: !state.audio.muted } })),
    }),
    {
      name: STORAGE_KEY,
      version: STORAGE_VERSION,
      storage: createJSONStorage(() => localStorage),
      partialize: (state): StoredSettings => ({
        audio: state.audio,
        graphics: state.graphics,
        controls: state.controls,
      }),
      // Versi lama belum punya grafis/kontrol; bagian yang hilang mulai dari bawaan.
      migrate: (persisted) => persisted as StoredSettings,
      merge: (persisted, current): SettingsState => {
        const saved = (persisted ?? {}) as Partial<StoredSettings>;
        return {
          ...current,
          audio: sanitizeAudio(saved.audio),
          graphics: sanitizeGraphics(saved.graphics),
          controls: sanitizeControls(saved.controls),
        };
      },
    },
  ),
);
