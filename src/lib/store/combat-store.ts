import { create } from "zustand";

import { mergePop, type DamagePopShape } from "@/lib/game/damage-pop";
import { markerWins, type HitMarkerKind } from "@/lib/game/hit-marker";

export interface HitMarker {
  /** Penanda waktu agar HUD bisa memicu ulang animasi tiap kena. */
  id: number;
  /** Kabar apa yang dibawa penanda ini: rompi, badan, kepala, atau eliminasi. */
  kind: HitMarkerKind;
  /** Jam saat ia dipasang; dipakai aturan prioritas antar tembakan beruntun. */
  at: number;
}

/**
 * Angka kerusakan yang melayang sesaat di dekat crosshair. Bentuknya hidup di
 * modul damage-pop bersama aturan penggabungannya, supaya aturan itu bisa
 * diperiksa tanpa store maupun browser.
 */
export type DamagePop = DamagePopShape;

/** Batas angka kerusakan yang ditahan sekaligus di layar. */
const DAMAGE_POP_LIMIT = 6;

/** Satu tembakan yang mengenai pemain lokal, untuk umpan balik arah. */
export interface IncomingHit {
  id: number;
  /**
   * Sudut penyerang relatif arah pandang pemain SAAT KENA, dalam radian. Nol
   * berarti tepat di depan. Penunjuk arah memperbaruinya sendiri tiap frame
   * dari posisi hidup penembak selama penembaknya masih ada; sudut ini
   * tinggal cadangan bila penembaknya sudah tidak ada.
   */
  angleRad: number;
  /** 0..1, seberapa berat tembakannya dibanding nyawa maksimum. */
  severity: number;
  attackerName: string;
  /** Id petarung penembak, untuk mengikuti posisi hidupnya. */
  attackerId: string;
  /** Berapa kali penembak yang sama mengenai pemain selagi penunjuknya masih tampil. */
  count: number;
}

/** Batas penunjuk arah kerusakan yang ditahan sekaligus. */
const INCOMING_LIMIT = 4;

/**
 * Keadaan tembak-menembak pemain lokal. Hanya menyimpan nilai yang berubah
 * sesekali — peluru, status isi ulang, dan penanda kena. Nilai yang berubah
 * tiap frame seperti sebaran crosshair sengaja TIDAK ditaruh di sini, melainkan
 * ditulis langsung sebagai custom property CSS, supaya HUD tidak render ulang
 * 60 kali per detik.
 */
interface CombatState {
  ammoInMagazine: number;
  ammoReserve: number;
  magazineSize: number;
  isReloading: boolean;
  /** Lama isi ulang yang sedang berjalan, dipakai HUD untuk durasi animasi. */
  reloadSeconds: number;
  hitMarker: HitMarker | null;
  damagePops: DamagePop[];
  incomingHits: IncomingHit[];

  /** Senjata yang sedang dipegang. */
  activeWeaponId: string;
  /**
   * Amunisi tiap senjata yang pernah dipegang. Disimpan supaya menukar senjata
   * tidak berfungsi sebagai isi ulang instan: magasin yang tadi tinggal separuh
   * tetap separuh saat senjata itu dipegang lagi.
   */
  ammoByWeapon: Record<string, { magazine: number; reserve: number }>;
  /** Benar selama tangan masih berpindah senjata; pelatuk dikunci. */
  isSwapping: boolean;

  /** Menyiapkan amunisi awal dari potret pertandingan. */
  arm: (config: {
    weaponId: string;
    ammoInMagazine: number;
    ammoReserve: number;
    magazineSize: number;
  }) => void;

  setSwapping: (swapping: boolean) => void;

  /**
   * Berpindah ke senjata lain: amunisi senjata lama disimpan, amunisi senjata
   * baru dimuat dari catatan atau diisi penuh bila belum pernah dipegang.
   * Isi ulang yang sedang berjalan dibatalkan.
   */
  swapTo: (config: {
    weaponId: string;
    magazineSize: number;
    defaultReserve: number;
  }) => void;
  /** Mengurangi satu peluru. Mengembalikan false bila magasin kosong. */
  consumeRound: () => boolean;
  beginReload: (seconds: number) => void;
  finishReload: () => void;
  registerHit: (kind: HitMarkerKind) => void;
  clearHitMarker: (id: number) => void;
  pushDamagePop: (pop: {
    amount: number;
    isHeadshot: boolean;
    isLethal: boolean;
    /** Bagian kerusakan yang ditahan rompi. */
    armorPart?: number;
  }) => void;
  removeDamagePop: (id: number) => void;
  /** Mencatat tembakan yang mengenai pemain, untuk vignette dan penunjuk arah. */
  pushIncomingHit: (hit: {
    angleRad: number;
    severity: number;
    attackerId: string;
    attackerName: string;
  }) => void;
  removeIncomingHit: (id: number) => void;
}

