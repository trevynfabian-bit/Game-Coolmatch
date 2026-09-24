"use client";

import { useRouter } from "next/navigation";
import { useState } from "react";
import { keepCursorFree } from "@/lib/game/keep-cursor-free";
import { abandonServerMatch, useServerMatchStore } from "@/lib/store/server-match-store";

/**
 * Keluar dari sesi di tengah jalan, dari layar jeda. Butuh konfirmasi karena
 * pertandingan biasa yang ditinggal tercatat "ditinggal" (tanpa koin). Uji
 * coba tidak dihitung apa pun, jadi cukup kembali ke menu uji coba.
 */
export function ExitSession({ trial }: { trial: boolean }) {
  const router = useRouter();
  const [confirming, setConfirming] = useState(false);
  const status = useServerMatchStore((state) => state.status);

  const leave = (href: string) => {
    abandonServerMatch();
    router.push(href);
  };

  if (!confirming) {
    return (
      <button
        type="button"
        onClick={(event) => {
          keepCursorFree(event);
          setConfirming(true);
        }}
        className="pointer-events-auto mt-3 w-full rounded-lg border border-white/15 px-4 py-2 text-sm font-medium text-slate-300 hover:border-white/30 hover:bg-white/5"
      >
        {trial ? "Akhiri uji coba" : "Keluar dari pertandingan"}
      </button>
    );
  }

  return (
    <div className="pointer-events-auto mt-3 rounded-lg border border-rose-400/30 bg-rose-950/40 p-3 text-left" onClick={keepCursorFree}>
      <p className="text-sm font-semibold text-white">{trial ? "Akhiri uji coba?" : "Tinggalkan pertandingan?"}</p>
      <p className="mt-1 text-xs text-slate-300">
        {trial
          ? "Uji coba tidak dihitung, jadi tidak ada yang hilang."
          : status === "live"
            ? "Pertandingan ini akan tercatat ditinggal dan tidak memberi koin."
            : "Perolehan pertandingan ini tidak disimpan."}
      </p>
      <div className="mt-3 flex flex-wrap gap-2">
        <button
          type="button"
          onClick={(event) => {
            keepCursorFree(event);
            setConfirming(false);
          }}
          className="flex-1 rounded-md border border-white/15 px-3 py-1.5 text-xs font-semibold text-slate-200"
        >
          Batal
        </button>
        {trial ? (
          <button
            type="button"
            onClick={() => leave("/uji")}
            className="flex-1 rounded-md bg-sky-500 px-3 py-1.5 text-xs font-semibold text-slate-950"
          >
            Ke menu uji coba
          </button>
        ) : null}
        <button
          type="button"
          onClick={() => leave("/")}
          className="flex-1 rounded-md bg-rose-500 px-3 py-1.5 text-xs font-semibold text-white"
        >
          Menu utama
        </button>
      </div>
    </div>
  );
}
