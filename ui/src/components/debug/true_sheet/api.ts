import { TrueSheet } from "@lodev09/react-native-true-sheet";
import { router } from "expo-router";

import { dismissTrueSheet, presentTrueSheet } from "@/components/ui";
import { DEBUG_OVERLAY_PORTAL_HOST } from "@/components/ui/utils/overlay_toast_layout";

import {
  DEBUG_HOME_HREF,
  DEBUG_PANEL_ROUTE_DEFINITIONS,
  type DebugTabKey,
  getDebugFullPageHref,
} from "../routes";
import { getDebugSectionsAsNestedSheets } from "./nested_sections_preferences";

/** 全局调试 True Sheet 名称，须与 `DebugTrueSheetHost` 的 `name` 一致。 */
export const DEBUG_TRUE_SHEET_NAME = "lonanote-debug";

export { DEBUG_OVERLAY_PORTAL_HOST };

export {
  getDebugSectionsAsNestedSheets,
  setDebugSectionsAsNestedSheets,
} from "./nested_sections_preferences";
export { useDebugSectionsAsNestedSheets } from "./nested_sections_preferences";

let debugSheetOpen = false;

/** 调试分区嵌套 Sheet 名称，须与 `DebugSectionTrueSheetsHost` 一致。 */
export function getDebugSectionSheetName(key: DebugTabKey) {
  return `lonanote-debug-section-${key}`;
}

/** 嵌套分区 Sheet 各自独立的 overlay portal，避免与主调试 Sheet 共用 host 导致 iOS 内容区异常。 */
export function getDebugSectionOverlayPortalHost(key: DebugTabKey) {
  return `${DEBUG_OVERLAY_PORTAL_HOST}:section:${key}`;
}

export function openDebugSectionSheet(key: DebugTabKey, detentIndex = 0) {
  return presentTrueSheet(getDebugSectionSheetName(key), detentIndex);
}

export function closeDebugSectionSheet(key: DebugTabKey) {
  return dismissTrueSheet(getDebugSectionSheetName(key));
}

async function dismissAllDebugSectionSheets() {
  await Promise.all(
    DEBUG_PANEL_ROUTE_DEFINITIONS.map((definition) =>
      dismissTrueSheet(getDebugSectionSheetName(definition.key)).catch(() => undefined),
    ),
  );
}

/** 开关开启时：以独立/嵌套 True Sheet 打开分区。 */
export async function openDebugSection(key: DebugTabKey) {
  if (!getDebugSectionsAsNestedSheets()) {
    return false;
  }

  await openDebugSectionSheet(key);
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
    await openDebugSectionSheet(key);
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
