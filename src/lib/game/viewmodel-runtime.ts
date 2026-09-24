/**
 * Sentakan viewmodel yang sedang berjalan, 0..1. Sistem senjata menaikkannya
 * tiap tembakan; viewmodel meluruhkannya tiap frame dan memakainya untuk
 * menyentak senjata ke belakang dan ke atas. Di luar React supaya menembak
 * beruntun tidak memicu render ulang.
 */
export const viewmodelRuntime = { kick: 0 };
