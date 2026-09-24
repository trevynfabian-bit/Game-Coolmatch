"use client";

import { FlagSwatch } from "@/components/skins/flag-swatch";
import { RARITY_META, COUNTRY_SKINS } from "@/lib/economy/skin-catalog";
import type { SkinCollection } from "@/types/economy";

/**
 * Etalase camo bertema negara: satu baris bendera yang bisa digulir. Memilih
 * bendera memfokuskan skinnya di panel pratinjau, jadi pemain bisa langsung
 * melihatnya di senjata.
 */
export function CountryCamoShowcase({
  collection,
  focusedId,
  onFocus,
}: {
  collection: SkinCollection;
  focusedId: string | null;
  onFocus: (skinId: string) => void;
}) {
  return (
    <section aria-labelledby="judul-camo-negara" className="mb-6">
      <div className="mb-2 flex items-baseline justify-between">
        <h2 id="judul-camo-negara" className="text-[11px] tracking-[0.2em] text-slate-400 uppercase">
          Camo bertema negara
        </h2>
        <span className="text-[11px] text-slate-500">{COUNTRY_SKINS.length} negara</span>
      </div>
      <ul className="flex snap-x gap-2 overflow-x-auto pb-2">
        {COUNTRY_SKINS.map((skin) => {
          const active = skin.id === focusedId;
          const owned = collection.ownedSkinIds.includes(skin.id);
          return (
            <li key={skin.id} className="shrink-0 snap-start">
              <button
                type="button"
                onClick={() => onFocus(skin.id)}
                aria-pressed={active}
                aria-label={`${skin.name}, ${skin.country!.name}`}
                className="w-24 rounded-lg border p-2 text-left transition-colors focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-emerald-400"
                style={{
                  borderColor: active ? RARITY_META[skin.rarity].color : "rgba(255,255,255,0.1)",
                  backgroundColor: active ? "rgba(255,255,255,0.05)" : "rgba(15,23,42,0.6)",
                }}
              >
                <FlagSwatch skin={skin} className="h-12 w-full" />
                <span className="mt-1.5 block truncate text-[11px] font-semibold text-slate-100">
                  {skin.country!.name}
                </span>
                <span className="block truncate text-[10px] text-slate-500">
                  {owned ? "Dimiliki" : skin.name}
                </span>
              </button>
            </li>
          );
        })}
      </ul>
    </section>
  );
}
