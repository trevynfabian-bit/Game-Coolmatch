"use client";

import {
  EffectsPreview,
  MusicPreview,
} from "@/components/settings/audio-preview";
import { ChoiceSetting } from "@/components/settings/choice-setting";
import { KeybindSection } from "@/components/settings/keybind-section";
import {
  SettingsRow,
  SettingsSection,
} from "@/components/settings/settings-section";
import { VolumeSetting } from "@/components/settings/volume-setting";
import { ActionButton, ActionRow } from "@/components/ui/action-button";
import { QUALITY_ORDER, QUALITY_PROFILES } from "@/lib/game/settings";
import { useSettingsStore } from "@/lib/store/settings-store";
import { useAudioSettings } from "@/lib/audio/use-audio-settings";

/** Ketiga bagian halaman ini, dipakai judul sekaligus tautan lompatnya. */
const SECTIONS = [
  { id: "suara", label: "Suara" },
  { id: "tombol", label: "Tombol" },
  { id: "tampilan", label: "Tampilan" },
] as const;

const QUALITY_CHOICES = QUALITY_ORDER.map((level) => ({
  value: level,
  label: QUALITY_PROFILES[level].label,
}));

/**
 * Halaman Pengaturan: suara, tombol, dan tampilan.
 *
 * Tiga bagian dalam satu halaman, bukan tiga halaman terpisah. Jumlah
 * pengaturannya sedikit, dan memecahnya jadi tiga alamat berarti pemain yang
 * hanya ingin mengecilkan suara harus menebak lebih dulu bagian mana yang
 * memuatnya. Tautan lompat di kepala halaman menutup jarak untuk layar sempit,
 * tempat ketiga bagian tidak muat sekaligus.
 *
 * Tidak ada tombol "simpan". Tiap perubahan langsung tersimpan ke perangkat,
 * dan "Kembali ke bawaan" menjadi jalan pulangnya — pengaturan yang perlu
 * dikonfirmasi selalu meninggalkan keraguan apakah perubahannya sudah berlaku.
 */
export function SettingsScreen() {
  // Layar ini ikut mengeluarkan bunyi lewat tombol Dengar, jadi ia juga yang
  // menyalurkan volume ke mesin audio — dan itulah yang membuat penggeser
  // terdengar berubah sambil ditarik, bukan hanya pada tembakan berikutnya.
  useAudioSettings();

  const audio = useSettingsStore((state) => state.audio);
  const quality = useSettingsStore((state) => state.display.quality);
  const setEffectsVolume = useSettingsStore((state) => state.setEffectsVolume);
  const setMusicVolume = useSettingsStore((state) => state.setMusicVolume);
  const setMuted = useSettingsStore((state) => state.setMuted);
  const setQuality = useSettingsStore((state) => state.setQuality);
  const resetSettings = useSettingsStore((state) => state.resetSettings);

  return (
    <div className="mx-auto w-full max-w-3xl px-5 py-10 sm:px-8">
      <header className="mb-6">
        <p className="text-[10px] tracking-[0.3em] text-emerald-400 uppercase">
          Pengaturan permainan
        </p>
        <h1 className="mt-2 text-3xl font-bold tracking-tight text-white">
          Atur Kenyamananmu
        </h1>
        <p className="mt-2 max-w-xl text-sm leading-relaxed text-slate-400">
          Suara, tombol, dan tampilan. Semua yang kamu ubah di sini langsung
          tersimpan di perangkat ini, jadi tidak ada yang perlu dikonfirmasi.
        </p>

        <nav
          aria-label="Bagian pengaturan"
          className="mt-4 flex flex-wrap gap-2"
        >
          {SECTIONS.map((section) => (
            <a
              key={section.id}
              href={`#${section.id}`}
              className="rounded-lg border border-white/15 px-3 py-1.5 text-[12px] font-medium text-slate-300 transition-colors hover:border-white/30 hover:bg-white/5 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-slate-400"
            >
              {section.label}
            </a>
          ))}
        </nav>
      </header>

      <div className="space-y-4">
        <SettingsSection
          id="suara"
          eyebrow="Bagian satu"
          title="Suara & Musik"
          description="Besar kecilnya suara tembakan dan musik latar. Keduanya terpisah supaya musik bisa dimatikan tanpa ikut membisukan tembakan, yang justru berguna untuk mendengar langkah lawan."
        >
          <SettingsRow
            label="Bisukan semua"
            hint="Angka di bawah tetap tersimpan."
          >
            <button
              type="button"
              role="switch"
              aria-checked={audio.muted}
              onClick={() => setMuted(!audio.muted)}
              className={`rounded-lg border px-3.5 py-1.5 text-[13px] font-medium transition-colors focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-emerald-400 ${
                audio.muted
                  ? "border-amber-400/60 bg-amber-500/10 text-amber-200"
                  : "border-white/15 text-slate-300 hover:border-white/30 hover:bg-white/5"
              }`}
            >
              {audio.muted ? "Sedang dibisukan" : "Bunyi menyala"}
            </button>
          </SettingsRow>

          <SettingsRow label="Efek suara" hint="Tembakan, langkah, benturan.">
            <div className="flex items-center gap-3">
              <VolumeSetting
                id="volume-efek"
                label="Volume efek suara"
                value={audio.effects}
                onChange={setEffectsVolume}
                disabled={audio.muted}
              />
              <EffectsPreview disabled={audio.muted} />
            </div>
          </SettingsRow>

          <SettingsRow label="Musik latar">
            <div className="flex items-center gap-3">
              <VolumeSetting
                id="volume-musik"
                label="Volume musik latar"
                value={audio.music}
                onChange={setMusicVolume}
                disabled={audio.muted}
              />
              <MusicPreview disabled={audio.muted} />
            </div>
          </SettingsRow>
        </SettingsSection>

        <SettingsSection
          id="tombol"
          eyebrow="Bagian dua"
          title="Atur Tombol"
          description="Tombol gerak dan aksi yang dipakai di arena maupun tempat latihan. Tekan Ubah, lalu tekan tombol yang kamu mau; perubahannya langsung berlaku."
        >
          <KeybindSection />
        </SettingsSection>

        <SettingsSection
          id="tampilan"
          eyebrow="Bagian tiga"
          title="Tampilan Layar"
          description="Seberapa tajam gambar arena digambar. Menurunkannya adalah cara pertama yang perlu dicoba kalau gerakan terasa tersendat."
        >
          <SettingsRow
            label="Kualitas gambar"
            hint="Berlaku pada pertandingan berikutnya."
          >
            <ChoiceSetting
              label="Kualitas gambar"
              choices={QUALITY_CHOICES}
              value={quality}
              onChange={setQuality}
            />
          </SettingsRow>

          <p className="pt-3 text-[11px] leading-relaxed text-slate-500">
            {QUALITY_PROFILES[quality].note}
          </p>
        </SettingsSection>
      </div>

      <div className="mt-6 flex justify-end">
        <button
          type="button"
          onClick={resetSettings}
          className="rounded-lg px-3 py-1.5 text-[12px] text-slate-500 transition-colors hover:text-slate-300 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-slate-400"
        >
          Kembali ke bawaan
        </button>
      </div>

      <ActionRow className="mt-4">
        <ActionButton variant="utama" href="/lawan">
          Bertanding
        </ActionButton>
        <ActionButton href="/profil">Profil</ActionButton>
        <ActionButton href="/">Kembali ke menu</ActionButton>
      </ActionRow>
    </div>
  );
}
