import { os } from "@/api/common/platform";

/** 与 true_sheet_debug.ts 中 TRUE_SHEET_DEBUG_OVERLAY_PORTAL_HOST 保持一致 */
export const TRUE_SHEET_DEBUG_OVERLAY_PORTAL_HOST = "true-sheet-debug-overlay";

/** 与 debug/_layout.tsx 中 DEBUG_SCREEN_OVERLAY_PORTAL_HOST 保持一致 */
export const DEBUG_SCREEN_OVERLAY_PORTAL_HOST = "debug-screen-overlay";

/** Sheet / overlay 内 Toast 默认底边距（Android 等） */
export const SCOPED_TOAST_VIEWPORT_INSET = 24;

/** iOS Native Stack pageSheet 等 overlay：略抬高，避免贴 Home 条 */
export const IOS_PAGE_SHEET_TOAST_VIEWPORT_INSET = 36;

/**
 * iOS True Sheet 专用 Viewport 底边距（配合 toastLayer safe area 补偿）。
 * 仅用于 insetAdjustment 垫高布局的 True Sheet host，勿用于 Native Stack pageSheet。
 */
export const IOS_TRUE_SHEET_TOAST_VIEWPORT_INSET = 56;

const IOS_TRUE_SHEET_TOAST_HOSTS = new Set<string>([TRUE_SHEET_DEBUG_OVERLAY_PORTAL_HOST]);

/** iOS True Sheet：`insetAdjustment="automatic"` 会把 safe area 叠进布局高度，toastLayer 需上移 */
export function shouldApplyIosTrueSheetToastLayerInset(hostName: string): boolean {
  return os() === "ios" && IOS_TRUE_SHEET_TOAST_HOSTS.has(hostName);
}

export function getScopedToastViewportBottomInset(
  viewportName: string | undefined,
): number {
  if (viewportName == null) {
    return SCOPED_TOAST_VIEWPORT_INSET;
  }

  if (os() === "ios") {
    if (IOS_TRUE_SHEET_TOAST_HOSTS.has(viewportName)) {
      return IOS_TRUE_SHEET_TOAST_VIEWPORT_INSET;
    }

    return IOS_PAGE_SHEET_TOAST_VIEWPORT_INSET;
  }

  return SCOPED_TOAST_VIEWPORT_INSET;
}
