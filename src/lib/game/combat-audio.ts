import {
  VOLUME_MAX,
  clampVolume,
  effectiveVolume,
  type AudioSettings,
} from "@/lib/game/settings";

/**
 * Campuran audio tempur: seberapa keras tiap KELOMPOK bunyi di dalam
 * pertandingan, relatif terhadap volume efek.
 *
 * Satu penggeser "efek suara" tidak cukup untuk arena. Pemain yang mengandalkan
 * denting kena untuk tahu tembakannya masuk ingin denting itu jelas, sementara
 * letupan senjatanya sendiri yang berbunyi ratusan kali per ronde justru ingin
 * ia pelankan. Keduanya bunyi "efek", dan memelankan satu tanpa yang lain
 * hanya mungkin bila masing-masing punya kanalnya sendiri.
 *
 * Kanal-kanal ini duduk DI BAWAH volume efek, bukan di sampingnya: angka di
 * sini dikalikan dengan volume efek dan ikut nol saat semuanya dibisukan.
 * Dengan begitu penggeser efek dan tombol bisu tetap berarti "semua bunyi
 * pertandingan", dan panel ini hanya mengatur perbandingan di antaranya.
 */

export const COMBAT_CHANNELS = [
  "tembakan",
  "isiUlang",
  "kena",
  "eliminasi",
  "suasana",
] as const;

export type CombatChannel = (typeof COMBAT_CHANNELS)[number];

/** Campuran tempur: tiap kanal 0..100, seperti volume yang dibaca pemain. */
export type CombatMix = Record<CombatChannel, number>;

export interface CombatChannelInfo {
  label: string;
  /** Bunyi apa saja yang lewat kanal ini, untuk keterangan di panel. */
  hint: string;
}

/** Nama dan isi tiap kanal, dalam urutan tampil di panel. */
export const COMBAT_CHANNEL_INFO: Record<CombatChannel, CombatChannelInfo> = {
  tembakan: {
    label: "Tembakan",
    hint: "Letupan senjatamu sendiri dan tembakan lawan di sekitarmu.",
  },
  isiUlang: {
    label: "Isi ulang & senjata",
    hint: "Ketukan magasin, pelatuk kosong, dan ganti senjata.",
  },
  kena: {
    label: "Tembakan kena",
    hint: "Denting saat pelurumu mengenai lawan, lebih tinggi untuk kepala.",
  },
  eliminasi: {
    label: "Eliminasi",
    hint: "Tanda saat lawan tumbang atau kamu yang tumbang.",
  },
  suasana: {
    label: "Suasana arena",
    hint: "Desau angin dan gema ruang di latar pertandingan.",
  },
};

/**
 * Bawaan: semua kanal penuh kecuali suasana. Latar yang sekeras denting kena
 * menutupi informasi yang justru paling berguna, jadi ia mulai dari setengah.
 */
export const DEFAULT_COMBAT_MIX: CombatMix = {
  tembakan: 100,
  isiUlang: 100,
  kena: 100,
  eliminasi: 100,
  suasana: 50,
};

export interface CombatMixPreset {
  id: string;
  label: string;
  /** Untuk siapa preset ini, dalam satu kalimat. */
  note: string;
  mix: CombatMix;
}

/**
 * Menjepit satu kanal ke rentang volume yang sah; angka rusak jatuh ke
 * bawaan kanalnya, bukan ke nol, supaya simpanan yang korup tidak membisukan
 * satu kanal diam-diam.
 */
export function clampChannel(channel: CombatChannel, value: unknown): number {
  if (typeof value !== "number" || !Number.isFinite(value)) {
    return DEFAULT_COMBAT_MIX[channel];
  }
  return clampVolume(value);
}

/**
 * Membersihkan campuran yang datang dari simpanan atau jaringan. Tiap kanal
 * diperiksa sendiri-sendiri: kanal yang rusak tidak membuang kanal lain yang
 * sudah disetel pemain.
 */
export function sanitizeCombatMix(value: unknown): CombatMix {
  const saved = (value ?? {}) as Partial<Record<CombatChannel, unknown>>;
  const mix = {} as CombatMix;
  for (const channel of COMBAT_CHANNELS) {
    mix[channel] = clampChannel(channel, saved[channel]);
  }
  return mix;
}

/** Benar bila kedua campuran sama persis di semua kanal. */
export function sameCombatMix(a: CombatMix, b: CombatMix): boolean {
  return COMBAT_CHANNELS.every((channel) => a[channel] === b[channel]);
}

export function isDefaultCombatMix(mix: CombatMix): boolean {
  return sameCombatMix(mix, DEFAULT_COMBAT_MIX);
}

/**
 * Pengali 0..1 yang dipakai mesin audio untuk satu kanal: bagian kanal itu
 * dari volume efek. Nol saat dibisukan, karena bisu berarti semua bunyi
 * pertandingan, bukan hanya yang tidak punya kanal.
 */
export function channelGain(
  audio: AudioSettings,
  mix: CombatMix,
  channel: CombatChannel,
): number {
  return (
    effectiveVolume(audio, "effects") *
    (clampChannel(channel, mix[channel]) / VOLUME_MAX)
  );
}

/** Pengali 0..1 per kanal, tanpa volume efek: itulah yang dipegang mesin audio. */
export function channelLevels(mix: CombatMix): Record<CombatChannel, number> {
  const levels = {} as Record<CombatChannel, number>;
  for (const channel of COMBAT_CHANNELS) {
    levels[channel] = clampChannel(channel, mix[channel]) / VOLUME_MAX;
  }
  return levels;
}

/**
 * Preset yang persis sama dengan campuran saat ini, atau null bila pemain
 * sudah menggeser sesuatu sendiri. Dipakai panel untuk menandai preset aktif
 * tanpa menyimpan "preset terpilih" sebagai keadaan terpisah yang bisa basi.
 */
export function matchingPreset(
  presets: readonly CombatMixPreset[],
  mix: CombatMix,
): CombatMixPreset | null {
  return presets.find((preset) => sameCombatMix(preset.mix, mix)) ?? null;
}
