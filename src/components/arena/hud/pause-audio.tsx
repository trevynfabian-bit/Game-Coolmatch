"use client";

import { VolumeSetting } from "@/components/settings/volume-setting";
import { useSettingsStore } from "@/lib/store/settings-store";

/**
 * Kendali suara di layar jeda.
 *
 * Saat inilah pemain menyadari suaranya terlalu keras — bukan di menu, bukan
 * sebelum masuk, melainkan tepat setelah letupan pertama mengagetkannya.
 * Sebelum ini satu-satunya jalan ke penggeser volume adalah tombol
 * "Pengaturan" yang MENINGGALKAN arena, artinya pertandingan yang sedang
 * berjalan hilang hanya untuk mengecilkan suara.
 *
 * Penggesernya menulis ke store pengaturan yang sama dengan halaman
 * Pengaturan, dan arena sudah menyalurkan store itu ke mesin audio tiap kali
 * berubah. Jadi perubahannya terdengar seketika, selagi jeda, tanpa satu pun
 * jalur baru menuju mesin suara — dan angkanya tetap tersimpan di perangkat
 * seperti perubahan yang dilakukan dari halaman Pengaturan.
 */
export function PauseAudio() {
  const audio = useSettingsStore((state) => state.audio);
  const setEffectsVolume = useSettingsStore((state) => state.setEffectsVolume);
  const setMusicVolume = useSettingsStore((state) => state.setMusicVolume);
  const setMuted = useSettingsStore((state) => state.setMuted);

  return (
    /*
      Klik di dalam kotak ini dihentikan dengan stopImmediatePropagation,
      bukan stopPropagation biasa.

      Pengunci kursor menyimak klik di DOCUMENT — dan di aplikasi ini React
      juga memasang pendengarnya di document. Keduanya bertetangga pada simpul
      yang sama, dan menghentikan rambatan hanya mencegah simpul di ATASNYA,
      bukan tetangga di simpul yang sama. Itulah sebabnya menyentuh penggeser
      volume sempat melempar pemain kembali ke arena di tengah geseran
      meskipun kliknya sudah "dihentikan".

      Dipasang di tingkat kotak dan bukan di tiap kendali, supaya kendali baru
      yang ditambahkan nanti ikut terlindungi tanpa harus diingat.
    */
    <div
      id="jeda-suara"
      onClick={(event) => event.nativeEvent.stopImmediatePropagation()}
      className="pointer-events-auto mx-auto mt-6 w-full max-w-[20rem] rounded-xl border border-white/10 bg-slate-950/60 px-4 py-3 text-left"
    >
      <div className="flex items-center justify-between gap-3">
        <p className="text-[10px] tracking-[0.2em] text-slate-400 uppercase">
          Suara
        </p>
        <button
          type="button"
          role="switch"
          aria-checked={audio.muted}
          aria-label="Bisukan semua suara"
          onClick={() => setMuted(!audio.muted)}
          className={`rounded-lg border px-2.5 py-1 text-[11px] font-medium transition-colors focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-emerald-400 ${
            audio.muted
              ? "border-amber-400/60 bg-amber-500/10 text-amber-200"
              : "border-white/15 text-slate-300 hover:border-white/30 hover:bg-white/5"
          }`}
        >
          {audio.muted ? "Dibisukan" : "Bunyi menyala"}
        </button>
      </div>

      <div className="mt-2 space-y-1.5">
        <div className="flex items-center gap-3">
          <span className="w-12 shrink-0 text-[11px] text-slate-400">Efek</span>
          <VolumeSetting
            id="jeda-volume-efek"
            label="Volume efek suara"
            value={audio.effects}
            onChange={setEffectsVolume}
            disabled={audio.muted}
          />
        </div>
        <div className="flex items-center gap-3">
          <span className="w-12 shrink-0 text-[11px] text-slate-400">
            Musik
          </span>
          <VolumeSetting
            id="jeda-volume-musik"
            label="Volume musik latar"
            value={audio.music}
            onChange={setMusicVolume}
            disabled={audio.muted}
          />
        </div>
      </div>

      <p className="mt-2 text-[10px] leading-relaxed text-slate-500">
        Berlaku seketika dan tersimpan. Campuran suara tempur per kanal ada di
        Pengaturan.
      </p>
    </div>
  );
}
