import { TrueSheet } from "@lodev09/react-native-true-sheet";

/** 全局 True Sheet 调试面板名称，需与 `TrueSheetDebugHost` 的 `name` 一致。 */
export const TRUE_SHEET_DEBUG_NAME = "lonanote-debug";

/** True Sheet 内 Tamagui Portal / Toast 挂载点，避免浮层落在 sheet 下层。 */
export const TRUE_SHEET_DEBUG_OVERLAY_PORTAL_HOST = "true-sheet-debug-overlay";

export function presentTrueSheetDebug(detentIndex = 0) {
  return TrueSheet.present(TRUE_SHEET_DEBUG_NAME, detentIndex);
}

export function dismissTrueSheetDebug() {
  return TrueSheet.dismiss(TRUE_SHEET_DEBUG_NAME);
}
