import { LogicalPosition } from "@tauri-apps/api/dpi";
import { Menu } from "@tauri-apps/api/menu";
import type { NativeMenuRequest } from "rn-ui-kit";

import { createTauriMenuOptions } from "./tauri_menu_items";

/** Tauri 只负责系统菜单资源；菜单数据和平台策略由调用方决定。 */
export async function showTauriContextMenu({
  items,
  x,
  y,
  isCurrent = () => true,
}: NativeMenuRequest): Promise<void> {
  if (!isCurrent()) return;
  const menu = await Menu.new({ items: createTauriMenuOptions(items, isCurrent) });
  try {
    if (isCurrent()) await menu.popup(new LogicalPosition(x, y));
  } finally {
    await menu.close().catch(() => undefined);
  }
}
