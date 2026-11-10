import { fs } from "@/api/commands/fs";
import { workspaceFile } from "@/api/commands/workspace";
import type { DocumentModel, FileFingerprint } from "@/stores/editor";
import { editorStore, isDocumentDirty } from "@/stores/editor";
import { normalizeEditorDocumentText } from "@/stores/editor/editor_document_types";

function toFingerprint(metadata: {
  size: number | null;
  modifiedAt: number | null;
}): FileFingerprint {
  return { size: metadata.size, modifiedAt: metadata.modifiedAt };
}

function isSameFingerprint(left: FileFingerprint | null, right: FileFingerprint | null): boolean {
  return (
    left?.size === right?.size &&
    left?.modifiedAt === right?.modifiedAt &&
    left?.providerVersion === right?.providerVersion
  );
}

async function readExternalDocument(
  documentId: string,
): Promise<{ text: string; fingerprint: FileFingerprint | null } | null> {
  const document = editorStore.getState().documentsById[documentId];
  if (!document || document.ref.kind === "untitled") return null;

  const [text, metadata] =
    document.ref.kind === "workspaceFile"
      ? await Promise.all([
          workspaceFile.readText(document.ref.workspaceId, document.ref.filePath),
          workspaceFile.metadata(document.ref.workspaceId, document.ref.filePath),
        ])
      : [await fs.readToString(document.ref.absolutePath), null];
  if (
    editorStore.getState().documentsById[documentId]?.identityRevision !== document.identityRevision
  )
    return null;
  return {
    text: normalizeEditorDocumentText(text),
    fingerprint: metadata ? toFingerprint(metadata) : null,
  };
}

async function fileExists(document: DocumentModel): Promise<boolean> {
  if (document.ref.kind === "workspaceFile")
    return workspaceFile.exists(document.ref.workspaceId, document.ref.filePath);
  if (document.ref.kind === "looseFile") return fs.exists(document.ref.absolutePath);
  return false;
}

export const documentConflictCoordinator = {
  checkForExternalChange: async (
    documentId: string,
  ): Promise<"unchanged" | "reloaded" | "conflict" | "missing"> => {
    const document = editorStore.getState().documentsById[documentId];
    if (!document || document.ref.kind === "untitled") {
      return "unchanged";
    }

    let external;
    try {
      if (document.ref.kind === "workspaceFile" && document.savedFingerprint) {
        const metadata = await workspaceFile.metadata(
          document.ref.workspaceId,
          document.ref.filePath,
        );
        if (isSameFingerprint(document.savedFingerprint, toFingerprint(metadata)))
          return "unchanged";
      }
      external = await readExternalDocument(documentId);
    } catch (error) {
      // 仅确认不存在时允许重新创建；权限及其他 I/O 错误仍交给调用方处理。
      if (await fileExists(document)) throw error;
      if (
        editorStore.getState().documentsById[documentId]?.identityRevision ===
        document.identityRevision
      )
        editorStore.getState().clearDocumentConflict(documentId);
      return "missing";
    }
    const latestDocument = editorStore.getState().documentsById[documentId];
    if (
      !external ||
      !latestDocument ||
      latestDocument.identityRevision !== document.identityRevision
    )
      return "unchanged";
    // metadata 变化不一定代表内容变化，先与最后成功保存的文本核对。
    if (external.text === latestDocument.savedText) {
      editorStore.getState().clearDocumentConflict(documentId, external.fingerprint);
      return "unchanged";
    }
    if (isDocumentDirty(latestDocument)) {
      editorStore.getState().setDocumentConflict(documentId, external.fingerprint);
      return "conflict";
    }

    editorStore
      .getState()
      .setDocumentPersistedSnapshot(documentId, external.text, external.fingerprint);
    return "reloaded";
  },

  keepLocal: async (documentId: string): Promise<void> => {
    const document = editorStore.getState().documentsById[documentId];
    if (!document || document.ref.kind !== "workspaceFile") return;
    const metadata = await workspaceFile.metadata(document.ref.workspaceId, document.ref.filePath);
    if (
      editorStore.getState().documentsById[documentId]?.identityRevision !==
      document.identityRevision
    )
      return;
    editorStore.getState().clearDocumentConflict(documentId, toFingerprint(metadata));
  },

  loadExternal: async (documentId: string): Promise<void> => {
    const before = editorStore.getState().documentsById[documentId];
    const external = await readExternalDocument(documentId);
    const latest = editorStore.getState().documentsById[documentId];
    if (
      !external ||
      !before ||
      !latest ||
      latest.identityRevision !== before.identityRevision ||
      latest.draftRevision !== before.draftRevision
    )
      return;
    editorStore
      .getState()
      .setDocumentPersistedSnapshot(documentId, external.text, external.fingerprint);
  },
};
