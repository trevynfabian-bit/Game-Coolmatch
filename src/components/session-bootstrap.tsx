"use client";

import { useEffect } from "react";
import { useShopStore } from "@/lib/store/shop-store";
import { useNotificationStore } from "@/lib/store/notification-store";
import { useFavoriteStore } from "@/lib/store/favorite-store";
import { useKillstreakStore } from "@/lib/store/killstreak-store";
import { useSkinStore } from "@/lib/store/skin-store";
import { useWalletStore } from "@/lib/store/wallet-store";
import { useWeaponStore } from "@/lib/store/weapon-store";
import { useLoadoutStore } from "@/lib/store/loadout-store";
import { retryPendingResults } from "@/lib/store/server-match-store";

/**
 * Memuat data pemain yang tersimpan di server begitu sesi dibuka: saldo koin,
 * upgrade senjata, koleksi skin, loadout killstreak, dan favorit galeri,
 * kemajuan dan loadout senjata, serta kotak masuk hadiah. Dipasang sekali di layout akar, jadi halaman mana pun
 * yang dibuka pertama kali — menu, toko, atau langsung arena — sudah memakai
 * progres terakhir pemain.
 */
export function SessionBootstrap() {
  useEffect(() => {
    void useWalletStore.getState().load();
    void useShopStore.getState().load();
    void useSkinStore.getState().load();
    void useKillstreakStore.getState().loadLoadout();
    void useFavoriteStore.getState().load();
    void useNotificationStore.getState().load();
    // Kemajuan senjata dulu, baru loadout: senjata tersimpan harus sudah
    // dikenali terbuka supaya pilihannya dipakai.
    void useWeaponStore.getState().load().then(() => useLoadoutStore.getState().load());
    // Hasil pertandingan yang dulu gagal terkirim dicoba lagi sekarang, dan
    // setiap kali koneksi kembali.
    void retryPendingResults();
    const onOnline = () => void retryPendingResults();
    window.addEventListener("online", onOnline);
    return () => window.removeEventListener("online", onOnline);
  }, []);
  return null;
}
