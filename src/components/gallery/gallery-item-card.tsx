import type { ReactNode } from "react";

/** Keadaan sebuah item di galeri, menentukan lencana dan redupnya kartu. */
export type GalleryItemStatus = "terpasang" | "dimiliki" | "terkunci";

const STATUS_BADGE: Record<GalleryItemStatus, { label: string; className: string } | null> = {
  terpasang: { label: "Terpasang", className: "bg-emerald-400/15 text-emerald-300" },
  dimiliki: null,
  terkunci: { label: "Terkunci", className: "bg-white/5 text-slate-500" },
};

/**
 * Kartu satu item galeri — senjata, skin, atau attachment — dengan tata letak
 * yang sama: pratinjau di atas, nama dan label jenis/kelangkaan, satu baris
 * keterangan, rincian opsional, dan slot aksi (favorit, inspect) di pojok.
 */
export function GalleryItemCard({
  preview,
  title,
  tag,
  tagColor,
  caption,
  status = "dimiliki",
  details,
  actions,
  accent,
  isNew = false,
}: {
  /** Gambar item: siluet senjata, contoh skin, atau ikon attachment. */
  preview: ReactNode;
  title: string;
  /** Label kecil di kanan nama, mis. jenis senjata atau tingkat skin. */
  tag?: string;
  tagColor?: string;
  /** Satu baris keterangan di bawah nama. */
  caption?: ReactNode;
  status?: GalleryItemStatus;
  /** Rincian tambahan, mis. statistik singkat. */
  details?: ReactNode;
  /** Tombol kecil di pojok kanan atas pratinjau. */
  actions?: ReactNode;
  /** Warna garis tepi untuk item istimewa (mis. skin gold). */
  accent?: string;
  /** Item baru yang belum dilihat: diberi titik dan label "Baru". */
  isNew?: boolean;
}) {
  const badge = STATUS_BADGE[status];
  const locked = status === "terkunci";

  return (
    <article
      className={`relative flex h-full flex-col rounded-xl border bg-slate-900/60 p-3 transition-colors ${locked ? "opacity-55" : ""}`}
      style={{ borderColor: accent ? `${accent}66` : "rgba(255,255,255,0.1)" }}
    >
      <div className="relative rounded-lg bg-slate-950/60 px-3 py-4">
        {preview}
        {actions ? <div className="absolute top-1.5 right-1.5 flex gap-1">{actions}</div> : null}
        {badge ? (
          <span className={`absolute bottom-1.5 left-1.5 rounded px-1.5 py-0.5 text-[9px] font-semibold tracking-[0.12em] uppercase ${badge.className}`}>
            {badge.label}
          </span>
        ) : null}
      </div>
      <div className="mt-2.5 flex items-center justify-between gap-2">
        <h3 className="flex min-w-0 items-center gap-1.5 text-sm font-semibold text-white">
          <span className="truncate">{title}</span>
          {isNew ? (
            <span className="shrink-0 rounded bg-emerald-400 px-1 py-px text-[9px] font-bold tracking-wider text-slate-950 uppercase">
              Baru
            </span>
          ) : null}
        </h3>
        {tag ? (
          <span className="shrink-0 text-[9px] font-semibold tracking-wider uppercase" style={{ color: tagColor ?? "#64748b" }}>
            {tag}
          </span>
        ) : null}
      </div>
      {caption ? <div className="mt-0.5 truncate text-[11px] text-slate-500">{caption}</div> : null}
      {details ? <div className="mt-2">{details}</div> : null}
    </article>
  );
}
