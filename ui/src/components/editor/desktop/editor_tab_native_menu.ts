import { LogicalPosition } from "@tauri-apps/api/dpi";
import { Menu, type MenuOptions } from "@tauri-apps/api/menu";

import type { EditorTabCloseAction } from "./editor_tab_menu_actions";

export type EditorTabMenuAction =
  | EditorTabCloseAction
  | "copyPath"
  | "copyRelativePath"
  | "revealFile"
  | "revealExplorer";
export type EditorTabMenuItem = {
  action: EditorTabMenuAction;
  text: string;
  enabled: boolean;
  separatorBefore?: boolean;
};
export async function showEditorTabNativeMenu({
  items,
  x,
  y,
  isCurrent,
  execute,
  onError,
}: {
  items: EditorTabMenuItem[];
  x: number;
  y: number;
  isCurrent(): boolean;
  execute(action: EditorTabMenuAction): Promise<void>;
  onError(error: unknown): void;
}) {
  const menuItems: NonNullable<MenuOptions["items"]> = [];
  for (const item of items) {
    if (item.separatorBefore) menuItems.push({ item: "Separator" });
    menuItems.push({
      text: item.text,
      enabled: item.enabled,
      action: () => {
        if (isCurrent()) void execute(item.action).catch(onError);
      },
    });
  }
  const menu = await Menu.new({ items: menuItems });
  try {
    if (isCurrent()) await menu.popup(new LogicalPosition(x, y));
  } finally {
    await menu.close().catch(() => undefined);
  }
}
