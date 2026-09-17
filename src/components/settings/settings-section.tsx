import type { ReactNode } from "react";

/**
 * Satu bagian pada halaman Pengaturan.
 *
 * Ketiga bagiannya dibingkai sama supaya terbaca sebagai satu daftar sejajar,
 * bukan tiga kotak yang kebetulan bertumpuk. Judul dan keterangannya berada di
 * dalam bingkai, bukan mengambang di atasnya, agar jelas keterangan itu
 * menjelaskan bagian yang mana saat halaman digulir.
 */
export function SettingsSection({
  id,
  eyebrow,
  title,
  description,
  children,
}: {
  /** Dipakai tautan lompat di kepala halaman. */
  id: string;
  eyebrow: string;
  title: string;
  description: string;
  children: ReactNode;
}) {
  return (
    <section
      id={id}
      // scroll-mt menjaga judul bagian tidak menempel di tepi atas layar saat
      // dicapai lewat tautan lompat.
      className="scroll-mt-6 rounded-xl border border-white/10 bg-slate-900/40 px-5 py-5"
      aria-labelledby={`${id}-judul`}
    >
      <p className="text-[10px] tracking-[0.2em] text-emerald-400 uppercase">
        {eyebrow}
      </p>
      <h2 id={`${id}-judul`} className="mt-1 text-lg font-bold text-white">
        {title}
      </h2>
      <p className="mt-1 max-w-xl text-[11px] leading-relaxed text-slate-500">
        {description}
      </p>

      <div className="mt-4">{children}</div>
    </section>
  );
}

/** Satu baris pengaturan: nama di kiri, kendali di kanan. */
export function SettingsRow({
  label,
  hint,
  children,
}: {
  label: string;
  /** Keterangan singkat di bawah nama; boleh kosong. */
  hint?: string;
  children: ReactNode;
}) {
  return (
    <div className="flex flex-col gap-2 border-b border-white/5 py-3 last:border-b-0 sm:flex-row sm:items-center sm:gap-6">
      <div className="min-w-0 sm:w-44 sm:shrink-0">
        <p className="text-sm font-medium text-slate-200">{label}</p>
        {hint ? (
          <p className="mt-0.5 text-[11px] leading-relaxed text-slate-500">
            {hint}
          </p>
        ) : null}
      </div>
      <div className="min-w-0 flex-1">{children}</div>
    </div>
  );
}
