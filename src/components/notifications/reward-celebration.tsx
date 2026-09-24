"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { useEffect, useMemo } from "react";
import { KillstreakIcon } from "@/components/arena/hud/killstreak-tracker";
import { SkinnedWeapon } from "@/components/skins/skinned-weapon";
import { RARITY_META, findSkin } from "@/lib/economy/skin-catalog";
import { findWeapon } from "@/lib/mock/weapons";
import { WEAPON_SHAPES } from "@/lib/weapons/weapon-shape";
import { useNotificationStore } from "@/lib/store/notification-store";
import { claimNewWeapon } from "@/lib/store/loadout-store";
import { useWeaponStore } from "@/lib/store/weapon-store";
import type { RewardNotification } from "@/types/economy";

/** Jenis hadiah yang pantas dirayakan dengan dialog, bukan sekadar daftar. */
const CELEBRATED = new Set<RewardNotification["kind"]>(["skin", "upgrade", "hadiah", "senjata"]);

/** Halaman tempat dialog tidak boleh muncul karena pemain sedang bermain. */
const QUIET_PATHS = ["/arena", "/latihan", "/uji/arena"];

/** Serpihan konfeti deterministik supaya tidak berkedip saat render ulang. */
const CONFETTI = Array.from({ length: 22 }, (_, index) => ({
  left: (index * 37) % 100,
  delay: (index % 7) * 0.12,
  color: ["#fbbf24", "#34d399", "#38bdf8", "#f472b6", "#a78bfa"][index % 5],
  rotate: (index * 53) % 360,
}));

function Hero({ item }: { item: RewardNotification }) {
  if (item.kind === "skin") {
    const skin = findSkin(item.itemId);
    return <SkinnedWeapon type="rifle" skin={skin} className="h-28 w-full" />;
  }
  if (item.kind === "hadiah") {
    return (
      <span className="mx-auto block w-fit text-lime-300">
        <KillstreakIcon id={item.itemId ?? "uav"} className="h-24 w-24" />
      </span>
    );
  }
  const weapon = findWeapon(item.itemId ?? "");
  return (
    <span className="block" style={{ color: item.kind === "senjata" ? WEAPON_SHAPES[weapon.type].accent : "#7dd3fc" }}>
      <SkinnedWeapon type={weapon.type} skin={null} className="h-28 w-full" />
    </span>
  );
}

/**
 * Dialog perayaan untuk senjata, skin, upgrade, dan hadiah killstreak yang baru.
 *
 * Mengikuti pola perayaan senjata baru: hadiah pertama yang belum dilihat
 * tampil besar dengan konfeti, dan penanda "belum dilihat" baru hilang
 * setelah pemain menekan tombol dialog — penanda "Baru" di galeri dan kotak
 * notifikasi ikut hilang karena semuanya membaca store yang sama. Bila ada
 * beberapa hadiah, tombol utama beralih ke hadiah berikutnya. Tidak pernah muncul di arena atau
 * tempat latihan supaya tidak mengganggu permainan.
 */
