import type { RecoilStyle } from "@/lib/game/recoil-anim";
import type { RecoilClip } from "@/lib/game/viewmodel-anim";
import type { Weapon } from "@/types/game";

/**
 * Besar sentakan senjata, DITURUNKAN dari data senjatanya sendiri.
 *
 * Sebelumnya angka sentakan viewmodel ditulis tangan per jenis senjata,
 * terpisah dari `recoilDegrees` yang dipakai sentakan kamera. Dua tabel untuk
 * satu sifat yang sama pasti berselisih cepat atau lambat: sniper punya
 * sentakan kamera enam kali lipat SMG sambil menggerakkan senjatanya hanya
 * empat kali lipat, dan tidak ada yang memberitahu bahwa keduanya sudah tidak
 * sejalan. Lebih buruk lagi, menyeimbangkan sebuah senjata lewat data —
 * menaikkan sentakannya, mempercepat tembakannya — diam-diam tidak mengubah
 * apa pun yang DILIHAT pemain.
 *
 * Di sini semuanya dihitung dari `recoilDegrees`, `fireRate`, dan
 * `magazineSize` senjata itu. Menyeimbangkan senjata lewat data karena itu
 * ikut terbawa ke tampilannya, dan urutan "senjata mana yang paling
 * menyentak" tidak mungkin lagi berbeda antara kamera dan senjatanya.
 */

/**
 * Senapan serbu dipakai sebagai patokan: angkanya persis seperti saat masih
 * ditulis tangan, dan senjata lain diturunkan relatif terhadapnya. Dengan
 * begitu perubahan ini tidak mengubah rasa senjata yang paling sering
 * dipakai, hanya membuat yang lain mengikuti datanya.
 */
const ACUAN_DERAJAT = 0.75;
const ACUAN_KICK = 0.08;
const ACUAN_RISE = 0.095;

/**
 * Pangkat di bawah satu: sentakan senjata TUMBUH LEBIH PELAN daripada
 * sentakan kameranya.
 *
 * Kamera boleh terlempar tiga derajat tanpa masalah — pandangannya memang
 * yang terlempar. Senjata tidak: ia hanya punya beberapa sentimeter sebelum
 * keluar layar, dan sniper yang menyentak enam kali lipat SMG secara lurus
 * akan melompat keluar pandangan tiap tembakan.
 */
const PANGKAT_BESAR = 0.7;

/** Seberapa cepat sentakannya reda; senjata berat mereda lebih lama. */
const REDA_MIN = 0.09;
const REDA_MAX = 0.34;
const REDA_PER_DERAJAT = 0.08;

/**
 * Jeda terpanjang yang masih dianggap satu rentetan tidak boleh lebih pendek
 * dari sela dua frame di mesin lambat. Pada delapan frame per detik jaraknya
 * sudah 0,125 detik dan pada empat frame per detik 0,25 detik; di bawah batas
 * ini rentetan akan terbaca putus hanya karena mesinnya lambat.
 */
const IKAT_MIN = 0.28;
const IKAT_JEDA = 2.5;

function jepit(nilai: number, min: number, max: number): number {
  if (!Number.isFinite(nilai)) return min;
  return Math.min(max, Math.max(min, nilai));
}

/** Derajat sentakan yang sah; senjata tanpa data memakai patokan. */
function derajat(weapon: Weapon): number {
  const d = weapon.recoilDegrees;
  return Number.isFinite(d) && d > 0 ? d : ACUAN_DERAJAT;
}

/** Jeda antar peluru senjata itu, detik. */
function jeda(weapon: Weapon): number {
  const rate = weapon.fireRate;
  return Number.isFinite(rate) && rate > 0 ? 60 / rate : 0.1;
}

/** Besar sentakan relatif terhadap senapan serbu. */
export function recoilWeight(weapon: Weapon): number {
  return Math.pow(derajat(weapon) / ACUAN_DERAJAT, PANGKAT_BESAR);
}

/** Seberapa jauh senjata tersentak dan berapa lama redanya. */
export function recoilClipFor(weapon: Weapon): RecoilClip {
  const berat = recoilWeight(weapon);
  return {
    kick: ACUAN_KICK * berat,
    rise: ACUAN_RISE * berat,
    seconds: jepit(
      REDA_MIN + derajat(weapon) * REDA_PER_DERAJAT,
      REDA_MIN,
      REDA_MAX,
    ),
  };
}

/**
 * Watak menumpuknya sentakan sepanjang rentetan.
 *
 * Panas penuh dicapai di tengah magasin, berapa pun isinya: shotgun berisi
 * delapan selongsong harus sampai ke puncaknya dalam empat tembakan, sama
 * seperti senapan serbu dalam lima belas peluru. Magasinlah ukuran "satu
 * rentetan panjang" bagi senjata itu, bukan angka tetap yang sama untuk
 * semuanya.
 *
 * Tumbuhnya justru BERBANDING TERBALIK dengan berat sentakannya: senjata yang
 * satu tembakannya sudah melempar senjata tidak perlu tumbuh banyak lagi,
 * sementara SMG yang tiap pelurunya nyaris tak terasa hanya bisa dibedakan
 * dari rentetannya.
 */
export function recoilStyleFor(weapon: Weapon): RecoilStyle {
  const berat = recoilWeight(weapon);
  const setengahMagasin = Math.max(
    2,
    Math.round(
      (Number.isFinite(weapon.magazineSize) ? weapon.magazineSize : 30) / 2,
    ),
  );
  return {
    perShot: 1 / setengahMagasin,
    maxHeat: 1,
    linkSeconds: Math.max(IKAT_MIN, jeda(weapon) * IKAT_JEDA),
    decay: jepit(1.6 / berat, 0.4, 2),
    climb: jepit(1.1 / Math.pow(berat, 0.85), 0.25, 1.2),
    wander: jepit(0.35 / Math.pow(berat, 0.7), 0.12, 0.4),
  };
}
