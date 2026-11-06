import { isTauri } from "@/api/common/platform";
import { type DocumentModel, editorStore } from "@/stores/editor";

export const documentLeaseId = (document: DocumentModel) =>
  `${document.documentId}:${document.identityRevision}`;

const claimsInFlight = new Map<string, Promise<void>>();
export function claimDocumentFile(document: DocumentModel): Promise<void> {
  if (!isTauri() || document.ref.kind === "untitled") return Promise.resolve();
  // 按文档串行交接身份，旧 revision 的迟到请求不能替换较新的占用。
  const task = (claimsInFlight.get(document.documentId) ?? Promise.resolve())
    .catch(() => {})
    .then(async () => {
      const { invoke } = await import("@tauri-apps/api/core");
      const current = editorStore.getState().documentsById[document.documentId];
      if (!current || current.identityRevision !== document.identityRevision) {
        throw new Error("文档身份已变化，请重试");
      }
      await invoke("claim_document_file", {
        documentId: document.documentId,
        leaseId: documentLeaseId(document),
        reference: document.ref,
      });
    })
    .finally(() => {
      if (claimsInFlight.get(document.documentId) === task)
        claimsInFlight.delete(document.documentId);
    });
  claimsInFlight.set(document.documentId, task);
  return task;
}

export async function releaseDocumentFile(leaseId: string): Promise<void> {
  if (!isTauri()) return;
  const { invoke } = await import("@tauri-apps/api/core");
  await invoke("release_document_file", { leaseId });
}

export async function releaseDocumentOwnership(documentId: string): Promise<void> {
  if (!isTauri()) return;
  const { invoke } = await import("@tauri-apps/api/core");
  await invoke("release_document_file", { documentId });
}
