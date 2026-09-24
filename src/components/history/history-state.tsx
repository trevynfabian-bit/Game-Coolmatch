"use client";

import Link from "next/link";
import { useEffect, type ReactNode } from "react";
import { useHistoryStore } from "@/lib/store/history-store";

/**
 * Pembungkus halaman riwayat: memuat data sekali, lalu menampilkan keadaan
 * yang sesuai — kerangka saat memuat, pesan galat dengan tombol coba lagi,
 * peringatan saat data cadangan (server tidak terbaca penuh), keadaan kosong,
 * atau isi halaman.
 */
export function HistoryState({
  children,
  emptyText = "Belum ada pertandingan tercatat.",
}: {
  children: ReactNode;
  emptyText?: string;
}) {
  const status = useHistoryStore((state) => state.status);
  const error = useHistoryStore((state) => state.error);
  const count = useHistoryStore((state) => state.matches.length);
  const load = useHistoryStore((state) => state.load);

  useEffect(() => {
    if (useHistoryStore.getState().status === "idle") void load();
  }, [load]);

  if (status === "idle" || status === "loading") {
    return (
      <div className="space-y-2" role="status" aria-label="Memuat riwayat">
        {Array.from({ length: 4 }, (_, index) => (
          <div
            key={index}
            className="h-14 animate-pulse rounded-xl border border-white/5 bg-slate-900/60"
          />
        ))}
      </div>
    );
  }

  if (status === "error") {
    return (
      <div
        role="alert"
        className="rounded-xl border border-rose-400/30 bg-rose-950/40 px-6 py-8 text-center"
      >
        <p className="text-sm font-semibold text-rose-100">
          Riwayat gagal dimuat
        </p>
        <p className="mt-1 text-xs text-rose-200/80">
          {error ?? "Server sedang bermasalah."}
        </p>
        <button
          type="button"
          onClick={() => void load()}
          className="mt-4 rounded-lg bg-rose-500 px-4 py-2 text-sm font-semibold text-white hover:bg-rose-400"
        >
          Coba lagi
        </button>
      </div>
    );
  }

  if (count === 0) {
    return (
      <div className="rounded-xl border border-dashed border-white/15 px-6 py-10 text-center">
        <p className="text-sm text-slate-300">{emptyText}</p>
        <Link
          href="/lawan"
          className="mt-3 inline-block rounded-lg bg-emerald-500 px-4 py-2 text-sm font-semibold text-slate-950 hover:bg-emerald-400"
        >
          Main sekarang
        </Link>
      </div>
    );
  }

  return (
    <>
      {status === "degraded" ? (
        <p
          role="status"
          className="mb-4 rounded-lg border border-amber-400/30 bg-amber-400/5 px-3 py-2 text-xs text-amber-200"
        >
          Sebagian riwayat belum bisa dibaca dari server. Yang tampil mungkin
          belum lengkap.
          <button
            type="button"
            onClick={() => void load()}
            className="ml-2 underline"
          >
            Muat ulang
          </button>
        </p>
      ) : null}
      {children}
    </>
  );
}
