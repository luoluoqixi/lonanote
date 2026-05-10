import { Platform } from "react-native";

import { isTauri } from "@/api/invoke";

import type { OSType } from "./types";

const UNKNOWN: OSType = "unknown";

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
  return isTauri() ? false : true;
}

export function isDesktop(): boolean {
  return false;
}
