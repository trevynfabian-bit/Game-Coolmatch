"use client";

import { useSyncExternalStore } from "react";

/**
 * Penanda "render ini sudah di browser".
 *
 * Nilainya tidak pernah berubah setelah terpasang, jadi tidak ada yang perlu
 * dilanggani; yang penting adalah potret server-nya berbeda, sehingga React
 * memakai `false` saat hidrasi lalu langsung merender ulang dengan `true`.
 */
const subscribeNever = () => () => {};
const onClient = () => true;
const onServer = () => false;

/**
 * Benar hanya setelah komponen terhidrasi di browser.
 *
 * Dipakai setiap kali sebuah layar menampilkan pilihan yang tersimpan di
 * localStorage. Server selalu merender keadaan awal store, sedangkan browser
 * sudah memegang pilihan pemain — menyebut nilainya sebelum hidrasi membuat
 * kedua hasil render berselisih dan React menolak halamannya.
 *
 * Pola ini sudah dipakai layar tunggu arena; diangkat ke sini karena menu
 * utama membutuhkannya juga, dan dua salinan aturan hidrasi adalah dua tempat
 * yang bisa berselisih.
 */
export function useHydrated(): boolean {
  return useSyncExternalStore(subscribeNever, onClient, onServer);
}
