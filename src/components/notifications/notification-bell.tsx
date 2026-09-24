"use client";

import Link from "next/link";
import { unseenCount, useNotificationStore } from "@/lib/store/notification-store";

/** Lonceng notifikasi dengan jumlah hadiah yang belum dilihat. */
export function NotificationBell() {
  const count = useNotificationStore((state) => unseenCount(state.items));
  return (
    <Link
      href="/notifikasi"
      aria-label={count > 0 ? `Notifikasi hadiah, ${count} belum dilihat` : "Notifikasi hadiah"}
      className="relative grid h-9 w-9 place-items-center rounded-full border border-white/15 bg-slate-900/70 text-slate-300 hover:border-white/30 hover:text-white"
    >
      <svg viewBox="0 0 16 16" className="h-4 w-4" fill="none" stroke="currentColor" strokeWidth="1.5" aria-hidden>
        <path d="M4 11V7a4 4 0 0 1 8 0v4l1 1.5H3z" strokeLinejoin="round" />
        <path d="M6.5 14a1.5 1.5 0 0 0 3 0" />
      </svg>
      {count > 0 ? (
        <span className="absolute -top-1 -right-1 min-w-4 rounded-full bg-emerald-400 px-1 text-center font-mono text-[10px] font-bold text-slate-950">
          {count}
        </span>
      ) : null}
    </Link>
  );
}
