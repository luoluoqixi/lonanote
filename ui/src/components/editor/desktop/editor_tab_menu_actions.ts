import { type EditorDocumentRef, type EditorStoreState, isDocumentDirty } from "@/stores/editor";

type TabState = Pick<
  EditorStoreState,
  "openEditorIds" | "editorsById" | "documentsById" | "viewersById"
> & { groupsById?: Record<string, { tabIds: string[] }> };
export type EditorTabCloseAction =
  | "close"
  | "closeOthers"
  | "closeRight"
  | "closeSaved"
  | "closeAll";
export function getEditorTabRef(id: string, state: TabState): EditorDocumentRef | null {
  const editor = state.editorsById[id];
  return (
    state.viewersById[id]?.ref ??
    (editor ? state.documentsById[editor.documentId]?.ref : null) ??
    null
  );
}
export function getEditorTabCloseTargets(
  action: EditorTabCloseAction,
  id: string,
  state: TabState,
): string[] {
  const ids =
    Object.values(state.groupsById ?? {}).find((group) => group.tabIds.includes(id))?.tabIds ??
    state.openEditorIds;
  const index = ids.indexOf(id);
  if (index < 0) return [];
  switch (action) {
    case "close":
      return [id];
    case "closeOthers":
      return ids.filter((other) => other !== id);
    case "closeRight":
      return ids.slice(index + 1);
    case "closeAll":
      return [...ids];
    case "closeSaved":
      return ids.filter((other) => {
        const editor = state.editorsById[other];
        const document = editor ? state.documentsById[editor.documentId] : null;
        return !!state.viewersById[other] || (!!document && !isDocumentDirty(document));
      });
  }
}
