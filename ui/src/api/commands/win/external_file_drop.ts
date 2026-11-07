import { invoke } from "@tauri-apps/api/core";

import { editorWindowRuntime } from "@/components/editor/controllers/editor_window_runtime";
import type { EditorDocumentRef } from "@/stores/editor";

type FileReference = Exclude<EditorDocumentRef, { kind: "untitled" }>;

export const externalFileDrop = {
  take: (token: string, sourceWindowLabel: string) =>
    invoke<FileReference[]>("take_external_file_drop", {
      token,
      sourceWindowLabel,
      ownerEpoch: editorWindowRuntime.ownerEpoch(),
    }),
  resolveReference: (absolutePath: string) =>
    invoke<FileReference>("resolve_document_open_reference", {
      absolutePath,
      ownerEpoch: editorWindowRuntime.ownerEpoch(),
    }),
};
