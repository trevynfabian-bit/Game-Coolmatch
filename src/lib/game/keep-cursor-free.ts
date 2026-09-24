/**
 * Mencegah klik pada tombol overlay ikut mengunci kursor.
 *
 * PointerLockControls menyimak klik di `document`. Di App Router, akar React
 * juga menempel di `document`, jadi `stopPropagation` saja tidak menghentikan
 * pendengar lain di node yang sama — perlu `stopImmediatePropagation` pada
 * event aslinya. Pendengar React terdaftar lebih dulu (saat hidrasi), sehingga
 * pendengar PointerLockControls tidak pernah terpanggil.
 */
export function keepCursorFree(event: { stopPropagation: () => void; nativeEvent?: Event }): void {
  event.stopPropagation();
  event.nativeEvent?.stopImmediatePropagation();
}
