"use client";

import Link from "next/link";
import { SettingsShell } from "@/components/settings/settings-shell";
import { difficultyProfile } from "@/lib/game/difficulty";
import { findMap } from "@/lib/mock/maps";
import { useMatchSetupStore } from "@/lib/store/match-setup-store";
import { useSettingsStore } from "@/lib/store/settings-store";

/**
 * Ringkasan pengaturan: satu pandangan atas semua preferensi yang ikut
 * pemain — audio, grafis, kontrol, profil, dan pilihan pertandingan — dengan
 * jalan pintas ke tiap bagiannya.
 */
export function SettingsOverview() {
  const audio = useSettingsStore((state) => state.audio);
  const difficulty = useMatchSetupStore((state) => state.difficulty);
  const botCount = useMatchSetupStore((state) => state.botCount);
  const mapId = useMatchSetupStore((state) => state.mapId);

  const sections = [
    {
      href: "/pengaturan/audio",
      title: "Audio",
      summary: audio.muted ? "Dibisukan" : `Utama ${Math.round(audio.master * 100)}% · musik ${Math.round(audio.music * 100)}%`,
    },
    { href: "/pengaturan/grafis", title: "Grafis", summary: "Kualitas, skala resolusi, pengukur FPS" },
    { href: "/pengaturan/kontrol", title: "Kontrol", summary: "Sensitivitas bidik dan tata tombol" },
    { href: "/pengaturan/profil", title: "Profil", summary: "Nama yang tampil di arena dan klasemen" },
    {
      href: "/lawan",
      title: "Pertandingan",
      summary: `${findMap(mapId).name} · ${botCount} lawan ${difficultyProfile(difficulty).label.toLowerCase()}`,
    },
  ];

  return (
    <SettingsShell
      active="/pengaturan"
      title="Pengaturan"
      description="Preferensimu disimpan dan ikut ke mana pun kamu main."
    >
      <ul className="space-y-2">
        {sections.map((section) => (
          <li key={section.href}>
            <Link
              href={section.href}
              className="flex items-center justify-between gap-4 rounded-xl border border-white/10 bg-slate-900/60 px-4 py-3 transition-colors hover:border-white/25"
            >
              <span>
                <span className="block text-sm font-semibold text-white">{section.title}</span>
                <span className="block text-xs text-slate-400" suppressHydrationWarning>
                  {section.summary}
                </span>
              </span>
              <span className="text-slate-500" aria-hidden>
                →
              </span>
            </Link>
          </li>
        ))}
      </ul>
    </SettingsShell>
  );
}
