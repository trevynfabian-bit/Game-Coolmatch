"use client";

import { usePathname } from "next/navigation";
import { useEffect } from "react";
import { isAudioUnlocked } from "@/lib/audio/engine";
import { holdMusicLevel, playMusic, type MusicMood } from "@/lib/audio/music";
import { useMatchStore } from "@/lib/store/match-store";
import { usePlayerStore } from "@/lib/store/player-store";

/** Halaman bertempur memakai musik arena; sisanya musik menu. */
function moodFor(pathname: string | null): MusicMood {
  return pathname?.startsWith("/arena") || pathname?.startsWith("/latihan") || pathname?.startsWith("/uji/arena")
    ? "arena"
    : "menu";
}

/**
 * Memilih musik latar sesuai halaman dan keadaan permainan. Musik baru bisa
 * mulai setelah audio dibuka gestur pertama pemain, jadi direktur menunggu
 * dengan memeriksa sebentar-sebentar lalu memutar suasana yang sesuai.
 *
 * Di arena: musik ditahan lebih pelan saat jeda (kursor lepas) dan jeda antar
 * ronde, lalu berganti ke suasana menu saat pertandingan selesai.
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

  useEffect(() => {
    const inArena = moodFor(pathname) === "arena";
    if (!inArena) {
      holdMusicLevel(1);
      return;
    }
    const sync = () => {
      const round = useMatchStore.getState().round.status;
      const locked = usePlayerStore.getState().isLocked;
      if (round === "ended") {
        holdMusicLevel(0.8);
        playMusic("menu");
        return;
      }
      if (isAudioUnlocked()) playMusic("arena");
      holdMusicLevel(!locked ? 0.35 : round === "intermission" ? 0.6 : 1);
    };
    sync();
    const offMatch = useMatchStore.subscribe((state, previous) => {
      if (state.round.status !== previous.round.status) sync();
    });
    const offPlayer = usePlayerStore.subscribe((state, previous) => {
      if (state.isLocked !== previous.isLocked) sync();
    });
    return () => {
      offMatch();
      offPlayer();
      holdMusicLevel(1);
    };
  }, [pathname]);

  return null;
}