export const useCombatStore = create<CombatState>((set, get) => ({
  ammoInMagazine: 0,
  ammoReserve: 0,
  magazineSize: 0,
  isReloading: false,
  reloadSeconds: 0,
  hitMarker: null,
  damagePops: [],
  incomingHits: [],
  activeWeaponId: "",
  ammoByWeapon: {},
  isSwapping: false,

  arm: ({ weaponId, ammoInMagazine, ammoReserve, magazineSize }) =>
    set({
      activeWeaponId: weaponId,
      ammoByWeapon: {
        [weaponId]: { magazine: ammoInMagazine, reserve: ammoReserve },
      },
      ammoInMagazine,
      ammoReserve,
      magazineSize,
      isReloading: false,
      reloadSeconds: 0,
      isSwapping: false,
      hitMarker: null,
      damagePops: [],
      incomingHits: [],
    }),

  setSwapping: (swapping) =>
    set((state) =>
      state.isSwapping === swapping ? state : { isSwapping: swapping },
    ),

  swapTo: ({ weaponId, magazineSize, defaultReserve }) =>
    set((state) => {
      if (weaponId === state.activeWeaponId) {
        return { isSwapping: false };
      }

      const saved = {
        ...state.ammoByWeapon,
        [state.activeWeaponId]: {
          magazine: state.ammoInMagazine,
          reserve: state.ammoReserve,
        },
      };
      const next = saved[weaponId] ?? {
        magazine: magazineSize,
        reserve: defaultReserve,
      };

      return {
        activeWeaponId: weaponId,
        ammoByWeapon: saved,
        ammoInMagazine: next.magazine,
        ammoReserve: next.reserve,
        magazineSize,
        isReloading: false,
        reloadSeconds: 0,
        isSwapping: false,
      };
    }),

  consumeRound: () => {
    const { ammoInMagazine, isReloading } = get();
    if (isReloading || ammoInMagazine <= 0) return false;
    set({ ammoInMagazine: ammoInMagazine - 1 });
    return true;
  },

  beginReload: (seconds) => {
    const {
      ammoInMagazine,
      ammoReserve,
      magazineSize,
      isReloading,
      isSwapping,
    } = get();
    if (isReloading) return;
    /*
      Tangan yang sedang mengganti senjata tidak bisa sekaligus mengisi ulang.
      Diperiksa DI SINI, bukan di tombolnya: isi ulang juga dimulai sendiri
      saat magasin habis, dan aturan yang hanya dipasang di tombol akan
      terlewat oleh jalur itu.
    */
    if (isSwapping) return;
    if (ammoReserve <= 0 || ammoInMagazine >= magazineSize) return;
    set({ isReloading: true, reloadSeconds: seconds });
  },

  finishReload: () => {
    const { ammoInMagazine, ammoReserve, magazineSize, isReloading } = get();
    if (!isReloading) return;
    const needed = magazineSize - ammoInMagazine;
    const loaded = Math.min(needed, ammoReserve);
    set({
      ammoInMagazine: ammoInMagazine + loaded,
      ammoReserve: ammoReserve - loaded,
      isReloading: false,
      reloadSeconds: 0,
    });
  },

  /*
    Penanda yang sedang tampil hanya diganti bila kabarnya lebih penting —
    atau bila jendelanya sudah lewat. Satu tarikan pelatuk shotgun mengenai
    sampai delapan kali dalam satu frame, dan tanpa aturan ini yang tampil
    adalah butir terakhir yang kebetulan dihitung, bukan yang paling berarti.
  */
  registerHit: (kind) =>
    set((state) => {
      const now = Date.now();
      if (!markerWins(state.hitMarker, kind, now)) return state;
      return { hitMarker: { id: now + Math.random(), kind, at: now } };
    }),

  clearHitMarker: (id) =>
    set((state) => (state.hitMarker?.id === id ? { hitMarker: null } : state)),

  /*
    Kerusakan yang datang beruntun MENAMBAH angka terakhir alih-alih menumpuk
    angka baru: satu tembakan shotgun terbaca sebagai satu angka besar, bukan
    delapan angka kecil yang muncul bersamaan.
  */
  pushDamagePop: (pop) =>
    set((state) => ({
      damagePops: mergePop(state.damagePops, pop, Date.now(), DAMAGE_POP_LIMIT),
    })),

  removeDamagePop: (id) =>
    set((state) => ({
      damagePops: state.damagePops.filter((pop) => pop.id !== id),
    })),

  pushIncomingHit: ({ angleRad, severity, attackerId, attackerName }) =>
    set((state) => {
      /*
        Penembak yang sama memukul lagi selagi penunjuknya masih tampil:
        penunjuknya DISEGARKAN, bukan ditumpuk. Rentetan SMG dari satu arah
        adalah satu ancaman, bukan lima busur yang saling menimpa; hitungan
        pukulannya ikut naik dan beratnya mengambil yang terberat.
      */
      const sebelumnya = state.incomingHits.find(
        (hit) => hit.attackerId === attackerId,
      );
      const lainnya = state.incomingHits.filter(
        (hit) => hit.attackerId !== attackerId,
      );
      return {
        incomingHits: [
          ...lainnya.slice(-(INCOMING_LIMIT - 1)),
          {
            id: Date.now() + Math.random(),
            angleRad,
            severity: Math.max(
              0,
              Math.min(1, Math.max(severity, sebelumnya?.severity ?? 0)),
            ),
            attackerId,
            attackerName,
            count: (sebelumnya?.count ?? 0) + 1,
          },
        ],
      };
    }),

  removeIncomingHit: (id) =>
    set((state) => ({
      incomingHits: state.incomingHits.filter((hit) => hit.id !== id),
    })),
}));
