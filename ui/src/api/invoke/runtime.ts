import { Platform } from "react-native";

import { os } from "../common";
import type { OSType } from "../common";

export function isTauri() {
  return !!((globalThis || window) as any)?.isTauri;
}

export function isNative(): boolean {
  const t = os();
  return t === "android" || t === "ios";
}

export function isWeb(): boolean {
  return Platform.OS === "web";
}

export function OS(): OSType {
  return os();
}

export function isInvokeAvailable(): boolean {
  return isTauri() || isNative();
}
