import { LogicalPosition, PhysicalPosition } from "@tauri-apps/api/dpi";

/** WebView2 的 devicePixelRatio 同时包含系统 DPI 和页面缩放，不能将 CSS 像素直接作为窗口逻辑坐标。 */
export function resolveTauriMenuPosition(
  x: number,
  y: number,
  platform: string,
  devicePixelRatio: number,
): LogicalPosition | PhysicalPosition {
  if (platform === "windows") {
    return new PhysicalPosition(Math.round(x * devicePixelRatio), Math.round(y * devicePixelRatio));
  }
  return new LogicalPosition(x, y);
}
