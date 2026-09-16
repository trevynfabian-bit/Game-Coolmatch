import Link from "next/link";
import { MOCK_MATCH } from "@/lib/mock/match";

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

        <Link
          href="/arena"
          className="mt-8 inline-flex items-center justify-center rounded-lg bg-emerald-500 px-6 py-3 text-sm font-semibold text-slate-950 transition-colors hover:bg-emerald-400 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-emerald-400"
        >
          Masuk Arena
        </Link>

        <p className="mt-6 text-xs text-slate-600">
          Peta saat ini: {MOCK_MATCH.map.name} · {MOCK_MATCH.botCount} musuh
          otomatis
        </p>
      </div>
    </main>
  );
}
