import { type } from "@tauri-apps/plugin-os";

import type { OSType } from "./types";

export function os(): OSType {
  return type();
}

export function isMobile(): boolean {
  return false;
}

export function isWeb(): boolean {
  return true;
}
