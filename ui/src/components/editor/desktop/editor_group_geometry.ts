import type { EditorLayoutNode } from "@/stores/editor/editor_group_model";

export type GroupRect = { left: number; top: number; width: number; height: number };
export type GroupDivider = {
  splitId: string;
  direction: "row" | "column";
  ratio: number;
  rect: GroupRect;
};
/** 使用同级绝对布局，拆分时不改变已有 iframe 的父节点。 */
export function getEditorGroupGeometry(layout: EditorLayoutNode) {
  const groups: Record<string, GroupRect> = {};
  const dividers: GroupDivider[] = [];
  const walk = (node: EditorLayoutNode, rect: GroupRect) => {
    if (node.kind === "group") {
      groups[node.groupId] = rect;
      return;
    }
    const ratio = Math.max(0.05, Math.min(0.95, node.ratio));
    dividers.push({ splitId: node.splitId, direction: node.direction, ratio, rect });
    if (node.direction === "row") {
      walk(node.first, { ...rect, width: rect.width * ratio });
      walk(node.second, {
        ...rect,
        left: rect.left + rect.width * ratio,
        width: rect.width * (1 - ratio),
      });
    } else {
      walk(node.first, { ...rect, height: rect.height * ratio });
      walk(node.second, {
        ...rect,
        top: rect.top + rect.height * ratio,
        height: rect.height * (1 - ratio),
      });
    }
  };
  walk(layout, { left: 0, top: 0, width: 1, height: 1 });
  return { groups, dividers };
}
