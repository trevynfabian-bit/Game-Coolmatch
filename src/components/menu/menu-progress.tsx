import Link from "next/link";
import { NextUnlockLine } from "@/components/progress/next-unlock";
import { ProgressLine } from "@/components/progress/progress-summary";
import { collectionFacts } from "@/lib/game/collection";
import {
  MOCK_PLAYER_PROGRESS,
  weaponOwnership,
} from "@/lib/mock/player-weapons";
import { MOCK_WEAPONS } from "@/lib/mock/weapons";

/**
 * Ringkasan kemajuan bermain di kaki menu utama, beserta senjata yang paling
 * dekat terbuka.
 *
 * Sistem membuka senjata hanya bekerja bila pemain TAHU ada yang sedang ia
 * kejar. Sebelumnya angka itu hanya ada di halaman Koleksi, yang harus dicari
 * sendiri — pemain bisa bermain sepuluh kali tanpa pernah tahu senjata
 * berikutnya tinggal beberapa kill lagi. Di sini ia muncul tepat sebelum
 * pemain memilih mau ke mana.
 *
 * Berbeda dengan ringkasan pilihan di atasnya, bagian ini TIDAK perlu berjalan
 * di browser: sumbernya masih data tiruan yang sama untuk semua orang, bukan
 * pilihan yang tersimpan di perangkat, jadi hasil prerender dan hasil hidrasi
 * pasti sama. Saat backend menyimpan kemajuan per pemain, barulah ia harus
 * ikut menjadi pulau klien seperti PlayerStatus.
 */
export function MenuProgress() {
  const collection = collectionFacts(MOCK_WEAPONS, weaponOwnership);

  return (
    <Link
      href="/koleksi"
      className="mt-6 block rounded-xl border border-white/10 bg-slate-900/40 px-4 py-3 transition-colors hover:border-white/25 hover:bg-slate-900/70 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-slate-400"
    >
      <span className="block text-[9px] tracking-[0.2em] text-slate-500 uppercase">
        Progres main
      </span>
      <span className="mt-1.5 block">
        <ProgressLine progress={MOCK_PLAYER_PROGRESS} />
      </span>

      {collection.nextUnlock ? (
        <span className="mt-2 block border-t border-white/5 pt-2">
          <NextUnlockLine entry={collection.nextUnlock} />
        </span>
      ) : (
        <span className="mt-2 block border-t border-white/5 pt-2 text-[11px] text-emerald-300/80">
          Seluruh senjata sudah terbuka.
        </span>
      )}
    </Link>
  );
}
