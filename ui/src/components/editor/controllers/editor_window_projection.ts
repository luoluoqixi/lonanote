import {
  type TextChange,
  applyTextChange,
  textChange,
} from "@/assets/editor/src/bridge/text_change";
import type { DocumentModel, EditorViewSession } from "@/stores/editor";

export type EditorWindowProjectionState = {
  document: DocumentModel;
  editor: EditorViewSession;
  historyStatus?: { canUndo: boolean; canRedo: boolean };
};
export type EditorWindowProjectionMessage =
  | { kind: "checkpoint"; projection: EditorWindowProjectionState }
  | {
      kind: "incremental";
      documentId: string;
      baseRevision: number;
      document: Omit<DocumentModel, "draft" | "savedText">;
      editor: EditorViewSession;
      change?: TextChange;
      savedTextChange?: TextChange;
      historyStatus?: { canUndo: boolean; canRedo: boolean };
    };
/** 首次附加/纠正缺口使用checkpoint；连续投影不重复传输全文。 */
export function createEditorWindowProjection(
  previous: EditorWindowProjectionState | undefined,
  next: EditorWindowProjectionState,
): EditorWindowProjectionMessage {
  if (
    !previous ||
    previous.document.documentId !== next.document.documentId ||
    previous.editor.editorId !== next.editor.editorId
  )
    return { kind: "checkpoint", projection: next };
  const { draft, savedText, ...document } = next.document;
  return {
    kind: "incremental",
    documentId: document.documentId,
    baseRevision: previous.document.draftRevision,
    document,
    editor: next.editor,
    ...(draft !== previous.document.draft
      ? { change: textChange(previous.document.draft, draft) }
      : {}),
    ...(savedText !== previous.document.savedText
      ? { savedTextChange: textChange(previous.document.savedText, savedText) }
      : {}),
    ...(next.historyStatus ? { historyStatus: next.historyStatus } : {}),
  };
}
export function applyEditorWindowProjection(
  previous: EditorWindowProjectionState | undefined,
  message: EditorWindowProjectionMessage,
): EditorWindowProjectionState {
  if (message.kind === "checkpoint") return message.projection;
  if (
    !previous ||
    previous.document.documentId !== message.documentId ||
    previous.editor.editorId !== message.editor.editorId ||
    previous.document.draftRevision !== message.baseRevision ||
    message.document.draftRevision < message.baseRevision ||
    message.document.identityRevision < previous.document.identityRevision
  )
    throw new Error("文档投影存在修订缺口，请请求checkpoint");
  const draft = message.change
    ? applyTextChange(previous.document.draft, message.change)
    : previous.document.draft;
  const savedText = message.savedTextChange
    ? applyTextChange(previous.document.savedText, message.savedTextChange)
    : previous.document.savedText;
  return {
    document: { ...message.document, draft, savedText },
    editor: message.editor,
    ...(message.historyStatus ? { historyStatus: message.historyStatus } : {}),
  };
}
