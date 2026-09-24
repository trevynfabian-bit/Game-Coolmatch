"use client";

import Link from "next/link";
import { WalletBadge } from "@/components/economy/wallet-badge";
import { NotificationIcon } from "@/components/notifications/notification-icon";
import { unseenCount, useNotificationStore } from "@/lib/store/notification-store";

const KIND_LABEL = {
  koin: "Koin",
  skin: "Skin",
  upgrade: "Upgrade",
  hadiah: "Hadiah",
  senjata: "Senjata",
} as const;

/** Waktu relatif singkat dalam bahasa Indonesia. */
export function timeAgo(timestamp: number, now = Date.now()): string {
  const minutes = Math.max(0, Math.round((now - timestamp) / 60000));
  if (minutes < 1) return "baru saja";
  if (minutes < 60) return `${minutes} menit lalu`;
  const hours = Math.round(minutes / 60);
  if (hours < 24) return `${hours} jam lalu`;
  return `${Math.round(hours / 24)} hari lalu`;
}

/**
 * Halaman utama notifikasi hadiah: semua hadiah yang didapat — koin, skin,
 * upgrade, hadiah killstreak, senjata — terbaru di atas. Yang belum dilihat
 * diberi penanda dan dikelompokkan di bagian "Baru".
 */
export function NotificationCenter() {
  const items = useNotificationStore((state) => state.items);
  const markSeen = useNotificationStore((state) => state.markSeen);
  const markAllSeen = useNotificationStore((state) => state.markAllSeen);
  const unseen = unseenCount(items);

  const fresh = items.filter((item) => item.seenAt === null);
  const earlier = items.filter((item) => item.seenAt !== null);

  return (
    <div className="mx-auto w-full max-w-2xl px-5 py-10 sm:px-8">
      <header className="mb-6 flex flex-wrap items-end justify-between gap-4">
        <div>
          <p className="text-[10px] tracking-[0.3em] text-emerald-400 uppercase">Kotak hadiah</p>
          <h1 className="mt-2 text-3xl font-bold tracking-tight text-white">Notifikasi Hadiah</h1>
          <p className="mt-2 text-sm text-slate-400">
            {unseen > 0 ? `${unseen} hadiah belum kamu lihat.` : "Semua hadiah sudah kamu lihat."}
          </p>
        </div>
        <div className="flex items-center gap-3">
          <WalletBadge />
          <button
            type="button"
            onClick={markAllSeen}
            disabled={unseen === 0}
            className="rounded-lg border border-white/15 px-3 py-1.5 text-xs font-semibold text-slate-200 hover:border-white/30 disabled:opacity-40"
          >
            Tandai semua dilihat
          </button>
        </div>
      </header>

      {items.length === 0 ? (
        <p className="rounded-xl border border-dashed border-white/15 px-6 py-10 text-center text-sm text-slate-400">
          Belum ada hadiah. Main satu pertandingan untuk mulai mengumpulkannya.
        </p>
      ) : null}

      {[
        { title: "Baru", list: fresh },
        { title: "Sebelumnya", list: earlier },
      ].map((group) =>
        group.list.length > 0 ? (
          <section key={group.title} className="mb-8" aria-label={group.title}>
            <h2 className="mb-2 text-[11px] tracking-[0.2em] text-slate-400 uppercase">{group.title}</h2>
            <ul className="space-y-2">
              {group.list.map((item) => {
                const isNew = item.seenAt === null;
                return (
                  <li key={item.id}>
                    <button
                      type="button"
                      onClick={() => markSeen(item.id)}
                      className={`flex w-full items-center gap-4 rounded-xl border px-4 py-3 text-left transition-colors ${
                        isNew
                          ? "border-emerald-400/30 bg-emerald-500/5 hover:bg-emerald-500/10"
                          : "border-white/10 bg-slate-900/50 hover:bg-slate-900"
                      }`}
                      aria-label={`${item.title}${isNew ? ", belum dilihat" : ""}`}
                    >
                      <span className="grid h-11 w-14 shrink-0 place-items-center rounded-lg bg-slate-950/70">
                        <NotificationIcon item={item} />
                      </span>
                      <span className="min-w-0 flex-1">
                        <span className="flex items-center gap-2">
                          <span className="truncate text-sm font-semibold text-white">{item.title}</span>
                          {isNew ? <span className="h-2 w-2 shrink-0 rounded-full bg-emerald-400" aria-hidden /> : null}
                        </span>
                        <span className="block truncate text-xs text-slate-400">{item.body}</span>
                      </span>
                      <span className="shrink-0 text-right">
                        <span className="block text-[10px] tracking-wider text-slate-500 uppercase">{KIND_LABEL[item.kind]}</span>
                        <span className="block text-[10px] text-slate-600" suppressHydrationWarning>
                          {timeAgo(item.createdAt)}
                        </span>
                      </span>
                    </button>
                  </li>
                );
              })}
            </ul>
          </section>
        ) : null,
      )}

      <Link href="/" className="text-sm text-slate-400 hover:text-slate-200">
        ← Kembali ke menu
      </Link>
    </div>
  );
}
