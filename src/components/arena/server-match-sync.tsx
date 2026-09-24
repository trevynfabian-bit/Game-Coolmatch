"use client";

import { useEffect } from "react";
import { useKillstreakStore } from "@/lib/store/killstreak-store";
import { useMatchStore } from "@/lib/store/match-store";
import {
  abandonServerMatch,
  finishServerMatch,
  reportKillstreakEvent,
} from "@/lib/store/server-match-store";

/**
 * Penghubung arena ↔ server dan penghitung killstreak.
 *
 * - Kill dan kematian pemain lokal diubah menjadi kemajuan killstreak;
 *   hadiah yang baru terbuka dilaporkan ke server ("terbuka").
 * - Hadiah yang dipanggil ("dipakai") dan kill yang dihasilkannya ("kill")
 *   ikut dilaporkan supaya server bisa memeriksa urutannya.
 * - Saat pertandingan berakhir, hasilnya dikirim ke server untuk ditutup dan
 *   dibayar koinnya; meninggalkan arena di tengah jalan menandainya ditinggal.
 */
export function ServerMatchSync() {
  useEffect(() => {
    // Hanya di mode pengembangan: store dibuka di window supaya pengujian
    // otomatis bisa mempercepat pertandingan tanpa bermain sungguhan.
    if (process.env.NODE_ENV === "development") {
      (window as unknown as { __arena?: unknown }).__arena = { useMatchStore, useKillstreakStore };
    }

    const unsubscribeMatch = useMatchStore.subscribe((state, previous) => {
      // Pertandingan baru disiapkan: tidak ada kemajuan yang perlu dibandingkan.
      if (state.generation !== previous.generation) return;

      const local = state.fighters.find((fighter) => fighter.isLocal);
      const before = previous.fighters.find((fighter) => fighter.isLocal);
      if (local && before) {
        const streaks = useKillstreakStore.getState();
        for (let i = before.kills; i < local.kills; i++) {
          for (const id of streaks.registerKill()) {
            reportKillstreakEvent(id, "terbuka", useKillstreakStore.getState().streak);
          }
        }
        if (local.deaths > before.deaths) useKillstreakStore.getState().registerDeath();
      }

      if (state.round.status === "ended" && previous.round.status !== "ended") {
        void finishServerMatch();
      }
    });

    const unsubscribeStreak = useKillstreakStore.subscribe((state, previous) => {
      for (const [id, count] of Object.entries(state.used)) {
        const before = previous.used[id as keyof typeof previous.used] ?? 0;
        for (let i = before; i < (count ?? 0); i++) {
          reportKillstreakEvent(id as never, "dipakai", state.streak);
        }
      }
      for (const [id, count] of Object.entries(state.killsBy)) {
        const before = previous.killsBy[id as keyof typeof previous.killsBy] ?? 0;
        for (let i = before; i < (count ?? 0); i++) {
          reportKillstreakEvent(id as never, "kill", state.streak);
        }
      }
    });

    window.addEventListener("pagehide", abandonServerMatch);
    return () => {
      unsubscribeMatch();
      unsubscribeStreak();
      window.removeEventListener("pagehide", abandonServerMatch);
      // Arena ditutup (pindah halaman) sebelum pertandingan selesai.
      abandonServerMatch();
    };
  }, []);

  return null;
}
