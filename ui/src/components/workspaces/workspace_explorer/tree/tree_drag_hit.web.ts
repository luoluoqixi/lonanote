import type { View } from "react-native";

import type { TreeDragBounds } from "./tree_drag_model";

export function readTreeDragBounds(view: View | null): TreeDragBounds | null {
  const node = view as unknown as HTMLElement | null;
  if (!node?.getBoundingClientRect || !node.clientHeight) return null;
  const bounds = node.getBoundingClientRect();
  return {
    left: bounds.left,
    top: bounds.top,
    width: bounds.width,
    height: bounds.height,
    scaleY: bounds.height / node.clientHeight,
  };
}

export function canStartTreeDrag(x: number, y: number, path: string): boolean {
  const target = document.elementFromPoint(x, y);
  const row = target?.closest("[role=treeitem]");
  if (!row || row.id !== `workspace-tree-${encodeURIComponent(path)}`) return false;
  const control = target?.closest("button,a,[role=button],[role=menu],input,textarea,select");
  return !control || !row.contains(control);
}

/** 命中 iframe 时浏览器返回 iframe 本身，仍可沿宿主节点找到编辑区。 */
export function isTreeEditorDrop(x: number, y: number): boolean {
  return Boolean(document.elementFromPoint(x, y)?.closest("#desktop-editor-area"));
}
