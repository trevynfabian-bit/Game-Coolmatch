import { eq } from "drizzle-orm";
import { db } from "@/server/db/client";
import { playerAudioSettings, type PlayerAudioSettingsRow } from "@/server/db/schema";

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
