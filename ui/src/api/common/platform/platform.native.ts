import { Platform } from "react-native";

import type { OSType } from "./types";

const UNKNOWN: OSType = "unknown";

export function isTauri() {
  return false;
}

export function os(): OSType {
  const os = Platform.OS;
  if (os === "android" || os === "ios") return os;
  return UNKNOWN;
}

export function isMobile(): boolean {
  const os = Platform.OS;
  return os === "android" || os === "ios";
}

export function isWeb(): boolean {
  const os = Platform.OS;
  return os === "web";
}

export function isWebOnly(): boolean {
  return false;
}

export function isDesktop(): boolean {
  return false;
}

export function isTV(): boolean {
  return Platform.isTV;
}

let cachedIosMajor: number | null = null;

/**
 * iOS 大版本号，仅在 iOS 平台有值，非 iOS 返回 null（如 android/web/桌面端）。
 * 示例：iOS 15.6 → 15，iOS 18.0 → 18。
 */
export function iosMajorVersion(): number | null {
  if (cachedIosMajor !== null) return cachedIosMajor;

  if (Platform.OS !== "ios") {
    cachedIosMajor = null;
    return null;
  }

  const rawVersion = Platform.Version as string;
  const major = Number.parseInt(String(rawVersion).split(".")[0], 10);
  cachedIosMajor = Number.isFinite(major) ? major : null;
  return cachedIosMajor;
}
