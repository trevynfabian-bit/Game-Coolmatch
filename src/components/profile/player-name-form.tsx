"use client";

import Link from "next/link";
import { useState } from "react";
import {
  PLAYER_NAME_MAX,
  PLAYER_NAME_MIN,
  checkPlayerName,
  normalizePlayerName,
  playerNameLength,
  type PlayerNameProblem,
} from "@/lib/game/player-name";
import { BOT_NAMES } from "@/lib/mock/bots";
import { useProfileStore } from "@/lib/store/profile-store";

/**
 * Kalimat untuk tiap alasan penolakan.
 *
 * Aturannya sendiri mengembalikan kode, bukan kalimat — supaya papan skor dan
 * server nanti bisa memakai aturan yang sama tanpa ikut memakai kata-kata
 * layar ini.
 */
const PROBLEM_TEXT: Record<PlayerNameProblem, string> = {
  kosong: "Tulis dulu namanya.",
  "terlalu-pendek": `Minimal ${PLAYER_NAME_MIN} huruf.`,
  "terlalu-panjang": `Maksimal ${PLAYER_NAME_MAX} huruf — papan skor tidak muat lebih dari itu.`,
  "karakter-terlarang":
    "Boleh huruf, angka, spasi, serta tanda titik, strip, dan garis bawah.",
  "tanpa-huruf": "Harus ada setidaknya satu huruf atau angka.",
  "sudah-dipakai":
    "Nama itu dipakai salah satu lawan otomatis. Papan skor jadi sulit dibaca kalau ada dua yang sama.",
};

/**
 * Isian nama pemain.
 *
 * Dipakai dua kali: berdiri sendiri sebagai layar onboarding, dan disisipkan di
 * halaman profil lewat `embedded` — yang membuang judul dan tautan lanjutannya,
 * karena halaman profil sudah punya judulnya sendiri dan tidak sedang menuntun
 * siapa pun ke mana-mana.
 *
 * Satu isian saja, tanpa kata sandi dan tanpa akun — nama ini hanya dipakai di
 * papan skor dan kill feed perangkat ini sendiri. Itu sebabnya ia bisa
 * dilewati: pemain yang hanya ingin langsung menembak tetap punya nama bawaan,
 * dan bisa kembali menamai dirinya kapan saja.
 */
