import { invoke } from "@tauri-apps/api/core";
import type { MenuAdapterRequest, NativeMenuRequest } from "rn-ui-kit";

import { createDesktopMenuItems } from "./desktop_menu_items";
import { serializeTauriMenuOperation } from "./tauri_menu_operations";

/** Windows/Linux 使用 WcPopup 绘制菜单，菜单动作由原生菜单返回项驱动。 */
export async function showWcPopupContextMenu(
  request: NativeMenuRequest | MenuAdapterRequest,
  colorScheme: "light" | "dark",
): Promise<void> {
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
      // Dropdown 的建议点可能是右下角；原生宿主须按菜单实际尺寸解释对齐。
      placement: "kind" in request && request.kind === "dropdown" ? request.placement : undefined,
      devicePixelRatio: window.devicePixelRatio || 1,
      // 使用应用已解析的主题，包含手动选择和跟随系统两种情况。
      darkMode: colorScheme === "dark",
    });
  });
  if (id && isCurrent()) await actions.get(id)?.();
}
