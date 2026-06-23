import { os } from "@/api/common/platform";
import { getTrueSheetPartialDetentCompensationScale } from "@/components/ui/sheet/native_sheet/true_sheet/overlay_layout_metrics";

const platform = os();

/**
 * Scoped overlay host 的布局补偿（Toast viewport 间距 + True Sheet 浮层底边）。
 * Toast：toastLayer 1× + Viewport `bottom`；居中 Dialog：`getTrueSheetCenteredModalLiftAmount` → content `y` 偏移（勿缩短 teleport 遮罩）。
 */

/** 与 debug True Sheet 宿主 `ScreenOverlayPortalProvider` 的 hostName 保持一致 */
export const DEBUG_OVERLAY_PORTAL_HOST = "debug-overlay";

/** Sheet / overlay 内 Toast 默认底边距（Android 等） */
export const SCOPED_TOAST_VIEWPORT_INSET = 24;

/**
 * 嵌套 TrueSheet 局部 detent 时，`detentVisibleOffset` 的额外上移量（px）。
 * 补偿 `sheetTopPosition` 参考点与内容区域之间的固定偏差。
 *
 * Android 端低/中 detent 的嵌套 Sheet 会比可视内容底部略低一截，
 * 这里额外抬高一档，避免 Toast 落回底部留白区。
 */
export const TRUE_SHEET_TOAST_DETENT_LIFT = platform === "ios" ? -56 : 120;

/** iOS Native Stack pageSheet 等 overlay：略抬高，避免贴 Home 条 */
export const IOS_PAGE_SHEET_TOAST_VIEWPORT_INSET = 36;

/**
 * iOS True Sheet 专用 Viewport 底边距（配合 toastLayer safe area 补偿）。
 * 仅用于 insetAdjustment 垫高布局的 True Sheet host，勿用于 Native Stack pageSheet。
 */
export const IOS_TRUE_SHEET_TOAST_VIEWPORT_INSET = 56;

const DEBUG_SECTION_OVERLAY_PORTAL_PREFIX = `${DEBUG_OVERLAY_PORTAL_HOST}:section:`;

/** True Sheet overlay host（`insetAdjustment="automatic"` 会垫高布局底，与 pageSheet 不同） */
export function isTrueSheetOverlayPortalHost(hostName: string): boolean {
  return (
    hostName === DEBUG_OVERLAY_PORTAL_HOST ||
    hostName.startsWith(DEBUG_SECTION_OVERLAY_PORTAL_PREFIX)
  );
}

/**
 * True Sheet：toastLayer 底边补偿（仅 iOS，与 Viewport bottom 分工，勿叠双份）。
 */
export function getTrueSheetOverlayLayoutBottomInset(
  hostName: string,
  safeAreaBottom: number,
  detent = 1,
): number {
  if (!isTrueSheetOverlayPortalHost(hostName)) {
    return 0;
  }

  const scale = getTrueSheetPartialDetentCompensationScale(detent);
  return Math.round(safeAreaBottom * scale);
}

/**
 * Android True Sheet 内 SafeAreaProvider 的 bottom 常为 0，但 insetAdjustment 仍会垫高 RN 布局底。
 */
export const ANDROID_TRUE_SHEET_TELEPORT_LAYER_BOTTOM_FALLBACK = 48;

/** 在 2× bottom 上额外抬高 teleport 底边，使 flex 居中 Dialog 对齐可视区域（约 +EXTRA/2 视觉） */
export const ANDROID_TRUE_SHEET_TELEPORT_CENTER_EXTRA_BOTTOM = 60;
export const IOS_TRUE_SHEET_TELEPORT_CENTER_EXTRA_BOTTOM = 12;

/**
 * True Sheet 居中 Dialog 校正量（`insetAdjustment` 垫高导致 flex 居中偏下约 lift/2）。
 * 用于 `useTrueSheetCenteredModalContentOffsetY`，勿再作为 teleportLayer 的 `bottom`（会漏遮罩）。
 */
export function getTrueSheetCenteredModalLiftAmount(
  hostName: string,
  safeAreaBottom: number,
  detent = 1,
): number {
  if (!isTrueSheetOverlayPortalHost(hostName)) {
    return 0;
  }

  const base =
    safeAreaBottom > 0
      ? safeAreaBottom
      : platform === "android"
        ? ANDROID_TRUE_SHEET_TELEPORT_LAYER_BOTTOM_FALLBACK
        : 0;

  const bottom =
    platform === "android"
      ? ANDROID_TRUE_SHEET_TELEPORT_CENTER_EXTRA_BOTTOM
      : IOS_TRUE_SHEET_TELEPORT_CENTER_EXTRA_BOTTOM;
  const scale = getTrueSheetPartialDetentCompensationScale(detent);
  return Math.round((base * 2 + bottom) * scale);
}

/** iOS True Sheet：toastLayer 底边补偿（与 teleport 共用 inset 计算） */
export function shouldApplyIosTrueSheetToastLayerInset(hostName: string): boolean {
  return platform === "ios" && isTrueSheetOverlayPortalHost(hostName);
}

export function getScopedToastViewportBottomInset(
  viewportName: string | undefined,
  detent = 1,
): number {
  if (viewportName == null) {
    return SCOPED_TOAST_VIEWPORT_INSET;
  }

  if (platform === "ios") {
    if (isTrueSheetOverlayPortalHost(viewportName)) {
      const scale = getTrueSheetPartialDetentCompensationScale(detent, 1);
      const scaleProgress = Math.min(1, Math.max(0, scale - 1));
      const inverseCurve =
        scaleProgress * (1 - scaleProgress) * (1 - scaleProgress) * (1 - scaleProgress);
      const curveStrength = 1.8;
      const scaleStrength = 1.4;
      const scale2 = 1 + curveStrength * inverseCurve;
      const s = scale2 > 1 ? scale2 * scaleStrength : 1;
      return Math.round(IOS_TRUE_SHEET_TOAST_VIEWPORT_INSET * s);
    }

    return IOS_PAGE_SHEET_TOAST_VIEWPORT_INSET;
  }

  return SCOPED_TOAST_VIEWPORT_INSET;
}
