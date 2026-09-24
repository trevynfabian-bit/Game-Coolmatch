"use client";

import { useCallback, useEffect, useState } from "react";

export interface Notice {
  tone: "ok" | "error";
  text: string;
}

/** Pesan singkat yang hilang sendiri setelah beberapa detik. */
export function useNotice(durationMs = 4000) {
  const [notice, setNotice] = useState<Notice | null>(null);
  useEffect(() => {
    if (!notice) return;
    const timer = setTimeout(() => setNotice(null), durationMs);
    return () => clearTimeout(timer);
  }, [notice, durationMs]);
  const show = useCallback((next: Notice) => setNotice(next), []);
  return { notice, show };
}

/** Toast di bawah layar; selalu terpasang supaya pembaca layar mengumumkannya. */
export function NoticeToast({ notice }: { notice: Notice | null }) {
  return (
    <p
      role="status"
      aria-live="polite"
      className={`fixed inset-x-0 bottom-6 z-40 mx-auto w-fit max-w-[90vw] rounded-lg border px-4 py-2 text-sm shadow-lg transition-opacity ${
        notice ? "opacity-100" : "pointer-events-none opacity-0"
      } ${
        notice?.tone === "error"
          ? "border-rose-400/40 bg-rose-950/90 text-rose-100"
          : "border-emerald-400/40 bg-emerald-950/90 text-emerald-100"
      }`}
    >
      {notice?.text ?? ""}
    </p>
  );
}
