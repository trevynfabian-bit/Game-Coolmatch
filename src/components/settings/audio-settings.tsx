"use client";

import { SettingsShell } from "@/components/settings/settings-shell";
import { VolumeSlider } from "@/components/settings/volume-slider";
import { playExplosion, playGunshot, playHitConfirm } from "@/lib/audio/sfx";
import { useSettingsStore } from "@/lib/store/settings-store";

/**
 * Halaman pengaturan audio: volume utama, efek suara, musik, dan antarmuka,
 * plus tombol bisukan. Semua suara di game dibuat prosedural, jadi tidak ada
 * berkas yang diunduh — geser dan langsung dengar lewat tombol Tes.
 */
export function AudioSettingsPage() {
  const audio = useSettingsStore((state) => state.audio);
  const setAudio = useSettingsStore((state) => state.setAudio);
  const resetAudio = useSettingsStore((state) => state.resetAudio);

  return (
    <SettingsShell
      active="/pengaturan/audio"
      title="Audio"
      description="Semua suara dibuat langsung di browser tanpa berkas audio. Atur keras-lembutnya di sini."
    >
      <label className="mb-4 flex items-center justify-between rounded-xl border border-white/10 bg-slate-900/60 px-4 py-3">
        <span>
          <span className="block text-sm font-semibold text-white">Bisukan semua suara</span>
          <span className="block text-[11px] text-slate-500">Berguna saat main di tempat umum.</span>
        </span>
        <input
          type="checkbox"
          checked={audio.muted}
          onChange={(event) => setAudio({ muted: event.target.checked })}
          className="h-5 w-5 accent-emerald-400"
        />
      </label>

      <div className="space-y-3">
        <VolumeSlider
          label="Volume utama"
          hint="Mengatur semua kanal sekaligus."
          value={audio.master}
          disabled={audio.muted}
          onChange={(master) => setAudio({ master })}
          onTest={() => playExplosion(0.8)}
        />
        <VolumeSlider
          label="Efek suara"
          hint="Tembakan, ledakan, helikopter."
          value={audio.sfx}
          disabled={audio.muted}
          onChange={(sfx) => setAudio({ sfx })}
          onTest={() => playGunshot("rifle")}
        />
        <VolumeSlider
          label="Musik"
          hint="Musik latar menu dan arena."
          value={audio.music}
          disabled={audio.muted}
          onChange={(music) => setAudio({ music })}
        />
        <VolumeSlider
          label="Antarmuka"
          hint="Bunyi konfirmasi kena dan tombol."
          value={audio.ui}
          disabled={audio.muted}
          onChange={(ui) => setAudio({ ui })}
          onTest={() => playHitConfirm("kill")}
        />
      </div>

      <button type="button" onClick={resetAudio} className="mt-4 block text-xs text-slate-400 hover:text-slate-200">
        Kembalikan ke bawaan
      </button>
    </SettingsShell>
  );
}
