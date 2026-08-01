import * as Device from "expo-device";
import { I18nManager, NativeModules, Platform } from "react-native";

import { isLocaleCN } from "./common";
import type { OSType } from "./types";

const UNKNOWN: OSType = "unknown";

let SYSTEM_LOCALE: string | undefined;

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

export function isIos(): boolean {
  const os = Platform.OS;
  return os === "ios";
}

export function isAndroid(): boolean {
  const os = Platform.OS;
  return os === "android";
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

let cachedHapticSupport: boolean | null = null;
let cachedLegacyCompactIphone: boolean | null = null;

/**
 * 当前设备是否支持 UIImpactFeedbackGenerator（impact 震动）。
 *
 * - Android：始终支持（使用 AudioManager haptics）。
 * - iOS：iPhone 6s / 6s Plus / SE 1st gen（iPhone8,{1,2,4}）使用初代 Taptic Engine，
 *   无法正确驱动 UIImpactFeedbackGenerator，视为不支持。iPhone 7 及以上型号正常支持。
 * - 未知型号或模拟器：保守视为支持。
 */
export function supportsImpactHaptics(): boolean {
  if (cachedHapticSupport !== null) return cachedHapticSupport;

  if (Platform.OS !== "ios") {
    // Android 或 web：不限制
    cachedHapticSupport = true;
    return true;
  }

  const modelId = Device.modelId;

  // 无法获取型号、模拟器（i386 / x86_64 / arm64）、iPad、iPod touch → 默认支持
  if (modelId == null || !modelId.startsWith("iPhone8,")) {
    cachedHapticSupport = true;
    return true;
  }

  // iPhone8,1 = iPhone 6s, iPhone8,2 = 6s Plus, iPhone8,4 = SE 1st gen
  cachedHapticSupport = false;
  return false;
}

/**
 * 是否为 iPhone 6s / 6s Plus / SE 1st gen 这一代旧款 iPhone。
 *
 * 这些机型：
 * - 没有 Home indicator
 * - iOS 15 下部分系统控件 / 滚动条视觉避让和全面屏设备明显不同
 * - 需要单独保守处理底部滚动条额外避让值
 */
export function isLegacyCompactIphone(): boolean {
  if (cachedLegacyCompactIphone !== null) return cachedLegacyCompactIphone;

  if (Platform.OS !== "ios") {
    cachedLegacyCompactIphone = false;
    return false;
  }

  const modelId = Device.modelId;
  cachedLegacyCompactIphone =
    modelId === "iPhone8,1" || modelId === "iPhone8,2" || modelId === "iPhone8,4";
  return cachedLegacyCompactIphone;
}

/**
 * iOS 26+
 */
export function isIos26Plus(): boolean {
  const major = iosMajorVersion();
  return major != null && major >= 26;
}

/**
 * iOS 16+
 */
export function isIos16Plus(): boolean {
  const major = iosMajorVersion();
  return major != null && major >= 16;
}

/**
 * iOS 15
 */
export function isIos15(): boolean {
  const major = iosMajorVersion();
  return major != null && major <= 15;
}

/**
 * 同步返回当前系统语言。
 *
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
  const appleLocale = getApplePreferredLocale();
  if (appleLocale) {
    return appleLocale;
  }

  const nativeLocale = I18nManager.getConstants().localeIdentifier?.trim();
  if (nativeLocale) {
    return nativeLocale;
  }

  try {
    return Intl.DateTimeFormat().resolvedOptions().locale || "en";
  } catch {
    return "en";
  }
}

function getApplePreferredLocale(): string | undefined {
  try {
    const settingsManager = NativeModules.SettingsManager as AppleSettingsManager | undefined;
    const settings = settingsManager?.settings ?? settingsManager?.getConstants?.().settings;
    const preferredLanguage = Array.isArray(settings?.AppleLanguages)
      ? settings.AppleLanguages.find(
          (language): language is string => typeof language === "string" && language.trim() !== "",
        )
      : undefined;
    if (preferredLanguage) {
      return preferredLanguage.trim();
    }
    return typeof settings?.AppleLocale === "string" ? settings.AppleLocale.trim() : undefined;
  } catch {
    return undefined;
  }
}

interface AppleSettings {
  AppleLanguages?: unknown;
  AppleLocale?: unknown;
}

interface AppleSettingsManager {
  settings?: AppleSettings;
  getConstants?: () => { settings?: AppleSettings };
}
