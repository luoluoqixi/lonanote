/** 缺省时 macOS 使用系统菜单，Windows/Linux 使用应用菜单。 */
export function getDefaultDesktopContextMenuStyle(platform: string): "system" | "app" {
  return platform === "windows" || platform === "linux" ? "app" : "system";
}

/** 桌面右键菜单优先采用显式外观设置；移动布局沿用平台默认行为。 */
export function resolveDesktopContextMenuNative(
  layoutMode: "desktop" | "mobile",
  platform: string,
  style: "system" | "app" = getDefaultDesktopContextMenuStyle(platform),
): boolean | undefined {
  if (layoutMode !== "desktop") return undefined;
  return resolveDesktopMenuBackend(platform) !== undefined && style === "system";
}

/** 底层菜单库仅由宿主按平台选择，不向用户暴露。 */
export function resolveDesktopMenuBackend(platform: string): "wcpopup" | "tauri" | undefined {
  if (platform === "windows" || platform === "linux") return "wcpopup";
  if (platform === "macos") return "tauri";
  return undefined;
}
