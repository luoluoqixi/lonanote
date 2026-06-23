import { Dimensions } from "react-native";

/**
 * Dialog 几何校正混合系数。
 */
export const TRUE_SHEET_DIALOG_DETENT_OFFSET_BLEND = 0.8;

/**
 * 部分 detent 时 RN 布局仍含 `insetAdjustment` 垫高，Toast / Dialog 补偿缩放。
 */
export function getTrueSheetPartialDetentCompensationScale(
  detent: number,
  customScale?: number,
): number {
  if (detent >= 1) {
    return 1;
  }
  const s = customScale ?? 0.75;
  const clamped = Math.min(1, Math.max(0, detent));
  return 1 + (1 - clamped) * s;
}

function getWindowHeight(): number {
  return Dimensions.get("window").height;
}

/**
 * Dialog / AlertDialog：teleport 按整窗高度居中，嵌套 Sheet 偏低 detent 时需额外上移。
 * 返回加到 Tamagui `y` 上的增量（负值 = 上移）。
 */
export function getTrueSheetCenteredModalDetentOffsetY(
  sheetTopPosition: number | null,
  detent: number,
): number {
  if (detent >= 1 || sheetTopPosition == null) {
    return 0;
  }

  const windowHeight = getWindowHeight();
  const visibleCenterY = sheetTopPosition + (windowHeight - sheetTopPosition) / 2;
  const assumedFlexCenterY = windowHeight / 2;
  const delta = visibleCenterY - assumedFlexCenterY;
  return -Math.round(delta * TRUE_SHEET_DIALOG_DETENT_OFFSET_BLEND);
}

/**
 * 嵌套 TrueSheet 局部 detent 时，Toast 所在 overlay 容器撑满完整内容高度，
 * 而 Sheet 只显示顶部 detent 比例的内容。返回 toastLayer 相对 hostStack 底部
 * 的上移量（px），使 toast 出现在可视区域底部而非完整内容底部。
 *
 * 计算依据：
 *   visibleHeight = windowHeight - sheetTopPosition
 *   fullContentHeight ≈ visibleHeight / detent
 *   hiddenBottom = fullContentHeight × (1 - detent) = visibleHeight × (1/detent - 1)
 */
export function getTrueSheetOverlayToastDetentOffset(
  sheetTopPosition: number | null,
  detent: number,
): number {
  if (detent >= 1 || sheetTopPosition == null) {
    return 0;
  }

  const windowHeight = getWindowHeight();
  const visibleHeight = windowHeight - sheetTopPosition;
  if (visibleHeight <= 0) {
    return 0;
  }

  return Math.round(visibleHeight * (1 / detent - 1));
}