export function RewardCelebration() {
  const pathname = usePathname();
  const items = useNotificationStore((state) => state.items);
  const markSeen = useNotificationStore((state) => state.markSeen);
  // Klaim senjata sudah menandai notifikasinya di server; cukup ubah tampilan.
  const markSeenLocally = (id: number) =>
    useNotificationStore.setState((state) => ({
      items: state.items.map((item) => (item.id === id && item.seenAt === null ? { ...item, seenAt: Date.now() } : item)),
    }));

  const queue = useMemo(
    () =>
      [...items]
        .filter((item) => item.seenAt === null && CELEBRATED.has(item.kind))
        .sort((a, b) => a.createdAt - b.createdAt),
    [items],
  );
  const current = queue[0] ?? null;
  const remaining = queue.length - 1;
  /** Menutup semua perayaan sekaligus: semua penanda "belum dilihat"-nya hilang. */
  const dismissAll = () => queue.forEach((item) => markSeen(item.id));
  const quiet = QUIET_PATHS.some((path) => pathname?.startsWith(path));

  useEffect(() => {
    if (!current || quiet) return;
    const onKey = (event: KeyboardEvent) => {
      if (event.key === "Escape") markSeen(current.id);
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [current, quiet, markSeen]);

  if (!current || quiet) return null;

  const skin = current.kind === "skin" ? findSkin(current.itemId) : undefined;
  const accent = skin
    ? RARITY_META[skin.rarity].color
    : current.kind === "hadiah"
      ? "#a3e635"
      : current.kind === "senjata"
        ? "#34d399"
        : "#38bdf8";
  const eyebrow =
    current.kind === "skin"
      ? `Skin ${skin ? RARITY_META[skin.rarity].label.toLowerCase() : ""} baru`
      : current.kind === "hadiah"
        ? "Hadiah killstreak terbuka"
        : current.kind === "senjata"
          ? "Senjata baru terbuka"
          : "Upgrade baru";
  const next =
    current.kind === "skin"
      ? { href: "/toko/koleksi", label: "Lihat koleksi" }
      : current.kind === "hadiah"
        ? { href: "/hadiah", label: "Atur loadout" }
        : current.kind === "senjata"
          ? { href: "/senjata", label: "Pilih senjata ini" }
          : { href: "/toko", label: "Ke toko upgrade" };

  return (
    <div className="fixed inset-0 z-50 grid place-items-center bg-slate-950/85 px-4 backdrop-blur-sm" role="dialog" aria-modal="true" aria-labelledby="judul-perayaan">
      <div className="pointer-events-none absolute inset-0 overflow-hidden" aria-hidden>
        {CONFETTI.map((piece, index) => (
          <span
            key={index}
            className="celebration-confetti absolute top-0 h-2.5 w-1.5 rounded-sm"
            style={{ left: `${piece.left}%`, backgroundColor: piece.color, animationDelay: `${piece.delay}s`, transform: `rotate(${piece.rotate}deg)` }}
          />
        ))}
      </div>

      <div
        className="celebration-pop relative w-full max-w-sm rounded-2xl border bg-slate-900 p-6 text-center shadow-2xl"
        style={{ borderColor: `${accent}88`, boxShadow: `0 0 60px ${accent}33` }}
      >
        <p className="text-[10px] tracking-[0.3em] uppercase" style={{ color: accent }}>
          {eyebrow}
        </p>
        {remaining > 0 ? (
          <p className="mt-1 text-[11px] text-slate-500">
            Hadiah 1 dari {queue.length}
          </p>
        ) : null}
        <div className="my-6 rounded-xl px-4 py-6" style={{ background: `radial-gradient(circle, ${accent}22, transparent 70%)` }}>
          <Hero item={current} />
        </div>
        <h2 id="judul-perayaan" className="text-2xl font-bold text-white">
          {current.title.replace(/^(Skin baru|Senjata baru|Senjata terbuka): /, "")}
        </h2>
        <p className="mt-2 text-sm text-slate-400">{current.body}</p>

        <div className="mt-6 flex flex-col gap-2">
          <button
            type="button"
            autoFocus
            onClick={() => markSeen(current.id)}
            className="rounded-lg px-5 py-3 text-sm font-semibold text-slate-950"
            style={{ backgroundColor: accent }}
          >
            {remaining > 0 ? `Keren! Lihat berikutnya (${remaining})` : "Keren!"}
          </button>
          <Link
            href={next.href}
            onClick={() => {
              // Senjata baru diklaim: ditandai dilihat sekaligus dipasang di loadout.
              if (current.kind === "senjata" && current.itemId) {
                const weaponId = current.itemId;
                void claimNewWeapon(weaponId).then((ok) => {
                  if (ok) void useWeaponStore.getState().load();
                });
                markSeenLocally(current.id);
              } else {
                markSeen(current.id);
              }
            }}
            className="rounded-lg px-5 py-2 text-sm font-medium text-slate-300 hover:text-white"
          >
            {next.label}
          </Link>
          {remaining > 0 ? (
            <button type="button" onClick={dismissAll} className="text-xs text-slate-500 hover:text-slate-300">
              Tandai semua sudah dilihat
            </button>
          ) : null}
        </div>
      </div>
    </div>
  );
}
