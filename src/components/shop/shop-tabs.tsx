import Link from "next/link";

const TABS = [
  { href: "/toko", label: "Upgrade Senjata" },
  { href: "/toko/skin", label: "Skin & Camo" },
] as const;

/** Tab antar bagian toko. */
export function ShopTabs({ active }: { active: (typeof TABS)[number]["href"] }) {
  return (
    <nav aria-label="Bagian toko" className="mb-6 flex gap-1 rounded-lg border border-white/10 bg-slate-900/60 p-1 text-sm w-fit">
      {TABS.map((tab) => (
        <Link
          key={tab.href}
          href={tab.href}
          aria-current={tab.href === active ? "page" : undefined}
          className={`rounded-md px-4 py-1.5 font-medium transition-colors focus-visible:outline-2 focus-visible:outline-emerald-400 ${
            tab.href === active ? "bg-white/10 text-white" : "text-slate-400 hover:text-slate-200"
          }`}
        >
          {tab.label}
        </Link>
      ))}
    </nav>
  );
}
