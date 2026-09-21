"use client";

import { SettingsRow } from "@/components/settings/settings-section";
import { VolumeSetting } from "@/components/settings/volume-setting";
import {
  playAmbienceSample,
  playElimination,
  playHit,
  playReload,
  playShot,
} from "@/lib/audio/audio-engine";
import {
  COMBAT_CHANNELS,
  COMBAT_CHANNEL_INFO,
  matchingPreset,
  type CombatChannel,
} from "@/lib/game/combat-audio";
import { MOCK_COMBAT_AUDIO_CATALOGUE } from "@/lib/mock/combat-audio";
import { useSettingsStore } from "@/lib/store/settings-store";

/**
 * Contoh bunyi tiap kanal untuk tombol Dengar. Diputar lewat kanal yang sama
 * dengan yang dipakai di arena, jadi yang terdengar di sini persis sekeras
 * yang nanti terdengar saat bertanding.
 */
const SAMPLE: Record<CombatChannel, () => void> = {
  tembakan: () => playShot("rifle"),
  isiUlang: () => playReload("rifle"),
  kena: () => {
    playHit(false);
    // Disusul denting kepala supaya kedua nadanya bisa dibandingkan.
    window.setTimeout(() => playHit(true), 140);
  },
  eliminasi: () => playElimination(false),
  suasana: () => playAmbienceSample(),
};

const TOMBOL_KECIL =
  "shrink-0 rounded-lg border border-white/15 px-3 py-1 text-[12px] font-medium text-slate-300 transition-colors hover:border-white/30 hover:bg-white/5 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-emerald-400 disabled:cursor-not-allowed disabled:opacity-40";

/**
 * Panel kontrol audio tempur: campuran bunyi di dalam pertandingan.
 *
 * Duduk di dalam bagian Suara, di bawah penggeser efek dan musik, karena
 * memang bawahannya: tiap kanal di sini adalah bagian dari volume efek, dan
 * tombol bisu ikut membungkam semuanya. Menaruhnya sebagai bagian terpisah
 * akan menyiratkan bahwa ia berdiri sendiri, dan pemain yang membisukan efek
 * lalu masih melihat kanal "Tembakan" di 100 akan bertanya mana yang berlaku.
 *
 * Presetnya berasal dari katalog tiruan yang bentuknya meniru jawaban server;
 * yang tersimpan tetap campuran per kanal, bukan nama presetnya. Preset yang
 * "aktif" dihitung dari kesamaan angkanya, jadi menggeser satu kanal langsung
 * melepaskan tanda presetnya tanpa keadaan tambahan yang bisa basi.
 */
export function CombatAudioPanel({ disabled = false }: { disabled?: boolean }) {
  const mix = useSettingsStore((state) => state.combatMix);
  const setCombatChannel = useSettingsStore((state) => state.setCombatChannel);
  const applyCombatMix = useSettingsStore((state) => state.applyCombatMix);

  const { presets } = MOCK_COMBAT_AUDIO_CATALOGUE;
  const aktif = matchingPreset(presets, mix);

  return (
    <div
      id="audio-tempur"
      role="group"
      aria-labelledby="audio-tempur-judul"
      data-sumber="tiruan"
      data-preset={aktif?.id ?? "kustom"}
      className={`mt-4 rounded-lg border border-white/10 bg-slate-950/40 px-4 py-4 ${
        disabled ? "opacity-60" : ""
      }`}
    >
      <p className="text-[10px] tracking-[0.2em] text-emerald-400/80 uppercase">
        Panel audio tempur
      </p>
      <h3
        id="audio-tempur-judul"
        className="mt-1 text-sm font-semibold text-white"
      >
        Campuran suara pertandingan
      </h3>
      <p className="mt-1 max-w-xl text-[11px] leading-relaxed text-slate-500">
        Perbandingan bunyi di dalam arena. Semuanya berada di bawah volume efek
        di atas: memelankan efek memelankan semuanya, sedangkan panel ini
        mengatur mana yang menonjol.
      </p>

      <div className="mt-3 flex flex-wrap items-center gap-2">
        <span className="text-[11px] text-slate-400">Preset:</span>
        {presets.map((preset) => {
          const dipilih = aktif?.id === preset.id;
          return (
            <button
              key={preset.id}
              type="button"
              disabled={disabled}
              aria-pressed={dipilih}
              title={preset.note}
              onClick={() => applyCombatMix(preset.mix)}
              className={`rounded-lg border px-3 py-1 text-[12px] font-medium transition-colors focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-emerald-400 disabled:cursor-not-allowed disabled:opacity-40 ${
                dipilih
                  ? "border-emerald-400/70 bg-emerald-500/10 text-emerald-200"
                  : "border-white/15 text-slate-300 hover:border-white/30 hover:bg-white/5"
              }`}
            >
              {preset.label}
            </button>
          );
        })}
      </div>
      <p className="mt-1.5 text-[11px] leading-relaxed text-slate-500">
        {aktif
          ? aktif.note
          : "Campuran kustom: kamu sudah menggeser sendiri salah satu kanalnya."}
      </p>

      <div className="mt-2">
        {COMBAT_CHANNELS.map((channel) => {
          const info = COMBAT_CHANNEL_INFO[channel];
          return (
            <SettingsRow key={channel} label={info.label} hint={info.hint}>
              <div className="flex items-center gap-3">
                <VolumeSetting
                  id={`mix-${channel}`}
                  label={`Kanal ${info.label.toLowerCase()}`}
                  value={mix[channel]}
                  onChange={(value) => setCombatChannel(channel, value)}
                  disabled={disabled}
                />
                <button
                  type="button"
                  disabled={disabled || mix[channel] === 0}
                  aria-label={`Dengar contoh ${info.label.toLowerCase()}`}
                  onClick={SAMPLE[channel]}
                  className={TOMBOL_KECIL}
                >
                  Dengar
                </button>
              </div>
            </SettingsRow>
          );
        })}
      </div>

      {/*
        Dikatakan apa adanya: preset dan kanal ini baru hidup di perangkat
        ini. Pemain yang berganti perangkat dan mendapati campurannya kembali
        ke bawaan lebih baik sudah tahu sejak awal daripada menyangka
        simpanannya hilang.
      */}
      <p
        className="mt-3 text-[11px] leading-relaxed text-slate-500"
        data-sinkron="perangkat"
      >
        Tersimpan di perangkat ini. Sinkron ke akun menyusul saat server
        pengaturan audio siap.
      </p>
    </div>
  );
}
