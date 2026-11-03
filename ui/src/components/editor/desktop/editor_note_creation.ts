import { getWorkspaceEntryCreateParent } from "@/api/common/utils/workspace_entry_name";
import type { EditorDocumentRef } from "@/stores/editor/editor_document_types";

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
