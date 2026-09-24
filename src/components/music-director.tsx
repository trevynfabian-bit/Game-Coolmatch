"use client";

import { usePathname } from "next/navigation";
import { useEffect } from "react";
import { isAudioUnlocked } from "@/lib/audio/engine";
import { playMusic, type MusicMood } from "@/lib/audio/music";

/** Halaman bertempur memakai musik arena; sisanya musik menu. */
function moodFor(pathname: string | null): MusicMood {
  return pathname?.startsWith("/arena") || pathname?.startsWith("/latihan") ? "arena" : "menu";
}

/**
 * Memilih musik latar sesuai halaman. Musik baru bisa mulai setelah audio
 * dibuka gestur pertama pemain, jadi direktur menunggu dengan memeriksa
 * sebentar-sebentar lalu memutar suasana yang sesuai.
 */
export function MusicDirector() {
  const pathname = usePathname();

  useEffect(() => {
    const mood = moodFor(pathname);
    if (isAudioUnlocked() && playMusic(mood)) return;
    const timer = setInterval(() => {
      if (isAudioUnlocked() && playMusic(mood)) clearInterval(timer);
    }, 300);
    return () => clearInterval(timer);
  }, [pathname]);

  return null;
}
