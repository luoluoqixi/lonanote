import type { DocumentModel } from "@/stores/editor/editor_document_types";
import type { EditorViewSession } from "@/stores/editor/editor_view_types";

export function getDocumentSaveCapabilities(
  document: DocumentModel,
  view: Pick<EditorViewSession, "readOnly" | "previewMode">,
  platform: "tauri" | "native",
): { canSave: boolean; canAutoSave: boolean } {
  const canSave =
    !view.readOnly &&
    !view.previewMode &&
    document.loadState === "ready" &&
    !document.conflict &&
    (document.ref.kind !== "looseFile" || platform === "tauri");
  return { canSave, canAutoSave: canSave && document.ref.kind !== "untitled" };
}
