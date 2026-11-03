import type { ContextMenuItemData } from "rn-ui-kit";

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

export function toEditorTabContextMenuItems(
  items: EditorTabMenuItem[],
  isCurrent: () => boolean,
  execute: (action: EditorTabMenuAction) => Promise<void>,
  onError: (error: unknown) => void,
): ContextMenuItemData[] {
  return items.flatMap((item) => [
    ...(item.separatorBefore ? [{ value: `separator-${item.action}`, separator: true }] : []),
    {
      value: item.action,
      label: item.text,
      disabled: !item.enabled,
      onSelect: () => {
        if (isCurrent() && item.enabled) void execute(item.action).catch(onError);
      },
    },
  ]);
}
