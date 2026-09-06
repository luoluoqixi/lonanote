import type {
  EditorBridgeApplyResult,
  EditorDocumentCapturePayload,
} from "@/assets/editor/src/bridge/protocol";
import { editorStore } from "@/stores/editor";

type InputLeaseProvider = {
  captureDocument: () => Promise<EditorDocumentCapturePayload>;
  applyDocumentRevision: (revision: number, text: string) => Promise<EditorBridgeApplyResult>;
  setInputEnabled: (enabled: boolean) => Promise<EditorBridgeApplyResult>;
};

const providersByEditorId = new Map<string, InputLeaseProvider>();
const transferTasksByDocumentId = new Map<string, Promise<void>>();

function isViewEditable(editorId: string): boolean {
  const state = editorStore.getState();
  const view = state.editorsById[editorId];
  return Boolean(view && !view.readOnly && !view.previewMode);
}

function enqueueTransfer(documentId: string, task: () => Promise<void>): Promise<void> {
  const previousTask = transferTasksByDocumentId.get(documentId) ?? Promise.resolve();
  const nextTask = previousTask.catch(() => undefined).then(task);
  transferTasksByDocumentId.set(documentId, nextTask);
  void nextTask
    .finally(() => {
      if (transferTasksByDocumentId.get(documentId) === nextTask) {
        transferTasksByDocumentId.delete(documentId);
      }
    })
    .catch(() => undefined);
  return nextTask;
}

async function captureReleasedOwner(documentId: string, editorId: string): Promise<void> {
  const provider = providersByEditorId.get(editorId);
  if (!provider) return;

  const capture = await provider.captureDocument();
  const document = editorStore.getState().documentsById[documentId];
  if (!document || document.editOwnerEditorId !== editorId) return;
  if (capture.revision < document.draftRevision || capture.text === document.draft) return;

  editorStore.getState().setDocumentDraft(documentId, capture.text);
}

async function transferInputLease(editorId: string): Promise<void> {
  const state = editorStore.getState();
  const targetView = state.editorsById[editorId];
  if (!targetView || !isViewEditable(editorId)) return;

  const document = state.documentsById[targetView.documentId];
  const targetProvider = providersByEditorId.get(editorId);
  if (!document || !targetProvider || targetView.bridgeState !== "ready") return;

  const previousOwnerEditorId = document.editOwnerEditorId;
  if (previousOwnerEditorId && previousOwnerEditorId !== editorId) {
    const previousOwner = state.editorsById[previousOwnerEditorId];
    const previousProvider = providersByEditorId.get(previousOwnerEditorId);
    if (previousProvider && previousOwner?.bridgeState === "ready") {
      await previousProvider.setInputEnabled(false);
      await captureReleasedOwner(document.documentId, previousOwnerEditorId);
    } else if (previousOwner?.bridgeState === "ready") {
      throw new Error("当前 Editor 输入 lease 尚未安全释放");
    }
  }

  const latestDocument = editorStore.getState().documentsById[targetView.documentId];
  const latestTargetView = editorStore.getState().editorsById[editorId];
  if (!latestDocument || !latestTargetView || !isViewEditable(editorId)) return;

  await targetProvider.applyDocumentRevision(latestDocument.draftRevision, latestDocument.draft);
  editorStore.getState().setDocumentEditOwner(latestDocument.documentId, editorId);
  try {
    await targetProvider.setInputEnabled(true);
  } catch (error) {
    editorStore.getState().setDocumentEditOwner(latestDocument.documentId, null);
    throw error;
  }
}

export const editorInputLeaseCoordinator = {
  registerProvider: (editorId: string, provider: InputLeaseProvider): (() => void) => {
    providersByEditorId.set(editorId, provider);
    editorInputLeaseCoordinator.handleSurfaceReady(editorId);
    return () => {
      if (providersByEditorId.get(editorId) !== provider) return;
      providersByEditorId.delete(editorId);
      const view = editorStore.getState().editorsById[editorId];
      if (view?.documentId) {
        const document = editorStore.getState().documentsById[view.documentId];
        if (document?.editOwnerEditorId === editorId) {
          editorStore.getState().setDocumentEditOwner(view.documentId, null);
        }
      }
    };
  },

  requestLease: (editorId: string): Promise<void> => {
    const view = editorStore.getState().editorsById[editorId];
    if (!view) return Promise.resolve();
    return enqueueTransfer(view.documentId, () => transferInputLease(editorId));
  },

  handleSurfaceReady: (editorId: string): void => {
    if (editorStore.getState().activeEditorId === editorId) {
      void editorInputLeaseCoordinator.requestLease(editorId).catch(() => undefined);
    }
  },

  handleFocusChanged: (editorId: string, focused: boolean): void => {
    if (!focused || !isViewEditable(editorId)) return;
    editorStore.getState().setActiveEditor(editorId);
    void editorInputLeaseCoordinator.requestLease(editorId).catch(() => undefined);
  },
};
