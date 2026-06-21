import { TrueSheet } from "@lodev09/react-native-true-sheet";
import { router } from "expo-router";
import { useSyncExternalStore } from "react";

import { dismissTrueSheet, presentTrueSheet, resizeTrueSheet } from "@/components/ui";
import { DEBUG_OVERLAY_PORTAL_HOST } from "@/components/ui/utils/overlay_toast_layout";

import { DEBUG_HOME_HREF, type DebugTabKey, getDebugFullPageHref } from "./routes";

/** 嵌套分区 True Sheet 三档高度（与 `presentTrueSheet` 的 detentIndex 一一对应）。 */
export const DEBUG_NESTED_SECTION_SHEET_DETENTS = [0.5, 0.75, 1] as const;

export type DebugNestedSectionDetentLevel = 0 | 1 | 2;

export const DEBUG_NESTED_SECTION_DETENT_LEVEL_MIN = 0 satisfies DebugNestedSectionDetentLevel;
export const DEBUG_NESTED_SECTION_DETENT_LEVEL_MAX = 2 satisfies DebugNestedSectionDetentLevel;

const DEBUG_NESTED_SECTION_DETENT_LABELS = ["偏低 (50%)", "中等 (75%)", "全屏 (100%)"] as const;

function clampDebugNestedSectionDetentLevel(level: number): DebugNestedSectionDetentLevel {
  const rounded = Math.round(level);

  if (rounded <= DEBUG_NESTED_SECTION_DETENT_LEVEL_MIN) {
    return DEBUG_NESTED_SECTION_DETENT_LEVEL_MIN;
  }

  if (rounded >= DEBUG_NESTED_SECTION_DETENT_LEVEL_MAX) {
    return DEBUG_NESTED_SECTION_DETENT_LEVEL_MAX;
  }

  return rounded as DebugNestedSectionDetentLevel;
}

export function getDebugNestedSectionDetentLabel(level: DebugNestedSectionDetentLevel): string {
  return DEBUG_NESTED_SECTION_DETENT_LABELS[level];
}

let debugSectionsAsNestedSheets = false;
let debugNestedSectionDetentLevel: DebugNestedSectionDetentLevel = 0;
const preferenceListeners = new Set<() => void>();

function emitNestedSectionsPreferenceChange() {
  for (const listener of preferenceListeners) {
    listener();
  }
}

export function getDebugSectionsAsNestedSheets() {
  return debugSectionsAsNestedSheets;
}

export function setDebugSectionsAsNestedSheets(enabled: boolean) {
  if (debugSectionsAsNestedSheets === enabled) {
    return;
  }

  debugSectionsAsNestedSheets = enabled;
  emitNestedSectionsPreferenceChange();
}

export function getDebugNestedSectionDetentLevel(): DebugNestedSectionDetentLevel {
  return debugNestedSectionDetentLevel;
}

export function setDebugNestedSectionDetentLevel(level: number) {
  const clamped = clampDebugNestedSectionDetentLevel(level);

  if (debugNestedSectionDetentLevel === clamped) {
    return;
  }

  debugNestedSectionDetentLevel = clamped;
  emitNestedSectionsPreferenceChange();
}

function subscribeDebugSectionsPreference(listener: () => void) {
  preferenceListeners.add(listener);

  return () => {
    preferenceListeners.delete(listener);
  };
}

export function useDebugSectionsAsNestedSheets() {
  return useSyncExternalStore(
    subscribeDebugSectionsPreference,
    getDebugSectionsAsNestedSheets,
    getDebugSectionsAsNestedSheets,
  );
}

export function useDebugNestedSectionDetentLevel() {
  return useSyncExternalStore(
    subscribeDebugSectionsPreference,
    getDebugNestedSectionDetentLevel,
    getDebugNestedSectionDetentLevel,
  );
}

/** 全局调试 True Sheet 名称，须与 `DebugTrueSheetHost` 的 `name` 一致。 */
export const DEBUG_TRUE_SHEET_NAME = "lonanote-debug";

let debugSheetOpen = false;

/** 当前正在展示的分区嵌套 Sheet 集合，用于 resize 时跳过未打开的 Sheet。 */
const presentedDebugSectionSheets = new Set<DebugTabKey>();

/**
 * 分区 Sheet 关闭版本号——每次有 Sheet 关闭时递增。
 * DebugHomePage 用此版本号驱动 Switch key，强制 remount 原生 widget，
 * 解决 Android 上原生 modal 关闭后 Switch 视觉状态不一致的问题。
 */
