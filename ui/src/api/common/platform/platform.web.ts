import { type } from "@tauri-apps/plugin-os";
import { Platform } from "react-native";

import type { OSType } from "./types";

export function isTauri() {
  return !!((globalThis || window) as any)?.isTauri;
}

export function os(): OSType | "web" {
  if (isTauri()) {
    return type();
  }
  return "web";
}

export function isMobile(): boolean {
  return false;
}

export function isWeb(): boolean {
  return true;
}

export function isWebOnly(): boolean {
  return isTauri() ? false : true;
}

export function isDesktop(): boolean {
  const platfrom = os();
  return platfrom === "windows" || platfrom === "macos" || platfrom === "linux";
}

export function isTV(): boolean {
  return Platform.isTV;
}

export function supportsImpactHaptics(): boolean {
  return false;
}

export function isLegacyCompactIphone(): boolean {
  return false;
}

export function iosMajorVersion(): number | null {
  return null;
}

export function isIos26Plus(): boolean {
  return false;
}

export function isIos16Plus(): boolean {
  return false;
}
