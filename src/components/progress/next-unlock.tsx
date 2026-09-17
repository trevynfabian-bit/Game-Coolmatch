import { UnlockBar } from "@/components/weapons/unlock-bar";
import { UnlockRequirementNote } from "@/components/weapons/unlock-requirement";
import { WeaponSilhouette } from "@/components/weapons/weapon-silhouette";
import { unlockFacts } from "@/lib/game/unlock";
import type { CollectionEntry } from "@/lib/game/collection";
import { WEAPON_SHAPES } from "@/lib/weapons/weapon-shape";

/**
 * Senjata terkunci yang paling dekat terbuka, beserta BATANG kemajuannya.
 *
 * Sebelumnya sasaran terdekat hanya disebut sebagai kalimat — "tinggal 19 kill
 * lagi (41 / 60)" — sementara batangnya baru muncul jauh di bawah, pada baris
 * senjatanya sendiri. Padahal justru batang itu yang menjawab pertanyaan
 * sebenarnya dalam sekali lihat: ini tinggal sedikit, atau masih jauh? Angka
 * "41 / 60" menuntut pembagian di kepala; garis yang hampir penuh tidak.
 *
 * Panel ini tidak menggambar batangnya sendiri, melainkan memakai keterangan
 * syarat yang sama dengan daftar senjata. Satu bentuk untuk satu fakta, jadi
 * memperbaiki salah satunya tidak meninggalkan yang lain.
 */
export function NextUnlockPanel({
  entry,
  className = "",
}: {
  entry: CollectionEntry;
  className?: string;
}) {
  const { weapon, ownership } = entry;
  if (!ownership.requirement) return null;

  return (
    <div
      className={`flex items-center gap-3 rounded-xl border border-amber-400/25 bg-amber-500/5 px-4 py-3 ${className}`}
    >
      <span
        className="w-16 shrink-0 opacity-70 sm:w-20"
        style={{ color: WEAPON_SHAPES[weapon.type].accent }}
      >
        <WeaponSilhouette type={weapon.type} className="h-7 w-full" />
      </span>

      <span className="min-w-0 flex-1">
        <span className="block text-[9px] tracking-[0.15em] text-amber-400/70 uppercase">
          Paling dekat terbuka
        </span>
        <span className="mt-0.5 block truncate text-sm font-semibold text-amber-100">
          {weapon.name}
        </span>
        <UnlockRequirementNote
          requirement={ownership.requirement}
          className="mt-1.5"
        />
      </span>
    </div>
  );
}

/**
 * Sasaran terdekat dalam satu baris rapat, untuk tempat yang hanya punya
 * beberapa baris teks. Batangnya tetap ada — ia yang membuat baris ini lebih
 * berguna daripada sekadar menyebut nama senjatanya.
 */
export function NextUnlockLine({ entry }: { entry: CollectionEntry }) {
  const { weapon, ownership } = entry;
  if (!ownership.requirement) return null;
  const facts = unlockFacts(ownership.requirement);

  return (
    <span className="flex flex-wrap items-center justify-center gap-x-2 gap-y-1 text-[11px] text-amber-200/80">
      <span className="font-medium text-amber-200">{weapon.name}</span>
      <UnlockBar
        facts={facts}
        label={`${weapon.name}: ${facts.label}`}
        className="w-20"
      />
      <span>{facts.remainingText}</span>
    </span>
  );
}
