import { create } from "zustand";
import { createJSONStorage, persist } from "zustand/middleware";
import {
  DEFAULT_SETTINGS,
  clampScale,
  clampVolume,
  isQualityLevel,
  type AudioSettings,
  type DisplaySettings,
  type GameSettings,
  type QualityLevel,
} from "@/lib/game/settings";

/** Kunci penyimpanan; diawali nama game supaya tidak bentrok di domain yang sama. */
const STORAGE_KEY = "coolmatch:pengaturan";
const STORAGE_VERSION = 1;

/**
 * Isi localStorage bisa berasal dari versi lama, disunting tangan, atau rusak
 * separuh. Tiap bidang karena itu dibersihkan sendiri-sendiri, bukan diterima
 * sebagai satu gumpalan: simpanan yang hanya rusak pada volume musiknya tidak
 * perlu membuang tingkat kualitas yang sudah dipilih pemain.
 */
function sanitizeAudio(value: unknown): AudioSettings {
  const saved = (value ?? {}) as Partial<AudioSettings>;
  return {
    effects:
      typeof saved.effects === "number"
        ? clampVolume(saved.effects)
        : DEFAULT_SETTINGS.audio.effects,
    music:
      typeof saved.music === "number"
        ? clampVolume(saved.music)
        : DEFAULT_SETTINGS.audio.music,
    muted:
      typeof saved.muted === "boolean"
        ? saved.muted
        : DEFAULT_SETTINGS.audio.muted,
  };
}

function sanitizeDisplay(value: unknown): DisplaySettings {
  const saved = (value ?? {}) as Partial<DisplaySettings>;
  return {
    quality: isQualityLevel(saved.quality)
      ? saved.quality
      : DEFAULT_SETTINGS.display.quality,
    renderScale:
      typeof saved.renderScale === "number"
        ? clampScale(saved.renderScale)
        : DEFAULT_SETTINGS.display.renderScale,
    showFps:
      typeof saved.showFps === "boolean"
        ? saved.showFps
        : DEFAULT_SETTINGS.display.showFps,
  };
}

interface SettingsState extends GameSettings {
  setEffectsVolume: (value: number) => void;
  setMusicVolume: (value: number) => void;
  setMuted: (muted: boolean) => void;
  setQuality: (quality: QualityLevel) => void;
  setRenderScale: (value: number) => void;
  setShowFps: (show: boolean) => void;
  /** Mengembalikan seluruh pengaturan ke bawaan. */
  resetSettings: () => void;
}

/**
 * Pengaturan permainan, tersimpan otomatis ke perangkat.
 *
 * Polanya sama dengan pengaturan lawan dan peta: `persist` memulihkan simpanan
 * saat modul dimuat, sementara zustand tetap memakai keadaan awal sebagai
 * potret server — jadi hasil prerender cocok dengan render hidrasi dan nilai
 * simpanan masuk pada render berikutnya.
 *
 * Tidak ada tombol "simpan". Pengaturan yang perlu dikonfirmasi membuat pemain
 * ragu apakah perubahannya sudah berlaku; di sini tiap geseran langsung
 * tersimpan, dan satu tombol kembali ke bawaan menjadi jalan pulangnya.
 */
export const useSettingsStore = create<SettingsState>()(
  persist(
    (set) => ({
      audio: DEFAULT_SETTINGS.audio,
      display: DEFAULT_SETTINGS.display,

      setEffectsVolume: (value) =>
        set((state) => {
          const effects = clampVolume(value);
          return effects === state.audio.effects
            ? state
            : { audio: { ...state.audio, effects } };
        }),

      setMusicVolume: (value) =>
        set((state) => {
          const music = clampVolume(value);
          return music === state.audio.music
            ? state
            : { audio: { ...state.audio, music } };
        }),

      setMuted: (muted) =>
        set((state) =>
          muted === state.audio.muted
            ? state
            : { audio: { ...state.audio, muted } },
        ),

      setQuality: (quality) =>
        set((state) =>
          quality === state.display.quality
            ? state
            : { display: { ...state.display, quality } },
        ),

      setRenderScale: (value) =>
        set((state) => {
          const renderScale = clampScale(value);
          return renderScale === state.display.renderScale
            ? state
            : { display: { ...state.display, renderScale } };
        }),

      setShowFps: (showFps) =>
        set((state) =>
          showFps === state.display.showFps
            ? state
            : { display: { ...state.display, showFps } },
        ),

      resetSettings: () =>
        set({
          audio: DEFAULT_SETTINGS.audio,
          display: DEFAULT_SETTINGS.display,
        }),
    }),
    {
      name: STORAGE_KEY,
      version: STORAGE_VERSION,
      storage: createJSONStorage(() => localStorage),
      partialize: (state): GameSettings => ({
        audio: state.audio,
        display: state.display,
      }),
      merge: (persisted, current): SettingsState => {
        const saved = (persisted ?? {}) as Partial<GameSettings>;
        return {
          ...current,
          audio: sanitizeAudio(saved.audio),
          display: sanitizeDisplay(saved.display),
        };
      },
    },
  ),
);
