/** 按系统保留独立开关；设为 true 时使用保留的 rn-ui-kit 自定义菜单。 */
export const DESKTOP_CUSTOM_CONTEXT_MENU = {
  windows: false,
  macos: false,
  linux: false,
} satisfies Record<string, boolean>;

/** 仅桌面系统启用 Tauri 菜单；移动布局沿用原来的平台行为。 */
export function resolveDesktopContextMenuNative(
  layoutMode: "desktop" | "mobile",
  platform: string,
  useCustomMenu = DESKTOP_CUSTOM_CONTEXT_MENU[platform as keyof typeof DESKTOP_CUSTOM_CONTEXT_MENU],
): boolean | undefined {
  if (layoutMode !== "desktop") return undefined;
  return ["windows", "macos", "linux"].includes(platform) && !useCustomMenu;
}
