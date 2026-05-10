import { type } from "@tauri-apps/plugin-os";

import type { OSType } from "./types";

export function isTauri() {
  return !!((globalThis || window) as any)?.isTauri;
}

export function os(): OSType {
  return type();
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
