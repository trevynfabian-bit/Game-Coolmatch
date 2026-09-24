"use client";

import Link from "next/link";
import { useMemo, useState } from "react";
import { WalletBadge } from "@/components/economy/wallet-badge";
import { GalleryItemCard } from "@/components/gallery/gallery-item-card";
import { InspectViewer } from "@/components/gallery/inspect-viewer";
import { SkinnedWeapon } from "@/components/skins/skinned-weapon";
import { RARITY_META, SKINS, findSkin } from "@/lib/economy/skin-catalog";
import { filterSkins } from "@/lib/economy/skin-filter";
import { ATTACHMENT_SLOT_LABEL, findAttachment } from "@/lib/economy/upgrade-catalog";
import { weaponOwnership } from "@/lib/mock/player-weapons";
import { MOCK_WEAPONS, findWeapon } from "@/lib/mock/weapons";
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
  /** Item yang sedang di-inspect: senjata dan skin yang dipakainya. */
  const [inspecting, setInspecting] = useState<{ weaponId: string; skinId: string | null } | null>(null);
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
            <li key={weapon.id}>
              <GalleryItemCard
                status={unlocked ? "dimiliki" : "terkunci"}
                actions={
                  unlocked ? (
                    <InspectButton label={weapon.name} onClick={() => setInspecting({ weaponId: weapon.id, skinId: skin?.id ?? null })} />
                  ) : undefined
                }
                preview={
                  <span className="block" style={{ color: WEAPON_SHAPES[weapon.type].accent }}>
                    <SkinnedWeapon type={weapon.type} skin={unlocked ? skin : null} className="h-14 w-full" />
                  </span>
                }
                title={weapon.name}
                tag={WEAPON_TYPE_LABEL[weapon.type]}
                caption={unlocked ? undefined : <span className="text-amber-300/80">{weaponOwnership(weapon.id).requirement}</span>}
                details={
                  unlocked ? (
                    <dl className="grid grid-cols-3 gap-2 text-center text-[10px]">
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
                  ) : undefined
                }
              />
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
                <li key={skin.id}>
                  <GalleryItemCard
                    status={on.length > 0 ? "terpasang" : "dimiliki"}
                    accent={skin.rarity === "gold" ? RARITY_META.gold.color : undefined}
                    actions={
                      <InspectButton
                        label={skin.name}
                        onClick={() =>
                          setInspecting({
                            // Skin di-inspect di senjata tempat ia terpasang, atau senapan serbu.
                            weaponId: weapons.find((item) => item.skin?.id === skin.id)?.weapon.id ?? "wpn-rifle-garuda",
                            skinId: skin.id,
                          })
                        }
                      />
                    }
                    preview={<SkinnedWeapon type="rifle" skin={skin} className="h-10 w-full" />}
                    title={skin.name}
                    tag={RARITY_META[skin.rarity].label}
                    tagColor={RARITY_META[skin.rarity].color}
                    caption={on.length > 0 ? on.join(", ") : skin.country?.name ?? "Belum dipasang"}
                  />
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
                  <ul className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
                    {attachments.map(({ attachment, equipped }) => (
                      <li key={attachment.id}>
                        <GalleryItemCard
                          status={equipped ? "terpasang" : "dimiliki"}
                          preview={<AttachmentGlyph slot={attachment.slot} />}
                          title={attachment.name}
                          tag={ATTACHMENT_SLOT_LABEL[attachment.slot]}
                          caption={attachment.description}
                        />
                      </li>
                    ))}
                  </ul>
                </section>
              ))}
          </div>
        )
      ) : null}

      {inspecting ? (
        <InspectViewer
          weapon={findWeapon(inspecting.weaponId)}
          skin={findSkin(inspecting.skinId) ?? null}
          onClose={() => setInspecting(null)}
        />
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

/** Tombol kecil pembuka mode inspect. */
function InspectButton({ label, onClick }: { label: string; onClick: () => void }) {
  return (
    <button
      type="button"
      onClick={onClick}
      aria-label={`Inspect ${label}`}
      title="Inspect"
      className="grid h-7 w-7 place-items-center rounded-md border border-white/10 bg-slate-900/80 text-slate-300 hover:border-white/30 hover:text-white"
    >
      <svg viewBox="0 0 16 16" className="h-3.5 w-3.5" fill="none" stroke="currentColor" strokeWidth="1.6" aria-hidden>
        <circle cx="7" cy="7" r="4.5" />
        <path d="M10.5 10.5L14 14" strokeLinecap="round" />
      </svg>
    </button>
  );
}

/** Gambar sederhana per slot attachment. */
function AttachmentGlyph({ slot }: { slot: string }) {
  return (
    <svg viewBox="0 0 60 24" className="mx-auto h-10 w-full text-slate-400" fill="currentColor" aria-hidden>
      {slot === "laras" ? (
        <rect x="6" y="9" width="48" height="6" rx="3" />
      ) : slot === "magasin" ? (
        <path d="M24 3h12l-2 18H26z" />
      ) : slot === "pegangan" ? (
        <path d="M26 3h8v6l-2 12h-4L26 9z" />
      ) : (
        <>
          <rect x="14" y="6" width="32" height="8" rx="4" />
          <rect x="26" y="14" width="8" height="5" />
        </>
      )}
    </svg>
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