let debugSectionSheetDismissVersion = 0;
const dismissVersionListeners = new Set<() => void>();

function emitDismissVersionChange() {
  for (const listener of dismissVersionListeners) {
    listener();
  }
}

export function getDebugSectionSheetDismissVersion() {
  return debugSectionSheetDismissVersion;
}

export function subscribeDebugSectionSheetDismiss(listener: () => void) {
  dismissVersionListeners.add(listener);

  return () => {
    dismissVersionListeners.delete(listener);
  };
}

/** 调试分区嵌套 Sheet 名称，须与 `DebugSectionSheets` 一致。 */
export function getDebugSectionSheetName(key: DebugTabKey) {
  return `lonanote-debug-section-${key}`;
}

/** 嵌套分区 Sheet 各自独立的 overlay portal，避免与主调试 Sheet 共用 host 导致 iOS 内容区异常。 */
export function getDebugSectionOverlayPortalHost(key: DebugTabKey) {
  return `${DEBUG_OVERLAY_PORTAL_HOST}:section:${key}`;
}

export async function openDebugSectionSheet(key: DebugTabKey, detentIndex = 0) {
  await presentTrueSheet(getDebugSectionSheetName(key), detentIndex);
  presentedDebugSectionSheets.add(key);
}

export async function closeDebugSectionSheet(key: DebugTabKey) {
  presentedDebugSectionSheets.delete(key);
  await dismissTrueSheet(getDebugSectionSheetName(key));
}

/** Sheet 已被原生关闭后（拖拽/手势），仅清理追踪集合，不再重复 dismiss。 */
export function cleanupDebugSectionSheet(key: DebugTabKey) {
  presentedDebugSectionSheets.delete(key);
  debugSectionSheetDismissVersion += 1;
  emitDismissVersionChange();
}

/** 已打开的嵌套分区 Sheet 切换到指定 detent（调试滑条实时改高度）。 */
export async function resizeDebugSectionSheets(
  detentIndex: number = getDebugNestedSectionDetentLevel(),
) {
  const presentedKeys = [...presentedDebugSectionSheets];

  if (presentedKeys.length === 0) {
    return;
  }

  await Promise.all(
    presentedKeys.map((key) =>
      resizeTrueSheet(getDebugSectionSheetName(key), detentIndex).catch(() => undefined),
    ),
  );
}

async function dismissAllDebugSectionSheets() {
  if (presentedDebugSectionSheets.size === 0) {
    return;
  }

  await Promise.all(
    [...presentedDebugSectionSheets].map((key) =>
      dismissTrueSheet(getDebugSectionSheetName(key)).catch(() => undefined),
    ),
  );
  presentedDebugSectionSheets.clear();
}

/** 开关开启时：以独立/嵌套 True Sheet 打开分区。 */
export async function openDebugSection(key: DebugTabKey) {
  if (!getDebugSectionsAsNestedSheets()) {
    return false;
  }

  await openDebugSectionSheet(key, getDebugNestedSectionDetentLevel());
  return true;
}

export function openDebugPanel(detentIndex = 0) {
  debugSheetOpen = true;
  return presentTrueSheet(DEBUG_TRUE_SHEET_NAME, detentIndex);
}

export async function closeDebugPanel() {
  debugSheetOpen = false;
  await dismissAllDebugSectionSheets().catch(() => undefined);
  await TrueSheet.dismissStack(DEBUG_TRUE_SHEET_NAME).catch(() => undefined);
  await dismissTrueSheet(DEBUG_TRUE_SHEET_NAME);
}

export function markDebugPanelClosed() {
  debugSheetOpen = false;
}

export async function toggleDebugPanel() {
  if (debugSheetOpen) {
    await closeDebugPanel();
    return;
  }

  await openDebugPanel();
}

/** 关闭 True Sheet 并进入全屏 Stack 调试首页。 */
export async function switchDebugPanelToFullPage() {
  await closeDebugPanel();
  router.push(DEBUG_HOME_HREF);
}

/** 关闭 True Sheet 并打开全屏 Stack 调试分区。 */
export async function openDebugFullPageSection(key: DebugTabKey) {
  if (getDebugSectionsAsNestedSheets()) {
    await openDebugSectionSheet(key, getDebugNestedSectionDetentLevel());
    return;
  }

  await closeDebugPanel();
  router.push(getDebugFullPageHref(key));
}

/** 从全屏 Stack 调试页回到 True Sheet 调试面板。 */
export async function switchDebugPanelToTrueSheet() {
  if (router.canGoBack()) {
    router.back();
  }

  await openDebugPanel();
}
