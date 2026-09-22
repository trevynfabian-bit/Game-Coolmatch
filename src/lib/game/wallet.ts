/**
 * Dompet koin pemain: saldo, dan riwayat yang menjelaskan saldo itu.
 *
 * Satu keputusan menentukan seluruh bentuk berkas ini: saldo TIDAK disimpan
 * di samping riwayatnya, melainkan DIJUMLAHKAN dari riwayat itu sendiri.
 *
 * Menyimpan keduanya terpisah berarti dua angka yang bisa berselisih, dan
 * yang kalah selalu pemain: ia membaca saldo 1.240 sementara daftar
 * transaksinya hanya menjelaskan 1.180, lalu tidak punya cara tahu mana yang
 * bohong — apakah ada koin yang hilang, atau ada catatan yang tidak tercatat.
 * Dengan saldo yang dijumlahkan, pertanyaan itu mustahil muncul: tiap koin
 * yang ada di saldo pasti punya barisnya sendiri di riwayat.
 *
 * Nanti server memang menyimpan saldo sebagai kolom tersendiri demi kecepatan
 * baca, dan itu wajar. Yang dibaca layar tetap hasil penjumlahan ini, jadi
 * kolom itu berperan sebagai singgahan — bukan sebagai kebenaran kedua.
 */

/** Dari mana koin datang, atau ke mana ia pergi. */
export type CoinReason =
  /** Hadiah dasar karena menyelesaikan satu pertandingan. */
  | "hasil-match"
  /** Bonus atas jumlah kill dalam pertandingan itu. */
  | "bonus-kill"
  /** Bonus atas ronde yang dimenangkan. */
  | "bonus-ronde"
  /** Bonus atas rentetan kill tanpa mati. */
  | "bonus-killstreak"
  /** Membeli peningkatan atau attachment senjata. */
  | "belanja-upgrade"
  /** Membeli skin atau camo. */
  | "belanja-skin";

export interface CoinReasonInfo {
  label: string;
  /** Kalimat pendek untuk baris riwayat yang tidak punya catatan sendiri. */
  hint: string;
}

/**
 * Nama tiap sebab dalam bahasa yang dibaca pemain.
 *
 * Ditaruh sebagai tabel, bukan ditulis di dalam komponen, supaya halaman
 * dompet dan ringkasan koin di akhir pertandingan menyebut hal yang sama
 * dengan kata yang sama. "Bonus kill" di satu layar dan "Koin kill" di layar
 * lain terbaca sebagai dua jenis pemasukan yang berbeda.
 */
export const COIN_REASON_INFO: Record<CoinReason, CoinReasonInfo> = {
  "hasil-match": {
    label: "Hasil pertandingan",
    hint: "Imbalan dasar karena menyelesaikan pertandingan",
  },
  "bonus-kill": {
    label: "Bonus kill",
    hint: "Tambahan dari jumlah lawan yang ditumbangkan",
  },
  "bonus-ronde": {
    label: "Bonus ronde",
    hint: "Tambahan dari ronde yang dimenangkan",
  },
  "bonus-killstreak": {
    label: "Bonus killstreak",
    hint: "Tambahan dari rentetan kill tanpa mati",
  },
  "belanja-upgrade": {
    label: "Upgrade senjata",
    hint: "Peningkatan atau attachment yang dibeli",
  },
  "belanja-skin": {
    label: "Skin & camo",
    hint: "Tampilan senjata yang dibeli",
  },
};

export interface CoinEntry {
  id: string;
  /** Epoch milidetik saat koin masuk atau keluar. */
  at: number;
  /**
   * Jumlah koin; NEGATIF berarti keluar.
   *
   * Arahnya hidup di tandanya sendiri, bukan di penanda terpisah seperti
   * `isSpending`. Penanda terpisah berarti ada keadaan yang mustahil —
   * pembelian bertanda keluar dengan jumlah positif — dan penjumlahan saldo
   * harus mengingat penanda itu di tiap tempat ia menjumlah.
   */
  amount: number;
  reason: CoinReason;
  /** Keterangan khusus baris ini, misalnya nama senjata yang di-upgrade. */
  note?: string;
}

/** Benar bila koinnya masuk, bukan keluar. */
export function isIncome(entry: CoinEntry): boolean {
  return entry.amount > 0;
}

/** Saldo koin: jumlah seluruh baris riwayat, masuk dikurangi keluar. */
export function walletBalance(entries: readonly CoinEntry[]): number {
  return entries.reduce((total, entry) => total + entry.amount, 0);
}

export interface WalletSummary {
  balance: number;
  /** Total koin yang pernah masuk. */
  earned: number;
  /** Total koin yang pernah keluar, sebagai bilangan positif. */
  spent: number;
  /** Banyaknya baris riwayat. */
  entries: number;
  /** Epoch milidetik baris terbaru; null bila riwayatnya kosong. */
  lastAt: number | null;
}

/**
 * Ikhtisar dompet.
 *
 * Koin masuk dan koin keluar dihitung terpisah karena keduanya menjawab
 * pertanyaan yang berbeda: "seberapa produktif aku bertanding" dan "sudah
 * seberapa banyak aku belanja". Saldo saja menutupi keduanya — pemain yang
 * sudah mengumpulkan sepuluh ribu koin lalu menghabiskan hampir semuanya
 * terlihat sama miskin dengan pemain yang baru mulai.
 */
