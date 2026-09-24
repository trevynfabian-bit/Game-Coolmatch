"use client";

import { useEffect } from "react";
import { useShopStore } from "@/lib/store/shop-store";
import { useFavoriteStore } from "@/lib/store/favorite-store";
import { useKillstreakStore } from "@/lib/store/killstreak-store";
import { useSkinStore } from "@/lib/store/skin-store";
import { useWalletStore } from "@/lib/store/wallet-store";

/**
 * Memuat data pemain yang tersimpan di server begitu sesi dibuka: saldo koin,
 * upgrade senjata, koleksi skin, loadout killstreak, dan favorit galeri. Dipasang sekali di layout akar, jadi halaman mana pun
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
  }, []);
  return null;
}
