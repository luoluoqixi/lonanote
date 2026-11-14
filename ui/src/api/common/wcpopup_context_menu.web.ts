import { invoke } from "@tauri-apps/api/core";
import type { NativeMenuRequest } from "rn-ui-kit";

import { createDesktopMenuItems } from "./desktop_menu_items";
import { serializeTauriMenuOperation } from "./tauri_menu_operations";

/** Windows/Linux 使用 WcPopup 绘制菜单，菜单动作由原生菜单返回项驱动。 */
export async function showWcPopupContextMenu(request: NativeMenuRequest): Promise<void> {
  const { items, actions } = createDesktopMenuItems(request.items);
  const isCurrent = request.isCurrent ?? (() => true);
  if (!isCurrent()) return;
  let id: string | null = null;
  await serializeTauriMenuOperation(async () => {
    if (!isCurrent()) return;
    id = await invoke<string | null>("show_wcpopup_context_menu", {
      items,
      x: request.x,
      y: request.y,
      devicePixelRatio: window.devicePixelRatio || 1,
    });
  });
  if (id && isCurrent()) await actions.get(id)?.();
}
