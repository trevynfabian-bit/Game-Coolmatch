import Link from "next/link";
import type { ReactNode } from "react";

const TABS = [{ href: "/pengaturan/audio", label: "Audio" }] as const;

/** Kerangka halaman pengaturan: judul dan tab antar bagian. */
export function SettingsShell({
  active,
  title,
  description,
  children,
}: {
  active: string;
  title: string;
  description: string;
  children: ReactNode;
}) {
  return (
    <div className="mx-auto w-full max-w-2xl px-5 py-10 sm:px-8">
      <p className="text-[10px] tracking-[0.3em] text-emerald-400 uppercase">Pengaturan</p>
      <h1 className="mt-2 text-3xl font-bold tracking-tight text-white">{title}</h1>
      <p className="mt-2 text-sm text-slate-400">{description}</p>
      <nav aria-label="Bagian pengaturan" className="mt-6 mb-8 flex w-fit gap-1 rounded-lg border border-white/10 bg-slate-900/60 p-1 text-sm">
        {TABS.map((tab) => (
          <Link
            key={tab.href}
            href={tab.href}
            aria-current={tab.href === active ? "page" : undefined}
            className={`rounded-md px-4 py-1.5 font-medium ${
              tab.href === active ? "bg-white/10 text-white" : "text-slate-400 hover:text-slate-200"
            }`}
          >
            {tab.label}
          </Link>
        ))}
      </nav>
      {children}
      <Link href="/" className="mt-10 inline-block text-sm text-slate-400 hover:text-slate-200">
        ← Kembali ke menu
      </Link>
    </div>
  );
}
