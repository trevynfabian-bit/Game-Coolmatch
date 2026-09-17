"use client";

import { findMap } from "@/lib/mock/maps";
import { useMapStore } from "@/lib/store/map-store";

/**
 * Nama peta yang sedang dipilih pemain.
 *
 * Komponen klien tersendiri, sekecil ini, supaya menu utama tetap berupa
 * komponen server: hanya baris inilah yang butuh membaca pilihan tersimpan.
 * Sebelumnya menu menyebut peta bawaan apa pun pilihan pemain — keterangan
 * yang langsung salah begitu ia memilih peta lain.
 */
export function SelectedMapLabel() {
  const selectedMapId = useMapStore((state) => state.selectedMapId);
  return <>{findMap(selectedMapId).name}</>;
}
