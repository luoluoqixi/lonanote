import type { DropdownItemData } from "rn-ui-kit";

export type EditorMenuRequest = {
  sequence: number;
  x: number;
  y: number;
  items: DropdownItemData[];
  isCurrent(): boolean;
  restoreFocus?(): void | Promise<void>;
};
export type EditorMenuPopupProps = {
  request: EditorMenuRequest | null;
  onDismiss(): void;
};
