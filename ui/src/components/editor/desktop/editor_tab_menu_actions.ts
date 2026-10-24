import { type EditorDocumentRef, type EditorStoreState, isDocumentDirty } from "@/stores/editor";

type TabState = Pick<
  EditorStoreState,
  "openEditorIds" | "editorsById" | "documentsById" | "viewersById"
>;
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
  const index = state.openEditorIds.indexOf(id);
  if (index < 0) return [];
  switch (action) {
    case "close":
      return [id];
    case "closeOthers":
      return state.openEditorIds.filter((other) => other !== id);
    case "closeRight":
      return state.openEditorIds.slice(index + 1);
    case "closeAll":
      return [...state.openEditorIds];
    case "closeSaved":
      return state.openEditorIds.filter((other) => {
        const editor = state.editorsById[other];
        const document = editor ? state.documentsById[editor.documentId] : null;
        return !!state.viewersById[other] || (!!document && !isDocumentDirty(document));
      });
  }
}
