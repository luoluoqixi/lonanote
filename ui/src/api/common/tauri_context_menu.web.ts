import { Menu } from "@tauri-apps/api/menu";
import type { MenuAdapterSession, NativeMenuRequest } from "rn-ui-kit";

import { os } from "./platform";
import { createTauriMenuOptions } from "./tauri_menu_items";
import { serializeTauriMenuOperation } from "./tauri_menu_operations";
import { resolveTauriMenuPosition } from "./tauri_menu_position";

/** Tauri popup 只确认已经显示；没有关闭事件时由 adapter session 持有资源。 */
export async function openTauriContextMenu({
  items,
  x,
  y,
  isCurrent = () => true,
}: NativeMenuRequest): Promise<MenuAdapterSession> {
  return serializeTauriMenuOperation(async () => {
    if (!isCurrent()) return {};
    const menu = await Menu.new({ items: createTauriMenuOptions(items, isCurrent) });
    let disposed = false;
    const dispose = async () => {
      if (disposed) return;
      disposed = true;
      await menu.close();
    };
    try {
      if (isCurrent()) {
        await menu.popup(resolveTauriMenuPosition(x, y, os(), window.devicePixelRatio));
        return { dispose };
      }
      await dispose();
      return {};
    } catch (error) {
      await dispose().catch(() => undefined);
      throw error;
    }
  });
}

/** Tauri 只负责系统菜单资源；菜单数据和平台策略由调用方决定。 */
export async function showTauriContextMenu({
  items,
  x,
  y,
  isCurrent = () => true,
}: NativeMenuRequest): Promise<void> {
  return serializeTauriMenuOperation(async () => {
    if (!isCurrent()) return;
    const menu = await Menu.new({ items: createTauriMenuOptions(items, isCurrent) });
    try {
      if (isCurrent())
        await menu.popup(resolveTauriMenuPosition(x, y, os(), window.devicePixelRatio));
    } finally {
      await menu.close().catch(() => undefined);
    }
  });
}
