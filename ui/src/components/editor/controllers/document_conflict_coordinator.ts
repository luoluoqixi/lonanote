import { workspaceFile } from "@/api/commands/workspace";
import type { FileFingerprint } from "@/stores/editor";
import { editorStore, isDocumentDirty } from "@/stores/editor";

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
): Promise<{ text: string; fingerprint: FileFingerprint } | null> {
  const document = editorStore.getState().documentsById[documentId];
  if (!document || document.ref.kind !== "workspaceFile") return null;

  const { workspaceId, filePath } = document.ref;
  const [text, metadata] = await Promise.all([
    workspaceFile.readText(workspaceId, filePath),
    workspaceFile.metadata(workspaceId, filePath),
  ]);
  if (
    editorStore.getState().documentsById[documentId]?.identityRevision !== document.identityRevision
  )
    return null;
  return { text, fingerprint: toFingerprint(metadata) };
}

export const documentConflictCoordinator = {
  checkForExternalChange: async (
    documentId: string,
  ): Promise<"unchanged" | "reloaded" | "conflict"> => {
    const document = editorStore.getState().documentsById[documentId];
    if (!document || document.ref.kind !== "workspaceFile" || !document.savedFingerprint) {
      return "unchanged";
    }

    const metadata = await workspaceFile.metadata(document.ref.workspaceId, document.ref.filePath);
    if (
      editorStore.getState().documentsById[documentId]?.identityRevision !==
      document.identityRevision
    )
      return "unchanged";
    const externalFingerprint = toFingerprint(metadata);
    if (isSameFingerprint(document.savedFingerprint, externalFingerprint)) return "unchanged";

    const external = await readExternalDocument(documentId);
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
