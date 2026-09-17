import Link from "next/link";
import { PlayerStatus } from "@/components/menu/player-status";

/** Tujuan sekunder menu, diurutkan mengikuti urutan pemain menyiapkannya. */
const DESTINATIONS = [
  { href: "/senjata", label: "Pilih Senjata" },
  { href: "/peta", label: "Pilih Peta" },
  { href: "/lawan", label: "Atur Lawan" },
  { href: "/latihan", label: "Latihan" },
  { href: "/koleksi", label: "Koleksi" },
  { href: "/skor", label: "Papan Skor" },
  { href: "/profil", label: "Profil" },
] as const;

/**
 * Menu utama.
 *
 * Satu tombol besar dan sisanya sejajar. "Main Cepat" memang harus menang
 * sendirian: seluruh pilihan sudah tersimpan dan punya nilai bawaan yang
 * masuk akal, jadi pemain yang baru datang tidak perlu menyentuh satu pun
 * layar persiapan untuk mulai bertanding.
 *
 * Yang dipilih pemain disebutkan tepat di atas tombol itu — nama, senjata,
 * peta, dan lawan. Tombol yang menjanjikan "cepat" sebaiknya tidak menyimpan
 * kejutan soal apa yang akan dipakainya.
 *
 * Halaman ini tetap komponen server. Hanya ringkasan pilihan yang perlu
 * berjalan di browser, dan ia sudah dipisah ke pulau kliennya sendiri.
 */
export default function Home() {
  return (
    <main className="grid min-h-dvh place-items-center px-6 py-12">
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

        <PlayerStatus />

        <Link
          href="/lawan"
          className="mt-8 block w-full rounded-lg bg-emerald-500 px-6 py-4 text-center text-base font-semibold text-slate-950 transition-colors hover:bg-emerald-400 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-emerald-400"
        >
          Main Cepat
        </Link>

        <nav aria-label="Menu persiapan" className="mt-4">
          <ul className="grid grid-cols-2 gap-2">
            {DESTINATIONS.map((item) => (
              <li key={item.href}>
                <Link
                  href={item.href}
                  className="block w-full rounded-lg border border-white/15 px-4 py-3 text-center text-sm font-medium text-slate-200 transition-colors hover:border-white/30 hover:bg-white/5 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-slate-400"
                >
                  {item.label}
                </Link>
              </li>
            ))}
          </ul>
        </nav>
      </div>
    </main>
  );
}
