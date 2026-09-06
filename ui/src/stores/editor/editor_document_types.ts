export type EditorDocumentRef =
  | {
      kind: "workspaceFile";
      workspaceId: string;
      filePath: string;
    }
  | {
      kind: "looseFile";
      absolutePath: string;
    }
  | {
      kind: "untitled";
      initialTitle?: string;
    };

export type FileFingerprint = {
  size: number | null;
  modifiedAt: number | null;
  providerVersion?: string;
};

export type DocumentConflict = {
  detectedAt: string;
  externalFingerprint: FileFingerprint | null;
};

export type DocumentLoadState = "idle" | "loading" | "ready" | "error";
export type DocumentSaveState = "idle" | "scheduled" | "saving" | "error" | "conflict";

export type DocumentModel = {
  documentId: string;
  documentKey: string;
  ref: EditorDocumentRef;
  title: string;
  loadState: DocumentLoadState;
  loadError: string | null;
  draft: string;
  draftRevision: number;
  savedText: string;
  savedRevision: number;
  savedFingerprint: FileFingerprint | null;
  saveState: DocumentSaveState;
  saveError: string | null;
  conflict: DocumentConflict | null;
  editOwnerEditorId: string | null;
  attachedEditorIds: string[];
};

function assertNonEmptyString(value: string, field: string): string {
  if (!value.trim()) {
    throw new Error(`${field} 不能为空`);
  }
  return value;
}

function containsControlCharacter(value: string): boolean {
  for (const character of value) {
    if (character.charCodeAt(0) < 32) {
      return true;
    }
  }
  return false;
}

export function canonicalizeWorkspaceFilePath(filePath: string): string {
  if (!filePath || filePath.startsWith("/") || filePath.includes("\\")) {
    throw new Error("workspace 文件路径必须是相对路径，且不能包含反斜杠");
  }

  const segments: string[] = [];
  for (const segment of filePath.split("/")) {
    if (!segment || segment === "." || containsControlCharacter(segment)) {
      throw new Error("workspace 文件路径包含无效 segment");
    }
    if (segment === "..") {
      if (segments.length === 0) {
        throw new Error("workspace 文件路径不能越过根目录");
      }
      segments.pop();
      continue;
    }
    segments.push(segment);
  }

  if (segments.length === 0) {
    throw new Error("workspace 文件路径不能为空");
  }
  return segments.join("/");
}

export function normalizeEditorDocumentRef(ref: EditorDocumentRef): EditorDocumentRef {
  switch (ref.kind) {
    case "workspaceFile":
      return {
        kind: "workspaceFile",
        workspaceId: assertNonEmptyString(ref.workspaceId, "workspaceId"),
        filePath: canonicalizeWorkspaceFilePath(ref.filePath),
      };
    case "looseFile":
      return {
        kind: "looseFile",
        absolutePath: assertNonEmptyString(ref.absolutePath, "absolutePath"),
      };
    case "untitled":
      return {
        kind: "untitled",
        ...(ref.initialTitle?.trim() ? { initialTitle: ref.initialTitle.trim() } : {}),
      };
  }
}

export function getEditorDocumentTitle(ref: EditorDocumentRef): string {
  switch (ref.kind) {
    case "workspaceFile":
      return ref.filePath.split("/").at(-1) ?? ref.filePath;
    case "looseFile":
      return ref.absolutePath.split(/[\\/]/).filter(Boolean).at(-1) ?? ref.absolutePath;
    case "untitled":
      return ref.initialTitle ?? "未命名文档";
  }
}

export function getEditorDocumentKey(
  ref: Exclude<EditorDocumentRef, { kind: "untitled" }>,
): string {
  switch (ref.kind) {
    case "workspaceFile":
      return `workspaceFile:${encodeURIComponent(ref.workspaceId)}:${encodeURIComponent(ref.filePath)}`;
    case "looseFile":
      return `looseFile:${encodeURIComponent(ref.absolutePath)}`;
  }
}

export function isDocumentDirty(document: DocumentModel): boolean {
  return document.draftRevision !== document.savedRevision;
}
