/**
 * Batas nilai pengaturan yang sah, dipakai bersama store klien dan validasi
 * server supaya keduanya tidak pernah berselisih.
 */
export const GRAPHICS_QUALITY_IDS = ["rendah", "sedang", "tinggi"] as const;
export type GraphicsQuality = (typeof GRAPHICS_QUALITY_IDS)[number];

export const FOV_RANGE = { min: 65, max: 100 } as const;
export const RESOLUTION_RANGE = { min: 0.5, max: 1, step: 0.05 } as const;
export const SENSITIVITY_RANGE = { min: 0.2, max: 3, step: 0.05 } as const;
