import { TrueSheet } from "@lodev09/react-native-true-sheet";

import { TRUE_SHEET_DEBUG_OVERLAY_PORTAL_HOST } from "@/components/ui/utils/overlay_toast_layout";

/** 全局 True Sheet 调试面板名称，需与 `TrueSheetDebugHost` 的 `name` 一致。 */
export const TRUE_SHEET_DEBUG_NAME = "lonanote-debug";

export { TRUE_SHEET_DEBUG_OVERLAY_PORTAL_HOST };

export function presentTrueSheetDebug(detentIndex = 0) {
  return TrueSheet.present(TRUE_SHEET_DEBUG_NAME, detentIndex);
}

export function dismissTrueSheetDebug() {
  return TrueSheet.dismiss(TRUE_SHEET_DEBUG_NAME);
}
