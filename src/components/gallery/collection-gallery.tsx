"use client";

import Link from "next/link";
import { useMemo, useState } from "react";
import { WalletBadge } from "@/components/economy/wallet-badge";
import { SkinnedWeapon } from "@/components/skins/skinned-weapon";
import { RARITY_META, SKINS, findSkin } from "@/lib/economy/skin-catalog";
import { filterSkins } from "@/lib/economy/skin-filter";
import { ATTACHMENT_SLOT_LABEL, findAttachment } from "@/lib/economy/upgrade-catalog";
import { weaponOwnership } from "@/lib/mock/player-weapons";
import { MOCK_WEAPONS } from "@/lib/mock/weapons";
import { upgradeStateOf, useShopStore } from "@/lib/store/shop-store";
import { useSkinStore } from "@/lib/store/skin-store";
import { WEAPON_SHAPES, WEAPON_TYPE_LABEL } from "@/lib/weapons/weapon-shape";

type Tab = "senjata" | "skin" | "attachment";

const TABS: { id: Tab; label: string }[] = [
  { id: "senjata", label: "Senjata" },
  { id: "skin", label: "Skin" },
  { id: "attachment", label: "Attachment" },
];

/**
 * Galeri koleksi: semua senjata, skin, dan attachment milik pemain dalam
 * satu halaman. Senjata tampil dengan skin yang terpasang dan jumlah
 * upgrade-nya; skin dan attachment dikelompokkan supaya mudah dipindai.
 */
