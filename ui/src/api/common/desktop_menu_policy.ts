/** 移动模式保留平台默认菜单；桌面模式仅 macOS 使用原生菜单。 */
export function resolveDesktopContextMenuNative(
  layoutMode: "desktop" | "mobile",
  platform: string,
): boolean | undefined {
  return layoutMode === "desktop" ? platform === "macos" : undefined;
}
