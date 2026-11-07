import type { EditorStoreState } from "@/stores/editor/editor_store";
import type { EditorViewSession } from "@/stores/editor/editor_view_types";

export type EditorWindowLayoutSnapshot = Pick<
  EditorStoreState,
  "groupsById" | "layout" | "activeGroupId" | "activeEditorId" | "openEditorIds"
> & {
  viewStates?: Record<
    string,
    Pick<EditorViewSession, "editorState" | "preferenceOverrides" | "previewMode">
  >;
};
export function captureEditorWindowLayout(state: EditorStoreState): EditorWindowLayoutSnapshot {
  return structuredClone({
    groupsById: state.groupsById,
    layout: state.layout,
    activeGroupId: state.activeGroupId,
    activeEditorId: state.activeEditorId,
    openEditorIds: state.openEditorIds,
    viewStates: Object.fromEntries(
      state.openEditorIds.flatMap((id) => {
        const view = state.editorsById[id];
        return view
          ? [
              [
                id,
                {
                  editorState: view.editorState,
                  preferenceOverrides: view.preferenceOverrides,
                  previewMode: view.previewMode,
                },
              ],
            ]
          : [];
      }),
    ),
  });
}
export function restoreEditorWindowLayout(
  snapshot: EditorWindowLayoutSnapshot,
  validIds: string[],
): EditorWindowLayoutSnapshot {
  const allowed = new Set(validIds);
  const seen = new Set<string>();
  const groupsById = Object.fromEntries(
    Object.entries(snapshot.groupsById).map(([id, group]) => {
      const tabIds = group.tabIds.filter((tab) => {
        if (!allowed.has(tab) || seen.has(tab)) return false;
        seen.add(tab);
        return true;
      });
      return [
        id,
        {
          ...group,
          tabIds,
          activeTabId:
            group.activeTabId && tabIds.includes(group.activeTabId)
              ? group.activeTabId
              : (tabIds[0] ?? null),
        },
      ];
    }),
  );
  const groupIds = Object.keys(groupsById);
  if (!groupIds.length) throw new Error("辅助窗口布局缺少编辑组");
  const activeGroupId = groupsById[snapshot.activeGroupId] ? snapshot.activeGroupId : groupIds[0];
  groupsById[activeGroupId].tabIds.push(...validIds.filter((id) => !seen.has(id)));
  const visit = (node: EditorStoreState["layout"]): void => {
    if (node.kind === "group") {
      if (!groupsById[node.groupId]) throw new Error("辅助窗口布局引用不存在的组");
      return;
    }
    visit(node.first);
    visit(node.second);
  };
  visit(snapshot.layout);
  const active = groupsById[activeGroupId];
  if (!active.activeTabId) active.activeTabId = active.tabIds[0] ?? null;
  return {
    ...snapshot,
    groupsById,
    activeGroupId,
    activeEditorId:
      snapshot.activeEditorId && allowed.has(snapshot.activeEditorId)
        ? snapshot.activeEditorId
        : active.activeTabId,
    openEditorIds: Object.values(groupsById).flatMap((group) => group.tabIds),
  };
}
