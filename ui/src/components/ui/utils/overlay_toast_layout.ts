import { os } from "@/api/common/platform";

/**
 * Scoped overlay host 的布局补偿（Toast viewport 间距 + True Sheet 浮层底边）。
 * Toast：toastLayer 1× + Viewport `bottom`；居中 Dialog：`getTrueSheetCenteredModalLiftAmount` → content `y` 偏移（勿缩短 teleport 遮罩）。
 */

/** 与 debug True Sheet 宿主 `ScreenOverlayPortalProvider` 的 hostName 保持一致 */
export const DEBUG_OVERLAY_PORTAL_HOST = "debug-overlay";

/** Sheet / overlay 内 Toast 默认底边距（Android 等） */
export const SCOPED_TOAST_VIEWPORT_INSET = 24;

/** iOS Native Stack pageSheet 等 overlay：略抬高，避免贴 Home 条 */
export const IOS_PAGE_SHEET_TOAST_VIEWPORT_INSET = 36;

/**
 * iOS True Sheet 专用 Viewport 底边距（配合 toastLayer safe area 补偿）。
 * 仅用于 insetAdjustment 垫高布局的 True Sheet host，勿用于 Native Stack pageSheet。
 */
export const IOS_TRUE_SHEET_TOAST_VIEWPORT_INSET = 56;

const TRUE_SHEET_OVERLAY_HOSTS = new Set<string>([DEBUG_OVERLAY_PORTAL_HOST]);

/** True Sheet overlay host（`insetAdjustment="automatic"` 会垫高布局底，与 pageSheet 不同） */
export function isTrueSheetOverlayPortalHost(hostName: string): boolean {
  return TRUE_SHEET_OVERLAY_HOSTS.has(hostName);
}

/**
 * True Sheet：toastLayer 底边补偿（仅 iOS，与 Viewport bottom 分工，勿叠双份）。
 */
export function getTrueSheetOverlayLayoutBottomInset(
  hostName: string,
  safeAreaBottom: number,
): number {
  return isTrueSheetOverlayPortalHost(hostName) ? safeAreaBottom : 0;
}

/**
 * Android True Sheet 内 SafeAreaProvider 的 bottom 常为 0，但 insetAdjustment 仍会垫高 RN 布局底。
 */
export const ANDROID_TRUE_SHEET_TELEPORT_LAYER_BOTTOM_FALLBACK = 48;

/** 在 2× bottom 上额外抬高 teleport 底边，使 flex 居中 Dialog 对齐可视区域（约 +EXTRA/2 视觉） */
export const TRUE_SHEET_TELEPORT_CENTER_EXTRA_BOTTOM = 30;

/**
 * True Sheet 居中 Dialog 校正量（`insetAdjustment` 垫高导致 flex 居中偏下约 lift/2）。
 * 用于 `useTrueSheetCenteredModalContentOffsetY`，勿再作为 teleportLayer 的 `bottom`（会漏遮罩）。
 */
export function getTrueSheetCenteredModalLiftAmount(
  hostName: string,
  safeAreaBottom: number,
): number {
  if (!isTrueSheetOverlayPortalHost(hostName)) {
    return 0;
  }

  const base =
    safeAreaBottom > 0
      ? safeAreaBottom
      : os() === "android"
        ? ANDROID_TRUE_SHEET_TELEPORT_LAYER_BOTTOM_FALLBACK
        : 0;

  return base * 2 + TRUE_SHEET_TELEPORT_CENTER_EXTRA_BOTTOM;
}

/** iOS True Sheet：toastLayer 底边补偿（与 teleport 共用 inset 计算） */
export function shouldApplyIosTrueSheetToastLayerInset(hostName: string): boolean {
  return os() === "ios" && isTrueSheetOverlayPortalHost(hostName);
}

export function getScopedToastViewportBottomInset(viewportName: string | undefined): number {
  if (viewportName == null) {
    return SCOPED_TOAST_VIEWPORT_INSET;
  }

  if (os() === "ios") {
    if (isTrueSheetOverlayPortalHost(viewportName)) {
      return IOS_TRUE_SHEET_TOAST_VIEWPORT_INSET;
    }

    return IOS_PAGE_SHEET_TOAST_VIEWPORT_INSET;
  }

  return SCOPED_TOAST_VIEWPORT_INSET;
}
