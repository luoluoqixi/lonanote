import type { MenuOptions } from "@tauri-apps/api/menu";
import type { NativeMenuItem } from "rn-ui-kit";

export type TauriMenuItem = NativeMenuItem & {
  predefined?: "Cut" | "Copy" | "Paste";
  subMenu?: TauriMenuItem[];
};

/** 只识别编辑器明确声明的动作 ID，不根据菜单文案猜测系统行为。 */
export function editorPredefinedItem(value: string): TauriMenuItem["predefined"] {
  if (value === "cut") return "Cut";
  if (value === "copy") return "Copy";
  if (value === "paste") return "Paste";
  return undefined;
}

export function createTauriMenuOptions(
  items: TauriMenuItem[],
  isCurrent: () => boolean,
): NonNullable<MenuOptions["items"]> {
  return items.map((item) => {
    if (item.separator) return { item: "Separator" as const };
    const common = { text: item.text, enabled: !item.disabled };
    if (item.subMenu?.length)
      return { ...common, items: createTauriMenuOptions(item.subMenu, isCurrent) };
    // Tauri 预定义项不支持 enabled。禁用项走普通菜单，保留只读和空选区限制。
    if (item.predefined && !item.disabled) return { item: item.predefined, text: item.text };
    return {
      ...common,
      ...(item.checked === undefined ? {} : { checked: item.checked }),
      action: async () => {
        if (!item.disabled && isCurrent()) {
          try {
            await item.onSelect?.();
          } catch (error) {
            console.warn("原生菜单操作失败", error);
          }
        }
      },
    };
  });
}