export function PlayerNameForm({
  embedded = false,
}: { embedded?: boolean } = {}) {
  const playerName = useProfileStore((state) => state.playerName);
  const hasNamed = useProfileStore((state) => state.hasNamed);
  const setPlayerName = useProfileStore((state) => state.setPlayerName);

  const [draft, setDraft] = useState(hasNamed ? playerName : "");
  // Kesalahan baru muncul setelah percobaan menyimpan, bukan saat huruf
  // pertama diketik — memberi tahu "minimal 2 huruf" kepada orang yang baru
  // mengetik satu huruf adalah menegur seseorang yang sedang mengerjakannya.
  const [showProblem, setShowProblem] = useState(false);
  const [saved, setSaved] = useState(false);

  const problem = checkPlayerName(draft, BOT_NAMES);
  const preview = normalizePlayerName(draft);
  const length = playerNameLength(draft);

  function submit(event: React.FormEvent) {
    event.preventDefault();
    if (problem) {
      setShowProblem(true);
      return;
    }
    // Store punya aturannya sendiri dan bisa menolak. Tanpa memeriksa
    // jawabannya, form akan berkata "Tersimpan" atas nama yang justru tidak
    // jadi disimpan — kebohongan yang baru ketahuan di papan skor.
    if (!setPlayerName(draft)) {
      setShowProblem(true);
      return;
    }
    setSaved(true);
  }

  return (
    <div
      className={embedded ? "" : "mx-auto w-full max-w-lg px-5 py-12 sm:px-8"}
    >
      {embedded ? null : (
        <header className="mb-8">
          <p className="text-[10px] tracking-[0.3em] text-emerald-400 uppercase">
            Nama pemain
          </p>
          <h1 className="mt-2 text-3xl font-bold tracking-tight text-white">
            {hasNamed ? "Ganti namamu" : "Siapa namamu?"}
          </h1>
          <p className="mt-2 text-sm leading-relaxed text-slate-400">
            Nama ini yang muncul di papan skor dan kill feed. Tidak ada akun dan
            tidak ada kata sandi — ia hanya tersimpan di perangkat ini.
          </p>
        </header>
      )}

      <form onSubmit={submit} noValidate>
        <label className="block">
          <span className="mb-2 block text-[11px] tracking-[0.2em] text-slate-400 uppercase">
            Nama
          </span>
          <input
            type="text"
            value={draft}
            onChange={(event) => {
              setDraft(event.target.value);
              setSaved(false);
            }}
            // Meninggalkan isian adalah tanda pemain sudah selesai mengetik,
            // jadi kesalahannya pantas disebut tanpa menunggu tombol simpan.
            onBlur={() => {
              if (draft !== "") setShowProblem(true);
            }}
            placeholder="misalnya: Rio"
            autoFocus
            autoComplete="nickname"
            spellCheck={false}
            aria-invalid={showProblem && problem !== undefined}
            aria-describedby="nama-bantuan"
            className={`w-full rounded-lg border bg-slate-900/70 px-4 py-3 text-lg text-slate-100 placeholder:text-slate-600 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-emerald-400 ${
              showProblem && problem ? "border-rose-500/70" : "border-white/15"
            }`}
          />
        </label>

        <div className="mt-2 flex items-start justify-between gap-4">
          <p
            id="nama-bantuan"
            // Diumumkan pembaca layar saat isinya berubah. Tanpa ini, alasan
            // penolakan hanya terlihat oleh yang bisa melihatnya.
            aria-live="polite"
            className="text-[11px] leading-relaxed text-slate-500"
          >
            {showProblem && problem ? (
              <span className="text-rose-400">{PROBLEM_TEXT[problem]}</span>
            ) : preview && preview !== draft ? (
              <>
                Akan disimpan sebagai{" "}
                <span className="font-medium text-slate-300">{preview}</span>.
              </>
            ) : (
              `${PLAYER_NAME_MIN}–${PLAYER_NAME_MAX} huruf.`
            )}
          </p>
          <span
            className={`shrink-0 font-mono text-[11px] tabular-nums ${
              length > PLAYER_NAME_MAX ? "text-rose-400" : "text-slate-600"
            }`}
          >
            {length}/{PLAYER_NAME_MAX}
          </span>
        </div>

        {saved ? (
          <p
            role="status"
            className="mt-4 rounded-lg border border-emerald-400/30 bg-emerald-500/10 px-4 py-3 text-[11px] text-emerald-300"
          >
            Tersimpan. Mulai sekarang kamu tampil sebagai{" "}
            <span className="font-semibold">{playerName}</span>.
          </p>
        ) : null}

        <div className="mt-6 flex flex-col gap-3 sm:flex-row">
          <button
            type="submit"
            className="flex-1 rounded-lg bg-emerald-500 px-6 py-3 text-center text-sm font-semibold text-slate-950 transition-colors hover:bg-emerald-400 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-emerald-400"
          >
            Simpan nama
          </button>
          {embedded ? null : (
            <Link
              href={saved ? "/lawan" : "/"}
              className="flex-1 rounded-lg border border-white/15 px-6 py-3 text-center text-sm font-medium text-slate-300 transition-colors hover:border-white/30 hover:bg-white/5 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-slate-400"
            >
              {saved ? "Lanjut atur lawan" : "Nanti saja"}
            </Link>
          )}
        </div>
      </form>

      {hasNamed || embedded ? null : (
        <p className="mt-6 text-[11px] text-slate-600">
          Kalau dilewati, kamu tampil sebagai{" "}
          <span className="text-slate-400">{playerName}</span> dan bisa
          menggantinya kapan saja dari menu.
        </p>
      )}
    </div>
  );
}
