"use client";

import { useEffect } from "react";
import { useThree } from "@react-three/fiber";
import type { PerspectiveCamera } from "three";
import { useSettingsStore } from "@/lib/store/settings-store";

/** Menerapkan sudut pandang dari pengaturan grafis ke kamera, langsung saat berubah. */
export function CameraFov() {
  const getThree = useThree((state) => state.get);
  const fov = useSettingsStore((state) => state.graphics.fov);
  useEffect(() => {
    const camera = getThree().camera as PerspectiveCamera;
    camera.fov = fov;
    camera.updateProjectionMatrix();
  }, [getThree, fov]);
  return null;
}
