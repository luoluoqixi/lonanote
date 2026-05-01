import { Platform } from "react-native";

export function isTauri() {
  return !!((globalThis || window) as any)?.isTauri;
}

export function isNative(): boolean {
  return Platform.OS === "android" || Platform.OS === "ios";
}

export function isWeb(): boolean {
  return Platform.OS === "web";
}

export function OS(): "ios" | "android" | "windows" | "macos" | "web" {
  return Platform.OS;
}

export function isInvokeAvailable(): boolean {
  return isTauri() || isNative();
}
