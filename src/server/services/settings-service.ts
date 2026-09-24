import { eq } from "drizzle-orm";
import { db } from "@/server/db/client";
import {
  playerAudioSettings,
  playerSettings,
  type PlayerAudioSettingsRow,
  type PlayerSettingsRow,
} from "@/server/db/schema";
import { DEFAULT_BINDINGS, sanitizeBindings } from "@/lib/game/keybindings";
import type { ControlValues, GraphicsValues, SettingsValues } from "@/server/services/settings-validation";

/**
 * Preferensi pemain yang ikut pindah perangkat. Klien memakai volume 0..1;
 * database menyimpan persen bulat 0..100.
 */

export interface AudioPreferences {
  master: number;
  sfx: number;
  music: number;
  ui: number;
  muted: boolean;
}

export const DEFAULT_AUDIO_PREFERENCES: AudioPreferences = { master: 0.8, sfx: 0.9, music: 0.5, ui: 0.7, muted: false };

const toPercent = (value: number) => Math.round(Math.min(1, Math.max(0, value)) * 100);

function toAudio(row: PlayerAudioSettingsRow): AudioPreferences {
  return {
    master: row.masterPercent / 100,
    sfx: row.sfxPercent / 100,
    music: row.musicPercent / 100,
    ui: row.uiPercent / 100,
    muted: row.muted,
  };
}

/** Preferensi audio tersimpan; `updatedAt` null berarti pemain belum pernah menyimpan. */
export function getAudioPreferences(playerId: number): { audio: AudioPreferences; updatedAt: number | null } {
  const row = db.select().from(playerAudioSettings).where(eq(playerAudioSettings.playerId, playerId)).get();
  return row ? { audio: toAudio(row), updatedAt: row.updatedAt } : { audio: DEFAULT_AUDIO_PREFERENCES, updatedAt: null };
}

/** Menyimpan preferensi audio (seluruhnya, bukan tambalan). */
export function saveAudioPreferences(playerId: number, audio: AudioPreferences): { audio: AudioPreferences; updatedAt: number } {
  const values = {
    masterPercent: toPercent(audio.master),
    sfxPercent: toPercent(audio.sfx),
    musicPercent: toPercent(audio.music),
    uiPercent: toPercent(audio.ui),
    muted: audio.muted,
    updatedAt: Date.now(),
  };
  const row = db
    .insert(playerAudioSettings)
    .values({ playerId, ...values })
    .onConflictDoUpdate({ target: playerAudioSettings.playerId, set: values })
    .returning()
    .get();
  return { audio: toAudio(row), updatedAt: row.updatedAt };
}

export const DEFAULT_GRAPHICS_VALUES: GraphicsValues = { quality: "sedang", resolutionScale: 1, fov: 75, showFps: true };
export const DEFAULT_CONTROL_VALUES: ControlValues = { sensitivity: 1, bindings: DEFAULT_BINDINGS };

function toGraphics(row: PlayerSettingsRow): GraphicsValues {
  return { quality: row.quality, resolutionScale: row.resolutionPercent / 100, fov: row.fov, showFps: row.showFps };
}

function toControls(row: PlayerSettingsRow): ControlValues {
  // Aksi yang belum tercatat (mis. aksi baru) memakai tombol bawaan.
  return { sensitivity: row.sensitivityCenti / 100, bindings: sanitizeBindings(row.bindings) };
}

export interface AllSettings {
  audio: AudioPreferences;
  graphics: GraphicsValues;
  controls: ControlValues;
  /** Kapan tiap bagian terakhir disimpan; null berarti masih bawaan. */
  updatedAt: { audio: number | null; settings: number | null };
}

/** Seluruh pengaturan pemain dalam satu bentuk; bagian yang belum pernah disimpan berisi bawaan. */
export function getAllSettings(playerId: number): AllSettings {
  const audio = getAudioPreferences(playerId);
  const row = db.select().from(playerSettings).where(eq(playerSettings.playerId, playerId)).get();
  return {
    audio: audio.audio,
    graphics: row ? toGraphics(row) : DEFAULT_GRAPHICS_VALUES,
    controls: row ? toControls(row) : DEFAULT_CONTROL_VALUES,
    updatedAt: { audio: audio.updatedAt, settings: row?.updatedAt ?? null },
  };
}

/**
 * Menyimpan pengaturan yang sudah lolos validasi. Hanya bagian yang dikirim
 * yang berubah: mengirim grafis saja tidak menimpa kontrol, dan sebaliknya.
 * Semua ditulis dalam satu transaksi.
 */
export function saveSettings(playerId: number, values: SettingsValues): AllSettings {
  db.transaction(() => {
    if (values.audio) saveAudioPreferences(playerId, values.audio);
    if (values.graphics || values.controls) {
      const current = getAllSettings(playerId);
      const graphics = values.graphics ?? current.graphics;
      const controls = values.controls ?? current.controls;
      const row = {
        quality: graphics.quality,
        resolutionPercent: Math.round(graphics.resolutionScale * 100),
        fov: graphics.fov,
        showFps: graphics.showFps,
        sensitivityCenti: Math.round(controls.sensitivity * 100),
        bindings: controls.bindings,
        updatedAt: Date.now(),
      };
      db.insert(playerSettings)
        .values({ playerId, ...row })
        .onConflictDoUpdate({ target: playerSettings.playerId, set: row })
        .run();
    }
  });
  return getAllSettings(playerId);
}
