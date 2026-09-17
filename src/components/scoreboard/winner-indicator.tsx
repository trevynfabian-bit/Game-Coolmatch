import type { ReactNode } from "react";

const SIZE_CLASS = {
  sm: "text-lg",
  md: "text-2xl",
  lg: "text-3xl",
} as const;

export interface WinnerIndicatorProps {
  /** Nama juara. Kosong berarti tidak ada juara — seri atau belum selesai. */
  winnerName: string | null;
  /**
   * Nama pemain di perangkat ini, dipakai untuk mengenali bahwa dialah yang
   * juara sehingga bisa disapa langsung.
   *
   * Dioper, bukan dibaca sendiri dari penyimpanan: komponen ini murni tampilan
   * dan dipakai tiga layar yang berbeda, dan yang membaca nama tersimpan harus
   * ikut menjaga aturan hidrasinya.
   */
  localName: string;
  /**
   * Benar bila pertandingan berhenti sebelum selesai, misalnya ditinggal di
   * tengah jalan. Bedanya dengan seri penting: seri berarti kedudukan benar-
   * benar imbang setelah semuanya dimainkan, sedangkan ini berarti juaranya
   * tidak pernah sempat ditentukan.
   */
  unfinished?: boolean;
  /**
   * Nama peserta yang sama-sama di puncak saat seri. Dipakai untuk menyebutkan
   * siapa yang imbang alih-alih hanya mengumumkan bahwa pertandingannya seri.
   */
  tiedNames?: string[];
  size?: keyof typeof SIZE_CLASS;
  /** Kata yang dipakai untuk pertandingannya, misalnya "simulasi". */
  subject?: string;
  children?: ReactNode;
}

/**
 * Pengumuman hasil sebuah pertandingan: siapa juaranya, atau bahwa
 * kedudukannya berakhir seri, atau bahwa pertandingannya tidak pernah selesai.
 *
 * Ketiga keadaan itu tadinya ditulis ulang di tiap layar yang menampilkannya —
 * klasemen akhir di arena, rincian di halaman skor, dan papan skor simulasi —
 * masing-masing dengan susunan ternary dan pilihan katanya sendiri, sehingga
 * layar yang satu berkata "Kamu juara" dan yang lain "Kamu juara!". Sekarang
 * kalimatnya satu, dan yang berbeda hanya ukuran hurufnya.
 *
 * Seri diberi keterangan tersendiri yang menyebut nama peserta yang imbang,
 * sebab "berakhir seri" saja meninggalkan pertanyaan paling wajar yang muncul
 * sesudahnya: seri antara siapa.
 */
export function WinnerIndicator({
  winnerName,
  localName,
  unfinished = false,
  tiedNames = [],
  size = "md",
  subject,
  children,
}: WinnerIndicatorProps) {
  const playerWon = winnerName === localName;
  const suffix = subject ? ` ${subject}` : "";

  const headline = winnerName
    ? playerWon
      ? `Kamu juara${suffix}!`
      : `${winnerName} juara${suffix}`
    : unfinished
      ? "Tidak selesai"
      : `Berakhir seri`;

  const tone = winnerName
    ? playerWon
      ? "text-emerald-300"
      : "text-slate-100"
    : unfinished
      ? "text-slate-400"
      : "text-amber-300";

  /**
   * Keterangan di bawah judul. Untuk seri, nama-nama yang imbang disebut
   * langsung; pemenang dua orang ditulis "A dan B", lebih dari itu dipisah koma
   * dengan "dan" sebelum nama terakhir.
   */
  const detail = (() => {
    if (winnerName || unfinished) return null;
    if (tiedNames.length < 2) return null;
    const names =
      tiedNames.length === 2
        ? tiedNames.join(" dan ")
        : `${tiedNames.slice(0, -1).join(", ")}, dan ${tiedNames.at(-1)}`;
    return `${names} sama kuat sampai angka terakhir — tidak ada satu pun pemecah kedudukan yang tersisa.`;
  })();

  return (
    <div>
      <h2 className={`font-bold ${SIZE_CLASS[size]} ${tone}`}>{headline}</h2>
      {detail ? (
        <p className="mt-1.5 text-[11px] leading-relaxed text-amber-200/80">
          {detail}
        </p>
      ) : null}
      {children}
    </div>
  );
}
