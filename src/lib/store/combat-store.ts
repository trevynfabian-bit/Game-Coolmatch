import { create } from "zustand";

export interface HitMarker {
  /** Penanda waktu agar HUD bisa memicu ulang animasi tiap kena. */
  id: number;
  isHeadshot: boolean;
}

/** Angka kerusakan yang melayang sesaat di dekat crosshair. */
export interface DamagePop {
  id: number;
  amount: number;
  isHeadshot: boolean;
  isLethal: boolean;
  /** Geser acak dalam piksel, dibuat sekali supaya tidak loncat saat render. */
  offsetX: number;
  offsetY: number;
}

/** Batas angka kerusakan yang ditahan sekaligus di layar. */
const DAMAGE_POP_LIMIT = 6;

/** Satu tembakan yang mengenai pemain lokal, untuk umpan balik arah. */
export interface IncomingHit {
  id: number;
  /**
   * Sudut penyerang relatif arah pandang pemain, dalam radian. Nol berarti
   * tepat di depan, nilai positif ke kanan.
   */
  angleRad: number;
  /** 0..1, seberapa berat tembakannya dibanding nyawa maksimum. */
  severity: number;
  attackerName: string;
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

  /** Menyiapkan amunisi awal dari potret pertandingan. */
  arm: (config: {
    ammoInMagazine: number;
    ammoReserve: number;
    magazineSize: number;
  }) => void;
  /** Mengurangi satu peluru. Mengembalikan false bila magasin kosong. */
  consumeRound: () => boolean;
  beginReload: (seconds: number) => void;
  finishReload: () => void;
  registerHit: (isHeadshot: boolean) => void;
  clearHitMarker: (id: number) => void;
  pushDamagePop: (pop: {
    amount: number;
    isHeadshot: boolean;
    isLethal: boolean;
  }) => void;
  removeDamagePop: (id: number) => void;
  /** Mencatat tembakan yang mengenai pemain, untuk vignette dan penunjuk arah. */
  pushIncomingHit: (hit: {
    angleRad: number;
    severity: number;
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

  arm: ({ ammoInMagazine, ammoReserve, magazineSize }) =>
    set({
      ammoInMagazine,
      ammoReserve,
      magazineSize,
      isReloading: false,
      reloadSeconds: 0,
      hitMarker: null,
      damagePops: [],
      incomingHits: [],
    }),

  consumeRound: () => {
    const { ammoInMagazine, isReloading } = get();
    if (isReloading || ammoInMagazine <= 0) return false;
    set({ ammoInMagazine: ammoInMagazine - 1 });
    return true;
  },

  beginReload: (seconds) => {
    const { ammoInMagazine, ammoReserve, magazineSize, isReloading } = get();
    if (isReloading) return;
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

  registerHit: (isHeadshot) =>
    set({ hitMarker: { id: Date.now() + Math.random(), isHeadshot } }),

  clearHitMarker: (id) =>
    set((state) =>
      state.hitMarker?.id === id ? { hitMarker: null } : state,
    ),

  pushDamagePop: ({ amount, isHeadshot, isLethal }) =>
    set((state) => ({
      damagePops: [
        ...state.damagePops.slice(-(DAMAGE_POP_LIMIT - 1)),
        {
          id: Date.now() + Math.random(),
          amount: Math.round(amount),
          isHeadshot,
          isLethal,
          offsetX: (Math.random() - 0.5) * 70,
          offsetY: (Math.random() - 0.5) * 26,
        },
      ],
    })),

  removeDamagePop: (id) =>
    set((state) => ({
      damagePops: state.damagePops.filter((pop) => pop.id !== id),
    })),

  pushIncomingHit: ({ angleRad, severity, attackerName }) =>
    set((state) => ({
      incomingHits: [
        ...state.incomingHits.slice(-(INCOMING_LIMIT - 1)),
        {
          id: Date.now() + Math.random(),
          angleRad,
          severity: Math.max(0, Math.min(1, severity)),
          attackerName,
        },
      ],
    })),

  removeIncomingHit: (id) =>
    set((state) => ({
      incomingHits: state.incomingHits.filter((hit) => hit.id !== id),
    })),
}));
