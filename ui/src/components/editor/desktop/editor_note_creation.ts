import { getWorkspaceEntryCreateParent } from "@/api/common/utils/workspace_entry_name";
import type { EditorDocumentRef } from "@/stores/editor/editor_document_types";

export function getQuickCreateParent(
  kind: "note" | "directory",
  ref: EditorDocumentRef | null,
  workspaceId: string,
  selected: readonly { path: string; fileType: string }[],
  currentPath = "",
): string {
  return kind === "note"
    ? getEditorNoteCreateParent(ref, workspaceId, selected)
    : getWorkspaceEntryCreateParent(selected.length === 1 ? selected[0] : undefined, currentPath);
}

export function getEditorNoteCreateParent(
  ref: EditorDocumentRef | null,
  workspaceId: string,
  selectedEntries: readonly { path: string; fileType: string }[] = [],
): string {
  const directory = selectedEntries.find((entry) => entry.fileType === "directory");
  if (directory) return directory.path;
  if (ref?.kind !== "workspaceFile" || ref.workspaceId !== workspaceId) return "";
  return getWorkspaceEntryCreateParent({ path: ref.filePath, fileType: "file" });
}
