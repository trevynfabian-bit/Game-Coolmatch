"use client";

import { useEffect, useState } from "react";
import {
  playHit,
  playShot,
  startMusic,
  stopMusic,
} from "@/lib/audio/audio-engine";

/**
 * Tombol dengar untuk penggeser volume.
 *
 * Penggeser volume tanpa cara mendengarnya adalah tebak-tebakan: pemain
 * menggesernya ke angka yang terlihat masuk akal, masuk arena, lalu keluar
 * lagi untuk membetulkannya. Satu tombol di sebelahnya memotong seluruh
 * perjalanan itu.
 *
 * Klik pada tombol ini juga yang membangunkan konteks audio — browser menolak
 * mengeluarkan bunyi sebelum ada gerakan pengguna, jadi layar Pengaturan
 * memang tempat yang tepat untuk menyalakannya pertama kali.
 */
export function EffectsPreview({ disabled = false }: { disabled?: boolean }) {
  return (
    <button
      type="button"
      disabled={disabled}
      onClick={() => {
        playShot("rifle");
        // Denting kena menyusul sepersekian detik kemudian, seperti saat
        // tembakan benar-benar mengenai lawan.
        window.setTimeout(() => playHit(false), 90);
      }}
      className="shrink-0 rounded-lg border border-white/15 px-3 py-1 text-[12px] font-medium text-slate-300 transition-colors hover:border-white/30 hover:bg-white/5 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-emerald-400 disabled:cursor-not-allowed disabled:opacity-40"
    >
      Dengar
    </button>
  );
}

/**
 * Tombol dengar untuk musik. Berbeda dengan efek yang hanya sekejap, dengung
 * latar harus berjalan terus supaya bisa dinilai, jadi tombolnya menyala dan
 * padam alih-alih sekali bunyi.
 *
 * Yang disimpan adalah KEINGINAN pemain, sementara "sedang berbunyi"
 * diturunkan darinya bersama keadaan bisu. Dengan begitu membisukan suara
 * cukup menghentikan dengungnya lewat pembersihan efek yang sama dengan yang
 * dipakai saat pemain meninggalkan halaman — tidak ada cabang terpisah yang
 * bisa lupa mematikannya, dan tidak ada dengung yang terbawa ke halaman lain.
 */
export function MusicPreview({ disabled = false }: { disabled?: boolean }) {
  const [diminta, setDiminta] = useState(false);
  const berbunyi = diminta && !disabled;

  useEffect(() => {
    if (!berbunyi) return;
    startMusic();
    return stopMusic;
  }, [berbunyi]);

  return (
    <button
      type="button"
      disabled={disabled}
      aria-pressed={berbunyi}
      onClick={() => setDiminta((nyala) => !nyala)}
      className={`shrink-0 rounded-lg border px-3 py-1 text-[12px] font-medium transition-colors focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-emerald-400 disabled:cursor-not-allowed disabled:opacity-40 ${
        berbunyi
          ? "border-emerald-400/60 bg-emerald-500/10 text-emerald-200"
          : "border-white/15 text-slate-300 hover:border-white/30 hover:bg-white/5"
      }`}
    >
      {berbunyi ? "Hentikan" : "Dengar"}
    </button>
  );
}
