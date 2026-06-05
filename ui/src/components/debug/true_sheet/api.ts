import { TrueSheet } from "@lodev09/react-native-true-sheet";
import { router } from "expo-router";

import { dismissTrueSheet, presentTrueSheet, resizeTrueSheet } from "@/components/ui";
import { DEBUG_OVERLAY_PORTAL_HOST } from "@/components/ui/utils/overlay_toast_layout";

import {
  DEBUG_HOME_HREF,
  DEBUG_PANEL_ROUTE_DEFINITIONS,
  type DebugTabKey,
  getDebugFullPageHref,
} from "../routes";
import {
  getDebugNestedSectionDetentLevel,
  getDebugSectionsAsNestedSheets,
} from "./nested_sections_preferences";

/** 全局调试 True Sheet 名称，须与 `DebugTrueSheetHost` 的 `name` 一致。 */
export const DEBUG_TRUE_SHEET_NAME = "lonanote-debug";

export { DEBUG_OVERLAY_PORTAL_HOST };

export { DEBUG_NESTED_SECTION_SHEET_DETENTS } from "./nested_section_sheet_layout";
export {
  getDebugNestedSectionDetentLabel,
  type DebugNestedSectionDetentLevel,
} from "./nested_section_sheet_layout";
export {
  getDebugNestedSectionDetentLevel,
  getDebugSectionsAsNestedSheets,
  setDebugNestedSectionDetentLevel,
  setDebugSectionsAsNestedSheets,
  useDebugNestedSectionDetentLevel,
  useDebugSectionsAsNestedSheets,
} from "./nested_sections_preferences";

let debugSheetOpen = false;

/** 当前正在展示的分区嵌套 Sheet 集合，用于 resize 时跳过未打开的 Sheet。 */
const presentedDebugSectionSheets = new Set<DebugTabKey>();

/**
 * 分区 Sheet 关闭版本号——每次有 Sheet 关闭时递增。
 * DebugHomeScreen 用此版本号驱动 Switch key，强制 remount 原生 widget，
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

/** 调试分区嵌套 Sheet 名称，须与 `DebugSectionTrueSheetsHost` 一致。 */
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
  await dismissAllDebugSectionSheets();
  try {
    await TrueSheet.dismissStack(DEBUG_TRUE_SHEET_NAME);
  } catch {
    // 无子 Sheet 时忽略
  }
  return dismissTrueSheet(DEBUG_TRUE_SHEET_NAME);
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
