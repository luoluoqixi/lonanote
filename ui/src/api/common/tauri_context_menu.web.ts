import { LogicalPosition } from "@tauri-apps/api/dpi";
import { Menu, type MenuOptions } from "@tauri-apps/api/menu";
import type { NativeMenuItem, NativeMenuRequest } from "rn-ui-kit";

/** Tauri 只负责系统菜单资源；菜单数据和平台策略由调用方决定。 */
export async function showTauriContextMenu({
  items,
  x,
  y,
  isCurrent = () => true,
}: NativeMenuRequest): Promise<void> {
  if (!isCurrent()) return;
  const convert = (entries: NativeMenuItem[]): NonNullable<MenuOptions["items"]> =>
    entries.map((item) => {
      if (item.separator) return { item: "Separator" as const };
      const common = { text: item.text, enabled: !item.disabled };
      if (item.subMenu?.length) return { ...common, items: convert(item.subMenu) };
      return {
        ...common,
        ...(item.checked === undefined ? {} : { checked: item.checked }),
        action: () => {
          if (!item.disabled && isCurrent())
            void Promise.resolve()
              .then(() => item.onSelect?.())
              .catch((error) => console.warn("原生菜单操作失败", error));
        },
      };
    });
  const menu = await Menu.new({ items: convert(items) });
  try {
    if (isCurrent()) await menu.popup(new LogicalPosition(x, y));
  } finally {
    await menu.close().catch(() => undefined);
  }
}