export function walletSummary(entries: readonly CoinEntry[]): WalletSummary {
  let earned = 0;
  let spent = 0;
  let lastAt: number | null = null;

  for (const entry of entries) {
    if (entry.amount > 0) earned += entry.amount;
    else spent += -entry.amount;
    if (lastAt === null || entry.at > lastAt) lastAt = entry.at;
  }

  return {
    balance: earned - spent,
    earned,
    spent,
    entries: entries.length,
    lastAt,
  };
}

export interface LedgerRow extends CoinEntry {
  /**
   * Saldo SESUDAH baris ini terjadi.
   *
   * Inilah yang membuat riwayat benar-benar menjelaskan saldonya: baris
   * teratas menunjukkan angka yang sama persis dengan saldo besar di kepala
   * halaman, dan tiap baris di bawahnya menunjukkan dari mana angka itu
   * datang. Riwayat tanpa kolom ini hanya daftar kejadian; pemain tetap harus
   * menjumlah sendiri untuk tahu apakah saldonya masuk akal.
   */
  balanceAfter: number;
}

/**
 * Riwayat urut dari yang TERBARU, masing-masing dengan saldo sesudahnya.
 *
 * Diurutkan di sini, bukan dititipkan ke pemanggil, sebab saldo berjalannya
 * hanya benar bila urutannya benar. Riwayat yang datang dari server boleh
 * datang dalam urutan apa pun.
 */
export function ledgerRows(entries: readonly CoinEntry[]): LedgerRow[] {
  const menaik = [...entries].sort(
    (a, b) => a.at - b.at || a.id.localeCompare(b.id),
  );

  let berjalan = 0;
  const rows: LedgerRow[] = menaik.map((entry) => {
    berjalan += entry.amount;
    return { ...entry, balanceAfter: berjalan };
  });

  return rows.reverse();
}

/** Arah transaksi yang sedang dilihat pemain. */
export type LedgerFilter = "semua" | "masuk" | "keluar";

export const LEDGER_FILTER_LABEL: Record<LedgerFilter, string> = {
  semua: "Semua",
  masuk: "Masuk",
  keluar: "Keluar",
};

/** Benar bila baris ini lolos saringan arah. */
export function passesFilter(row: CoinEntry, filter: LedgerFilter): boolean {
  if (filter === "masuk") return row.amount > 0;
  if (filter === "keluar") return row.amount < 0;
  return true;
}

export interface LedgerDay {
  /** Kunci hari, dipakai sebagai key daftar. */
  key: string;
  /** Tanggal hari itu dalam epoch milidetik, untuk diformat pemanggil. */
  at: number;
  /** Selisih koin hari itu, masuk dikurangi keluar. */
  net: number;
  rows: LedgerRow[];
}

/** Zona waktu dipaku ke WIB dengan alasan yang sama seperti halaman skor:
 * teks hasil render server dan hasil hidrasi di browser harus sama persis. */
const WIB = "Asia/Jakarta";

const KUNCI_HARI = new Intl.DateTimeFormat("en-CA", {
  year: "numeric",
  month: "2-digit",
  day: "2-digit",
  timeZone: WIB,
});

/**
 * Riwayat dikelompokkan per hari, urut dari hari terbaru.
 *
 * Pemain mengingat koinnya dalam satuan sesi bermain — "tadi malam aku dapat
 * berapa" — bukan dalam satuan transaksi. Pengelompokan per hari dengan
 * selisih hariannya menjawab pertanyaan itu langsung, tanpa ia perlu
 * menjumlahkan sendiri lima baris yang berdempetan.
 */
export function ledgerDays(
  entries: readonly CoinEntry[],
  filter: LedgerFilter = "semua",
): LedgerDay[] {
  const days: LedgerDay[] = [];
  const index = new Map<string, LedgerDay>();

  /*
    Saldo berjalannya dihitung dari SELURUH riwayat lebih dulu, baru barisnya
    disaring. Menyaring lebih dulu lalu menjumlahkan sisanya menghasilkan
    angka yang tampak masuk akal tetapi bohong: melihat "hanya pengeluaran"
    akan membacakan saldo yang terus menurun dari nol, seolah pemain tidak
    pernah mendapat koin sama sekali.
  */
  for (const row of ledgerRows(entries)) {
    if (!passesFilter(row, filter)) continue;
    const key = KUNCI_HARI.format(new Date(row.at));
    let day = index.get(key);
    if (!day) {
      day = { key, at: row.at, net: 0, rows: [] };
      index.set(key, day);
      days.push(day);
    }
    day.net += row.amount;
    day.rows.push(row);
  }

  return days;
}

const ANGKA = new Intl.NumberFormat("id-ID");

/** Koin sebagai angka yang dibaca pemain: 1240 menjadi "1.240". */
export function formatCoins(amount: number): string {
  if (!Number.isFinite(amount)) return "0";
  return ANGKA.format(Math.round(amount));
}

/**
 * Koin dengan tandanya, untuk baris riwayat: "+120" atau "-80".
 *
 * Tandanya selalu ditulis, termasuk untuk pemasukan. Tanpa tanda plus, mata
 * harus mencari warna untuk tahu arahnya — dan warna adalah satu-satunya
 * petunjuk yang hilang bagi pemain yang tidak bisa membedakannya.
 */
export function signedCoins(amount: number): string {
  const besar = formatCoins(Math.abs(amount));
  return amount < 0 ? `-${besar}` : `+${besar}`;
}
