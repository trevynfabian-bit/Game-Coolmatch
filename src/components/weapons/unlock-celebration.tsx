"use client";

import { useEffect } from "react";
import { WeaponUnlockedDialog } from "@/components/weapons/weapon-unlocked-dialog";
import { newlyUnlocked, progressAfterMatch } from "@/lib/game/unlock-event";
import {
  MOCK_PLAYER_PROGRESS,
  MOCK_PLAYER_WEAPONS,
} from "@/lib/mock/player-weapons";
import { findWeapon } from "@/lib/mock/weapons";
import { useLoadoutStore } from "@/lib/store/loadout-store";
import { useMatchStore } from "@/lib/store/match-store";
import { useUnlockStore } from "@/lib/store/unlock-store";

/**
 * Senjata terkunci beserta syaratnya, disusun sekali dari katalog.
 *
 * Kepemilikan yang sudah terbuka tidak punya syarat lagi, jadi ia tidak bisa
 * "baru terbuka" dan tidak perlu diperiksa tiap pertandingan.
 */
const KANDIDAT = MOCK_PLAYER_WEAPONS.filter(
  (item) => !item.isUnlocked && item.requirement,
).map((item) => ({ weaponId: item.weaponId, requirement: item.requirement! }));

/**
 * Menyalakan notifikasi "Senjata Baru Terbuka" saat sebuah pertandingan usai.
 *
 * Kemajuan pemain masih dibaca dari data tiruan: layer backend yang akan
 * menyimpannya ke tabel `player_stats` dan membuat kepemilikan senjata
 * mengikuti angka itu. Yang sudah nyata di sini adalah kontraknya — hasil
 * pertandingan yang benar-benar dimainkan (kill sepanjang pertandingan dan
 * menang atau tidak) dijumlahkan ke kemajuan sebelumnya, lalu diperiksa
 * syarat mana yang BARU saja terlewati. Ketika server mengirim kemajuan
 * sungguhan, hanya sumber angkanya yang berganti; perhitungannya tidak.
 *
 * Pertandingan uji coba sengaja dilewati. Uji coba adalah tempat mencoba rasa
 * sebuah senjata, bukan pertandingan yang dihitung — merayakan senjata terbuka
 * dari sana sama saja menjanjikan kemajuan yang tidak pernah tercatat.
 */
export function UnlockCelebration({ isTrial }: { isTrial: boolean }) {
  const status = useMatchStore((state) => state.round.status);
  // Ikut berubah tiap pertandingan baru dimulai, termasuk lewat "Main lagi".
  // Tanpa itu, dua pertandingan berturut-turut yang sama-sama berakhir tidak
  // bisa dibedakan dan yang kedua tidak pernah diperiksa.
  const generation = useMatchStore((state) => state.generation);
  const pending = useUnlockStore((state) => state.pending);

  useEffect(() => {
    if (isTrial || status !== "ended") return;

    const { fighters, round } = useMatchStore.getState();
    const local = fighters.find((fighter) => fighter.isLocal);
    if (!local) return;

    const sesudah = progressAfterMatch(MOCK_PLAYER_PROGRESS, {
      kills: local.kills,
      won: round.matchWinner === local.name,
    });

    const baru = newlyUnlocked(MOCK_PLAYER_PROGRESS, sesudah, KANDIDAT);
    if (baru.length > 0) useUnlockStore.getState().celebrate(baru);
  }, [isTrial, status, generation]);

  const weaponId = pending[0];
  if (!weaponId) return null;

  const weapon = findWeapon(weaponId);
  const dismiss = () => useUnlockStore.getState().dismissFirst();

  /*
    Syaratnya dibaca dari daftar kandidat, bukan dari kepemilikan senjata.
    Begitu senjatanya tercatat terbuka, kepemilikannya sudah tidak membawa
    syarat lagi — dan justru syarat itulah yang ingin disebut layar ini.
  */
  const syarat =
    KANDIDAT.find((item) => item.weaponId === weaponId)?.requirement ?? null;

  return (
    <WeaponUnlockedDialog
      weapon={weapon}
      requirement={syarat}
      open
      onClose={dismiss}
      onEquip={() => {
        useLoadoutStore.getState().selectWeapon(weaponId);
        dismiss();
      }}
    />
  );
}
