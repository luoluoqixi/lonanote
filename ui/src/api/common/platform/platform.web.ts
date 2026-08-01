import { type } from "@tauri-apps/plugin-os";
import { Platform } from "react-native";

import { isLocaleCN } from "./common";
import type { OSType } from "./types";

let SYSTEM_LOCALE: string | undefined;

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

/**
 * 同步返回当前 WebView / 浏览器声明的首选语言。
 *
 * Tauri 中此值来自 WebView；Rust Core 的系统语言仍由 Rust 在初始化时自行读取。
 */
export function systemLocale(): string {
  if (!SYSTEM_LOCALE) {
    SYSTEM_LOCALE = getSystemLocale();
  }
  return SYSTEM_LOCALE;
}

/**
 * 系统语言是否是CN
 * @returns 是否是CN
 */
export function isSystemLocaleCN(): boolean {
  return isLocaleCN(systemLocale());
}

function getSystemLocale(): string {
  const browserNavigator = typeof navigator === "undefined" ? undefined : navigator;
  const preferredLanguage = browserNavigator?.languages?.find(
    (language) => typeof language === "string" && language.trim() !== "",
  );
  if (preferredLanguage) {
    return preferredLanguage.trim();
  }

  const language = browserNavigator?.language?.trim();
  if (language) {
    return language;
  }

  try {
    return Intl.DateTimeFormat().resolvedOptions().locale || "en";
  } catch {
    return "en";
  }
}
