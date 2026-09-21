import { create } from "zustand";
import { createJSONStorage, persist } from "zustand/middleware";
import { STORAGE_KEYS } from "@/lib/store/storage";
import {
  DEFAULT_SETTINGS,
  clampScale,
  clampSensitivity,
  clampVolume,
  isQualityLevel,
  type AudioSettings,
  type ControlSettings,
  type DisplaySettings,
  type GameSettings,
  type QualityLevel,
} from "@/lib/game/settings";
import {
  DEFAULT_COMBAT_MIX,
  clampChannel,
  sanitizeCombatMix,
  sameCombatMix,
  type CombatChannel,
  type CombatMix,
} from "@/lib/game/combat-audio";

/** Kunci penyimpanan; diawali nama game supaya tidak bentrok di domain yang sama. */
const STORAGE_KEY = STORAGE_KEYS.settings;
const STORAGE_VERSION = 2;

/**
 * Simpanan dari versi mana pun tetap DIPAKAI, bukan dibuang.
 *
 * Tanpa fungsi ini, menaikkan nomor versi membuat zustand membuang seluruh
 * simpanan lama diam-diam: pemain yang sudah menyetel volume, campuran suara
 * tempur, kualitas gambar, dan sensitivitasnya mendapati semuanya kembali ke
 * bawaan hanya karena ada bidang baru yang ditambahkan. Pembersihan per bidang
 * di `merge` sudah tahu cara menangani bidang yang hilang atau rusak, jadi
 * yang perlu dilakukan di sini hanyalah meneruskan apa adanya.
 */
function migrateSettings(persisted: unknown): unknown {
  return persisted ?? {};
}

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

function sanitizeControls(value: unknown): ControlSettings {
  const saved = (value ?? {}) as Partial<ControlSettings>;
  return {
    sensitivity:
      typeof saved.sensitivity === "number"
        ? clampSensitivity(saved.sensitivity)
        : DEFAULT_SETTINGS.controls.sensitivity,
  };
}

/**
 * Yang benar-benar ditulis ke perangkat. Campuran tempur ikut di sini tetapi
 * BUKAN bagian dari `GameSettings`: endpoint pengaturan di server belum
 * mengenalnya, dan memasukkannya ke bentuk yang dikirim ke sana akan membuat
 * setiap penyimpanan ditolak sampai servernya menyusul.
 */
interface PersistedSettings extends GameSettings {
  combatMix: CombatMix;
}

interface SettingsState extends PersistedSettings {
  setEffectsVolume: (value: number) => void;
  setMusicVolume: (value: number) => void;
  setMuted: (muted: boolean) => void;
  setQuality: (quality: QualityLevel) => void;
  setRenderScale: (value: number) => void;
  setShowFps: (show: boolean) => void;
  setSensitivity: (value: number) => void;
  /** Menyetel satu kanal campuran tempur, 0..100. */
  setCombatChannel: (channel: CombatChannel, value: number) => void;
  /** Mengganti seluruh campuran sekaligus, mis. dari preset. */
  applyCombatMix: (mix: CombatMix) => void;
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
      controls: DEFAULT_SETTINGS.controls,
      combatMix: DEFAULT_COMBAT_MIX,

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

      setSensitivity: (value) =>
        set((state) => {
          const sensitivity = clampSensitivity(value);
          return sensitivity === state.controls.sensitivity
            ? state
            : { controls: { ...state.controls, sensitivity } };
        }),

      setCombatChannel: (channel, value) =>
        set((state) => {
          const level = clampChannel(channel, value);
          return level === state.combatMix[channel]
            ? state
            : { combatMix: { ...state.combatMix, [channel]: level } };
        }),

      applyCombatMix: (mix) =>
        set((state) => {
          const combatMix = sanitizeCombatMix(mix);
          return sameCombatMix(combatMix, state.combatMix)
            ? state
            : { combatMix };
        }),

      resetSettings: () =>
        set({
          audio: DEFAULT_SETTINGS.audio,
          display: DEFAULT_SETTINGS.display,
          controls: DEFAULT_SETTINGS.controls,
          combatMix: DEFAULT_COMBAT_MIX,
        }),
    }),
    {
      name: STORAGE_KEY,
      version: STORAGE_VERSION,
      storage: createJSONStorage(() => localStorage),
      migrate: migrateSettings,
      partialize: (state): PersistedSettings => ({
        audio: state.audio,
        display: state.display,
        controls: state.controls,
        combatMix: state.combatMix,
      }),
      merge: (persisted, current): SettingsState => {
        const saved = (persisted ?? {}) as Partial<PersistedSettings>;
        return {
          ...current,
          audio: sanitizeAudio(saved.audio),
          display: sanitizeDisplay(saved.display),
          controls: sanitizeControls(saved.controls),
          combatMix: sanitizeCombatMix(saved.combatMix),
        };
      },
    },
  ),
);
