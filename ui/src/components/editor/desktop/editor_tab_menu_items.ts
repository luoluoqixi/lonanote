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
