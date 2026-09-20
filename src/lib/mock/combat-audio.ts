import {
  COMBAT_CHANNELS,
  DEFAULT_COMBAT_MIX,
  type CombatMixPreset,
} from "@/lib/game/combat-audio";
import { VOLUME_MAX, VOLUME_MIN } from "@/lib/game/settings";

/**
 * Data tiruan katalog audio tempur.
 *
 * Bentuknya meniru jawaban endpoint pengaturan audio tempur yang akan dibangun
 * di sisi server: daftar kanal, preset yang ditawarkan, dan batas nilainya.
 * Panel kontrol dibangun di atas bentuk ini sekarang, supaya saat servernya
 * siap yang diganti hanya sumber datanya, bukan panelnya.
 */
export interface CombatAudioCatalogue {
  channels: readonly (typeof COMBAT_CHANNELS)[number][];
  presets: readonly CombatMixPreset[];
  limits: { min: number; max: number };
}

/**
 * Preset campuran, dari yang paling "informatif" sampai yang paling ramai.
 *
 * Yang pertama selalu sama dengan bawaan supaya panel bisa menunjukkan
 * "kamu masih di bawaan" lewat penanda preset yang sama, tanpa cabang khusus.
 */
export const MOCK_COMBAT_MIX_PRESETS: readonly CombatMixPreset[] = [
  {
    id: "seimbang",
    label: "Seimbang",
    note: "Bawaan. Semua bunyi jelas, latar sedikit dipelankan.",
    mix: DEFAULT_COMBAT_MIX,
  },
  {
    id: "fokus-lawan",
    label: "Fokus lawan",
    note: "Letupan sendiri dipelankan supaya denting kena dan eliminasi menonjol.",
    mix: {
      tembakan: 60,
      isiUlang: 70,
      kena: 100,
      eliminasi: 100,
      suasana: 25,
    },
  },
  {
    id: "tenang",
    label: "Tenang",
    note: "Semua bunyi dipelankan, cocok bermain larut malam.",
    mix: {
      tembakan: 45,
      isiUlang: 45,
      kena: 70,
      eliminasi: 60,
      suasana: 20,
    },
  },
  {
    id: "ramai",
    label: "Ramai",
    note: "Latar penuh dan letupan kencang, arena terasa paling hidup.",
    mix: {
      tembakan: 100,
      isiUlang: 100,
      kena: 90,
      eliminasi: 100,
      suasana: 100,
    },
  },
];

export const MOCK_COMBAT_AUDIO_CATALOGUE: CombatAudioCatalogue = {
  channels: COMBAT_CHANNELS,
  presets: MOCK_COMBAT_MIX_PRESETS,
  limits: { min: VOLUME_MIN, max: VOLUME_MAX },
};
