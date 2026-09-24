/**
 * Hitungan frame untuk pengukur FPS. FpsProbe (di dalam kanvas) menambah
 * `frames` tiap frame; FpsMeter (di HUD) membacanya dua kali per detik lalu
 * menolkan. Disimpan di luar React supaya mengukur FPS tidak ikut menurunkannya.
 */
export const fpsRuntime = { frames: 0, since: 0, worstFrameMs: 0 };
