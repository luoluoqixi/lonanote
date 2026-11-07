export const EDITOR_TAB_DRAG_TYPE = "application/x-lonanote-editor-tab";
export type EditorTabDragData = {
  editorId: string;
  windowLabel: string;
  sessionId: string;
  token: string;
};
export function parseEditorTabDragData(raw: string): EditorTabDragData | null {
  try {
    const value = JSON.parse(raw);
    return value &&
      ["editorId", "windowLabel", "sessionId", "token"].every(
        (key) =>
          typeof value[key] === "string" && value[key].length > 0 && value[key].length <= 256,
      )
      ? value
      : null;
  } catch {
    return null;
  }
}
