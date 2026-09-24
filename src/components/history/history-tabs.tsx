import Link from "next/link";

const TABS = [
  { href: "/riwayat", label: "Klasemen" },
  { href: "/riwayat/pertandingan", label: "Riwayat" },
] as const;

/** Tab halaman riwayat. */
export function HistoryTabs({ active }: { active: string }) {
  return (
    <nav
      aria-label="Bagian riwayat"
      className="mb-6 flex w-fit gap-1 rounded-lg border border-white/10 bg-slate-900/60 p-1 text-sm"
    >
      {TABS.map((tab) => (
        <Link
          key={tab.href}
          href={tab.href}
          aria-current={tab.href === active ? "page" : undefined}
          className={`rounded-md px-4 py-1.5 font-medium ${
            tab.href === active
              ? "bg-white/10 text-white"
              : "text-slate-400 hover:text-slate-200"
          }`}
        >
          {tab.label}
        </Link>
      ))}
    </nav>
  );
}