export function CollectionGallery() {
  const [tab, setTab] = useState<Tab>("senjata");
  const collection = useSkinStore((state) => state.collection);
  const upgrades = useShopStore((state) => state.upgrades);

  const weapons = useMemo(
    () =>
      MOCK_WEAPONS.map((weapon) => {
        const state = upgradeStateOf(upgrades, weapon.id);
        return {
          weapon,
          unlocked: weaponOwnership(weapon.id).isUnlocked,
          skin: findSkin(collection.equipped[weapon.id]) ?? null,
          upgradeLevels: Object.values(state.levels).reduce((a, b) => a + b, 0),
          attachments: state.ownedAttachmentIds.map((id) => ({
            attachment: findAttachment(id)!,
            equipped: Object.values(state.equipped).includes(id),
          })),
        };
      }),
    [collection.equipped, upgrades],
  );
  const ownedSkins = useMemo(
    () => filterSkins(SKINS, collection, { rarity: "semua", ownership: "dimiliki", sort: "tingkat_turun" }),
    [collection],
  );
  const attachmentCount = weapons.reduce((sum, item) => sum + item.attachments.length, 0);
  const unlockedCount = weapons.filter((item) => item.unlocked).length;

  const counts: Record<Tab, string> = {
    senjata: `${unlockedCount}/${weapons.length}`,
    skin: `${ownedSkins.length}/${SKINS.length}`,
    attachment: String(attachmentCount),
  };

  return (
    <div className="mx-auto w-full max-w-5xl px-5 py-10 sm:px-8">
      <header className="mb-6 flex flex-wrap items-end justify-between gap-4">
        <div>
          <p className="text-[10px] tracking-[0.3em] text-emerald-400 uppercase">Koleksi</p>
          <h1 className="mt-2 text-3xl font-bold tracking-tight text-white">Galeri Koleksi</h1>
          <p className="mt-2 max-w-xl text-sm leading-relaxed text-slate-400">
            Semua senjata, skin, dan attachment milikmu di satu tempat.
          </p>
        </div>
        <WalletBadge />
      </header>

      <div role="tablist" aria-label="Jenis koleksi" className="mb-6 flex w-fit gap-1 rounded-lg border border-white/10 bg-slate-900/60 p-1 text-sm">
        {TABS.map((item) => (
          <button
            key={item.id}
            type="button"
            role="tab"
            aria-selected={tab === item.id}
            onClick={() => setTab(item.id)}
            className={`rounded-md px-4 py-1.5 font-medium transition-colors ${
              tab === item.id ? "bg-white/10 text-white" : "text-slate-400 hover:text-slate-200"
            }`}
          >
            {item.label}
            <span className="ml-1.5 font-mono text-[11px] text-slate-500 tabular-nums">{counts[item.id]}</span>
          </button>
        ))}
      </div>

      {tab === "senjata" ? (
        <ul className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3" role="tabpanel">
          {weapons.map(({ weapon, unlocked, skin, upgradeLevels, attachments }) => (
            <li
              key={weapon.id}
              className={`rounded-xl border border-white/10 bg-slate-900/60 p-4 ${unlocked ? "" : "opacity-50"}`}
            >
              <span className="block rounded-lg bg-slate-950/60 px-3 py-4" style={{ color: WEAPON_SHAPES[weapon.type].accent }}>
                <SkinnedWeapon type={weapon.type} skin={unlocked ? skin : null} className="h-14 w-full" />
              </span>
              <p className="mt-3 flex items-center justify-between gap-2">
                <span className="truncate text-sm font-semibold text-white">{weapon.name}</span>
                <span className="text-[10px] text-slate-500">{WEAPON_TYPE_LABEL[weapon.type]}</span>
              </p>
              {unlocked ? (
                <dl className="mt-2 grid grid-cols-3 gap-2 text-center text-[10px]">
                  <div className="rounded-md bg-white/5 py-1">
                    <dt className="text-slate-500">Skin</dt>
                    <dd className="truncate px-1 text-slate-200" style={{ color: skin ? RARITY_META[skin.rarity].color : undefined }}>
                      {skin?.name ?? "Pabrik"}
                    </dd>
                  </div>
                  <div className="rounded-md bg-white/5 py-1">
                    <dt className="text-slate-500">Upgrade</dt>
                    <dd className="font-mono text-slate-200">{upgradeLevels}/9</dd>
                  </div>
                  <div className="rounded-md bg-white/5 py-1">
                    <dt className="text-slate-500">Attachment</dt>
                    <dd className="font-mono text-slate-200">{attachments.length}</dd>
                  </div>
                </dl>
              ) : (
                <p className="mt-2 text-[11px] text-amber-300/80">{weaponOwnership(weapon.id).requirement}</p>
              )}
            </li>
          ))}
        </ul>
      ) : null}

      {tab === "skin" ? (
        ownedSkins.length === 0 ? (
          <EmptyState text="Belum ada skin di koleksimu." href="/toko/skin" cta="Lihat toko skin" />
        ) : (
          <ul className="grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-4" role="tabpanel">
            {ownedSkins.map((skin) => {
              const on = weapons.filter((item) => item.skin?.id === skin.id).map((item) => item.weapon.name);
              return (
                <li key={skin.id} className="rounded-xl border border-white/10 bg-slate-900/60 p-3">
                  <span className="block rounded-lg bg-slate-950/60 px-2 py-3">
                    <SkinnedWeapon type="rifle" skin={skin} className="h-10 w-full" />
                  </span>
                  <p className="mt-2 flex items-center justify-between gap-2">
                    <span className="truncate text-sm font-semibold text-slate-100">{skin.name}</span>
                    <span className="text-[9px] font-semibold tracking-wider uppercase" style={{ color: RARITY_META[skin.rarity].color }}>
                      {RARITY_META[skin.rarity].label}
                    </span>
                  </p>
                  <p className="truncate text-[11px] text-slate-500">{on.length > 0 ? on.join(", ") : "Belum dipasang"}</p>
                </li>
              );
            })}
          </ul>
        )
      ) : null}

      {tab === "attachment" ? (
        attachmentCount === 0 ? (
          <EmptyState text="Belum ada attachment yang dibeli." href="/toko" cta="Lihat toko upgrade" />
        ) : (
          <div className="space-y-4" role="tabpanel">
            {weapons
              .filter((item) => item.attachments.length > 0)
              .map(({ weapon, attachments }) => (
                <section key={weapon.id}>
                  <h2 className="mb-2 text-[11px] tracking-[0.2em] text-slate-400 uppercase">{weapon.name}</h2>
                  <ul className="grid gap-2 sm:grid-cols-2">
                    {attachments.map(({ attachment, equipped }) => (
                      <li key={attachment.id} className="flex items-center justify-between rounded-lg border border-white/10 bg-slate-900/50 px-3 py-2">
                        <span>
                          <span className="block text-sm text-slate-100">{attachment.name}</span>
                          <span className="block text-[11px] text-slate-500">{ATTACHMENT_SLOT_LABEL[attachment.slot]}</span>
                        </span>
                        <span className={`text-[10px] font-semibold tracking-wider uppercase ${equipped ? "text-emerald-300" : "text-slate-500"}`}>
                          {equipped ? "Terpasang" : "Disimpan"}
                        </span>
                      </li>
                    ))}
                  </ul>
                </section>
              ))}
          </div>
        )
      ) : null}

      <div className="mt-10 flex flex-wrap gap-2 border-t border-white/10 pt-6">
        <Link href="/toko" className="rounded-lg border border-white/15 px-5 py-2.5 text-sm font-semibold text-slate-200 hover:border-white/30">
          Ke toko
        </Link>
        <Link href="/" className="rounded-lg px-5 py-2.5 text-sm font-medium text-slate-400 hover:text-slate-200">
          Kembali ke menu
        </Link>
      </div>
    </div>
  );
}

function EmptyState({ text, href, cta }: { text: string; href: string; cta: string }) {
  return (
    <div className="rounded-xl border border-dashed border-white/15 px-6 py-10 text-center" role="tabpanel">
      <p className="text-sm text-slate-300">{text}</p>
      <Link href={href} className="mt-3 inline-block rounded-lg bg-amber-400 px-4 py-2 text-sm font-semibold text-slate-950 hover:bg-amber-300">
        {cta}
      </Link>
    </div>
  );
}
