import {
  RELOAD_IDLE,
  reloadDrive,
  reloadPoseFrom,
  type ReloadDrive,
  type ReloadLook,
  type ReloadStyle,
} from "@/lib/game/reload-anim";
import type { WeaponType } from "@/types/game";

/**
 * Kontroler animasi senjata sudut pandang orang pertama.
 *
 * Senjata yang hanya mengayun pelan saat diam membuat seluruh pertarungan
 * terasa seperti menggeser gambar tempel: menembak tidak menyentaknya, berlari
 * tidak mengguncangnya, dan mengisi ulang tidak terlihat sama sekali —
 * satu-satunya kabar adalah bar di HUD. Berkas ini menyatukan semua gerakan
 * itu sebagai LAPISAN yang dijumlahkan, bukan sebagai satu animasi besar yang
 * saling menimpa.
 *
 * Tiap lapis adalah fungsi murni dari waktu dan keadaan, jadi seluruh
 * gerakannya bisa diperiksa tanpa browser: "apakah senjata benar-benar kembali
 * ke tempatnya sesudah sentakan" adalah pertanyaan tentang fungsi, bukan
 * tentang apa yang terlihat di layar.
 */

export interface Pose {
  /** Geser kanan-kiri, satuan lokal senjata. */
  px: number;
  /** Geser naik-turun. */
  py: number;
  /** Geser maju-mundur; negatif berarti menjauh dari pemain. */
  pz: number;
  /** Putar mendongak-menunduk, radian. */
  rx: number;
  /** Putar menoleh, radian. */
  ry: number;
  /** Putar memiring, radian. */
  rz: number;
}

export const REST_POSE: Pose = { px: 0, py: 0, pz: 0, rx: 0, ry: 0, rz: 0 };

/** Menjumlahkan beberapa pose jadi satu. */
export function composePose(...poses: readonly Pose[]): Pose {
  const hasil = { ...REST_POSE };
  for (const p of poses) {
    hasil.px += p.px;
    hasil.py += p.py;
    hasil.pz += p.pz;
    hasil.rx += p.rx;
    hasil.ry += p.ry;
    hasil.rz += p.rz;
  }
  return hasil;
}

/** Nilai aman untuk waktu atau kemajuan yang datang dari luar. */
function aman(nilai: number, bawaan = 0): number {
  return Number.isFinite(nilai) ? nilai : bawaan;
}

export interface IdleClip {
  /** Simpangan napas naik-turun. */
  bob: number;
  /** Simpangan geser kiri-kanan. */
  sway: number;
  /** Kecepatan napas, putaran per detik. */
  rate: number;
}

/**
 * Ayunan diam: napas pelan supaya arena tidak terasa beku. Sengaja kecil —
 * ayunan yang terlalu besar membuat bidikan terasa tidak bisa dipercaya
 * padahal peluru tetap berangkat dari tengah layar.
 */
export function idlePose(time: number, clip: IdleClip): Pose {
  const t = aman(time);
  return {
    px: Math.sin(t * clip.rate * 0.48) * clip.sway,
    py: Math.sin(t * clip.rate) * clip.bob,
    pz: 0,
    rx: Math.sin(t * clip.rate) * clip.bob * 0.6,
    ry: Math.sin(t * clip.rate * 0.48) * clip.sway * 1.2,
    rz: 0,
  };
}

export interface WalkClip {
  /** Simpangan langkah naik-turun pada kecepatan penuh. */
  bob: number;
  /** Simpangan langkah kiri-kanan pada kecepatan penuh. */
  sway: number;
  /** Langkah per detik pada kecepatan penuh. */
  rate: number;
  /** Kecepatan yang dianggap "penuh", satuan dunia per detik. */
  fullSpeed: number;
}

/**
 * Ayunan langkah: mengikuti kecepatan pemain, bukan tombol yang ditekan.
 *
 * Naik-turunnya berfrekuensi DUA kali kiri-kanannya, sebab satu langkah kiri
 * dan satu langkah kanan sama-sama menurunkan badan — itulah yang membuat
 * gerakannya terbaca sebagai berjalan alih-alih bergoyang.
 */
export function walkPose(time: number, speed: number, clip: WalkClip): Pose {
  const laju = Math.min(1, Math.max(0, aman(speed) / clip.fullSpeed));
  if (laju <= 0.001) return REST_POSE;
  const t = aman(time) * clip.rate * Math.PI * 2 * (0.6 + 0.4 * laju);
  return {
    px: Math.sin(t) * clip.sway * laju,
    py: -Math.abs(Math.sin(t)) * clip.bob * laju,
    pz: 0,
    rx: Math.sin(t * 2) * clip.bob * laju * 0.8,
    ry: Math.sin(t) * clip.sway * laju * 0.9,
    rz: Math.sin(t) * clip.sway * laju * 1.6,
  };
}

export interface RecoilClip {
  /** Mundur ke arah pemain, satuan lokal. */
  kick: number;
  /** Mendongak, radian. */
  rise: number;
  /** Lama sentakan sampai kembali ke tempatnya, detik. */
  seconds: number;
}

/**
 * Sentakan tembakan: mundur dan mendongak cepat, lalu kembali perlahan.
 *
 * Kembalinya dibuat pasti nol di ujung waktunya. Sentakan yang hanya meluruh
 * secara eksponensial tidak pernah benar-benar selesai, dan senjata yang
 * tertinggal sepersekian derajat dari tempatnya akan terus menumpuk selama
 * pertandingan.
 */
