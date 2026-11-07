/** 每个窗口独立维护标签组和布局，不进入全局配置同步。 */
export type EditorGroup = {
  groupId: string;
  tabIds: string[];
  activeTabId: string | null;
};

export type EditorLayoutNode =
  | { kind: "group"; groupId: string }
  | {
      kind: "split";
      splitId: string;
      direction: "row" | "column";
      ratio: number;
      first: EditorLayoutNode;
      second: EditorLayoutNode;
    };

export function getLayoutGroupIds(node: EditorLayoutNode): string[] {
  return node.kind === "group"
    ? [node.groupId]
    : [...getLayoutGroupIds(node.first), ...getLayoutGroupIds(node.second)];
}

export function splitLayoutGroup(
  node: EditorLayoutNode,
  groupId: string,
  newGroupId: string,
  direction: "row" | "column",
  splitId: string,
  placement: "before" | "after" = "after",
): EditorLayoutNode {
  if (node.kind === "group")
    return node.groupId === groupId
      ? {
          kind: "split",
          splitId,
          direction,
          ratio: 0.5,
          first: placement === "before" ? { kind: "group", groupId: newGroupId } : node,
          second: placement === "before" ? node : { kind: "group", groupId: newGroupId },
        }
      : node;
  return {
    ...node,
    first: splitLayoutGroup(node.first, groupId, newGroupId, direction, splitId, placement),
    second: splitLayoutGroup(node.second, groupId, newGroupId, direction, splitId, placement),
  };
}

export function pruneLayoutGroups(
  node: EditorLayoutNode,
  groupIds: Set<string>,
): EditorLayoutNode | null {
  if (node.kind === "group") return groupIds.has(node.groupId) ? node : null;
  const first = pruneLayoutGroups(node.first, groupIds);
  const second = pruneLayoutGroups(node.second, groupIds);
  return first && second ? { ...node, first, second } : (first ?? second);
}

export function setLayoutSplitRatio(
  node: EditorLayoutNode,
  splitId: string,
  ratio: number,
): EditorLayoutNode {
  if (node.kind === "group") return node;
  return {
    ...node,
    ratio:
      node.splitId === splitId && Number.isFinite(ratio)
        ? Math.max(0.05, Math.min(0.95, ratio))
        : node.ratio,
    first: setLayoutSplitRatio(node.first, splitId, ratio),
    second: setLayoutSplitRatio(node.second, splitId, ratio),
  };
}
