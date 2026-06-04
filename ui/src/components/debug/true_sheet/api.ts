import { router } from "expo-router";

import { dismissTrueSheet, presentTrueSheet } from "@/components/ui/true_sheet";
import { DEBUG_OVERLAY_PORTAL_HOST } from "@/components/ui/utils/overlay_toast_layout";

import { DEBUG_HOME_HREF, type DebugTabKey, getDebugFullPageHref } from "../routes";

/** 全局调试 True Sheet 名称，须与 `DebugTrueSheetHost` 的 `name` 一致。 */
export const DEBUG_TRUE_SHEET_NAME = "lonanote-debug";

export { DEBUG_OVERLAY_PORTAL_HOST };

let debugSheetOpen = false;

export function openDebugPanel(detentIndex = 0) {
  debugSheetOpen = true;
  return presentTrueSheet(DEBUG_TRUE_SHEET_NAME, detentIndex);
}

export function closeDebugPanel() {
  debugSheetOpen = false;
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
