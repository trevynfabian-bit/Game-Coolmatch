import Link from "next/link";
import type { MouseEvent, ReactNode } from "react";

const BASE =
  "rounded-lg text-center font-semibold transition-colors focus-visible:outline-2 focus-visible:outline-offset-2";

/**
 * Ukuran ditaruh terpisah dari BASE, bukan ditimpa lewat `className`. Dua kelas
 * padding Tailwind yang sama-sama ada pada satu elemen diputuskan oleh urutan
 * aturan di stylesheet, bukan oleh urutan penulisannya — jadi menimpanya tidak
 * bisa diandalkan.
 */
const SIZE = {
  biasa: "px-6 py-3 text-sm",
  /** Untuk lapisan sempit seperti layar jeda, yang muat beberapa tombol. */
  ringkas: "px-4 py-2.5 text-[13px]",
} as const;

const VARIANT = {
  /** Tindakan yang paling mungkin diinginkan pemain di layar itu. */
  utama:
    "bg-emerald-500 text-slate-950 hover:bg-emerald-400 focus-visible:outline-emerald-400",
  /** Tindakan lain yang setara satu sama lain. */
  biasa:
    "border border-white/15 text-slate-200 hover:border-white/30 hover:bg-white/5 focus-visible:outline-slate-400",
} as const;

export type ActionVariant = keyof typeof VARIANT;
export type ActionSize = keyof typeof SIZE;

/**
 * Tombol tindakan: satu bentuk untuk seluruh permainan, dipakai baik di halaman
 * biasa maupun di lapisan HUD yang menumpuk arena.
 *
 * Kliknya SELALU dihentikan agar tidak merambat ke document. Di arena, drei
 * PointerLockControls menyimak klik di level document dan akan mencoba mengunci
 * kursor kembali begitu ada klik ke mana pun — sehingga menekan "Kembali ke
 * menu" dari layar jeda justru melanjutkan pertandingan alih-alih keluar
 * darinya. Itu detail yang mudah terlupa saat menambah tombol baru, jadi
 * ditaruh di sini sekali untuk semuanya; di halaman biasa ia tidak berpengaruh.
 */
export function ActionButton({
  href,
  onClick,
  variant = "biasa",
  size = "biasa",
  className = "",
  children,
}: {
  /** Isi untuk berpindah halaman; kosongkan bila tombolnya menjalankan aksi. */
  href?: string;
  onClick?: (event: MouseEvent<HTMLElement>) => void;
  variant?: ActionVariant;
  size?: ActionSize;
  className?: string;
  children: ReactNode;
}) {
  const handle = (event: MouseEvent<HTMLElement>) => {
    event.stopPropagation();
    onClick?.(event);
  };
  const classes = `${BASE} ${SIZE[size]} ${VARIANT[variant]} ${className}`;

  if (href) {
    return (
      <Link href={href} onClick={handle} className={classes}>
        {children}
      </Link>
    );
  }

  return (
    <button type="button" onClick={handle} className={classes}>
      {children}
    </button>
  );
}

/**
 * Deretan tombol tindakan. Menumpuk ke bawah di layar sempit dan berjajar rata
 * di layar lebar, berapa pun jumlah tombolnya — itu sebabnya lebar kolomnya
 * dibagi rata alih-alih ditulis per jumlah.
 */
export function ActionRow({
  children,
  className = "",
}: {
  children: ReactNode;
  className?: string;
}) {
  return (
    <div
      className={`grid gap-3 sm:auto-cols-fr sm:grid-flow-col ${className}`}
    >
      {children}
    </div>
  );
}
