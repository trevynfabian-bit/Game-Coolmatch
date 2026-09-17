import Link from "next/link";
import { SelectedMapLabel } from "@/components/maps/selected-map-label";
import { PlayerNameLabel } from "@/components/profile/player-name-label";

/**
 * Titik masuk sementara. Menu utama lengkap (main cepat, pilih peta, pilih
 * senjata, koleksi, pengaturan) dibangun pada task menu tersendiri — halaman
 * ini hanya menyediakan jalan cepat ke arena.
 */
export default function Home() {
  return (
    <main className="grid min-h-dvh place-items-center px-6">
      <div className="w-full max-w-md text-center">
        <p className="text-[11px] tracking-[0.3em] text-emerald-400 uppercase">
          Deathmatch 3D
        </p>
        <h1 className="mt-3 text-4xl font-bold tracking-tight text-white">
          Arena Tembak Simple
        </h1>
        <p className="mt-3 text-sm leading-relaxed text-slate-400">
          Bertarung melawan musuh otomatis di arena low-poly. Pilih senjata,
          kuasai panggung tengah, dan kumpulkan kill sampai batas skor tercapai.
        </p>

        <div className="mt-8 flex flex-col items-center justify-center gap-3 sm:flex-row">
          <Link
            href="/lawan"
            className="w-full rounded-lg bg-emerald-500 px-6 py-3 text-center text-sm font-semibold text-slate-950 transition-colors hover:bg-emerald-400 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-emerald-400 sm:w-auto"
          >
            Main Cepat
          </Link>
          <Link
            href="/senjata"
            className="w-full rounded-lg border border-white/15 px-6 py-3 text-center text-sm font-semibold text-slate-200 transition-colors hover:border-white/30 hover:bg-white/5 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-slate-400 sm:w-auto"
          >
            Pilih Senjata
          </Link>
          <Link
            href="/peta"
            className="w-full rounded-lg border border-white/15 px-6 py-3 text-center text-sm font-semibold text-slate-200 transition-colors hover:border-white/30 hover:bg-white/5 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-slate-400 sm:w-auto"
          >
            Pilih Peta
          </Link>
          <Link
            href="/skor"
            className="w-full rounded-lg border border-white/15 px-6 py-3 text-center text-sm font-semibold text-slate-200 transition-colors hover:border-white/30 hover:bg-white/5 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-slate-400 sm:w-auto"
          >
            Papan Skor
          </Link>
          <Link
            href="/nama"
            className="w-full rounded-lg border border-white/15 px-6 py-3 text-center text-sm font-semibold text-slate-200 transition-colors hover:border-white/30 hover:bg-white/5 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-slate-400 sm:w-auto"
          >
            Nama Pemain
          </Link>
        </div>

        <p className="mt-6 text-xs text-slate-600">
          Kamu bermain sebagai <PlayerNameLabel /> · Peta saat ini:{" "}
          <SelectedMapLabel />
        </p>
      </div>
    </main>
  );
}