export function recoilPose(elapsed: number, clip: RecoilClip): Pose {
  const t = aman(elapsed);
  if (t <= 0 || t >= clip.seconds) return REST_POSE;
  const bagian = t / clip.seconds;
  // Naik cepat pada seperlima pertama, lalu turun halus sampai nol.
  const bentuk =
    bagian < 0.2
      ? bagian / 0.2
      : Math.cos(((bagian - 0.2) / 0.8) * (Math.PI / 2));
  return {
    px: 0,
    py: clip.rise * bentuk * 0.35,
    pz: clip.kick * bentuk,
    rx: -clip.rise * bentuk,
    ry: 0,
    rz: clip.rise * bentuk * 0.25,
  };
}

export interface SwapClip {
  /** Seberapa jauh senjata diturunkan saat berganti. */
  drop: number;
  tilt: number;
}

/**
 * Ganti senjata: yang lama dijatuhkan keluar layar, yang baru diangkat masuk.
 * Titik terendahnya persis di tengah waktu pergantian — di situlah senjatanya
 * benar-benar bertukar.
 */
export function swapPose(progress: number, clip: SwapClip): Pose {
  const p = Math.min(1, Math.max(0, aman(progress)));
  if (p <= 0 || p >= 1) return REST_POSE;
  // Segitiga: nol di kedua ujung, satu di tengah.
  const kuat = 1 - Math.abs(p - 0.5) * 2;
  return {
    px: 0,
    py: -clip.drop * kuat,
    pz: clip.drop * 0.3 * kuat,
    rx: clip.tilt * kuat,
    ry: 0,
    rz: -clip.tilt * 0.6 * kuat,
  };
}

/** Seluruh kelompok gerakan untuk satu jenis senjata. */
export interface ViewmodelClips {
  idle: IdleClip;
  walk: WalkClip;
  recoil: RecoilClip;
  /** Seberapa jauh senjata turun dan miring saat isi ulang. */
  reload: ReloadLook;
  /** Cara senjata itu diisi ulang; menentukan irama tangannya. */
  reloadStyle: ReloadStyle;
  swap: SwapClip;
}

export interface ViewmodelInput {
  /** Jam halaman, detik. */
  time: number;
  /** Kecepatan mendatar pemain, satuan dunia per detik. */
  speed: number;
  /** Sudah berapa detik sejak tembakan terakhir; null bila belum menembak. */
  sinceShot: number | null;
  /**
   * Sudah berapa detik isi ulang berjalan; null bila tidak sedang mengisi.
   *
   * Detik, bukan kemajuan 0..1: tahap turun dan naiknya berlangsung selama
   * yang ditulis gaya isi ulang senjata itu, dan hanya bagian tengahnya yang
   * meregang mengikuti lama isi ulang.
   */
  reloadElapsed: number | null;
  /** Lama isi ulang yang sedang berjalan, detik. */
  reloadSeconds: number;
  /** Kemajuan ganti senjata 0..1; null bila tidak sedang berganti. */
  swapProgress: number | null;
}

export interface ViewmodelFrame {
  pose: Pose;
  /**
   * Tahap isi ulang pada saat ini. Ikut dikembalikan, bukan disimpan sendiri
   * oleh penggambar, supaya magasin yang terlepas dan badan senjata yang
   * turun memakai perhitungan yang sama persis.
   */
  reload: ReloadDrive;
}

/**
 * Seluruh keadaan gambar senjata pada satu saat: posenya, dan tahap isi
 * ulang yang sedang berjalan.
 *
 * Posenya DIJUMLAHKAN dari tiap lapisan, bukan dipilih salah satu. Menembak
 * sambil berlari harus terlihat sebagai keduanya sekaligus; kontroler yang
 * memilih satu keadaan akan membekukan langkah pemain tiap kali ia menarik
 * pelatuk.
 */
export function viewmodelFrame(
  input: ViewmodelInput,
  clips: ViewmodelClips,
): ViewmodelFrame {
  const isiUlang =
    input.reloadElapsed === null
      ? RELOAD_IDLE
      : reloadDrive(
          input.reloadElapsed,
          input.reloadSeconds,
          clips.reloadStyle,
        );

  return {
    pose: composePose(
      idlePose(input.time, clips.idle),
      walkPose(input.time, input.speed, clips.walk),
      input.sinceShot === null
        ? REST_POSE
        : recoilPose(input.sinceShot, clips.recoil),
      reloadPoseFrom(isiUlang, clips.reload),
      input.swapProgress === null
        ? REST_POSE
        : swapPose(input.swapProgress, clips.swap),
    ),
    reload: isiUlang,
  };
}

/** Pose akhir saja, untuk pemakai yang tidak peduli tahap isi ulang. */
export function viewmodelPose(
  input: ViewmodelInput,
  clips: ViewmodelClips,
): Pose {
  return viewmodelFrame(input, clips).pose;
}

/** Benar bila pose ini sama dengan diam sepenuhnya. */
export function isRestPose(pose: Pose, epsilon = 1e-9): boolean {
  return (
    Math.abs(pose.px) < epsilon &&
    Math.abs(pose.py) < epsilon &&
    Math.abs(pose.pz) < epsilon &&
    Math.abs(pose.rx) < epsilon &&
    Math.abs(pose.ry) < epsilon &&
    Math.abs(pose.rz) < epsilon
  );
}

export type { WeaponType };
