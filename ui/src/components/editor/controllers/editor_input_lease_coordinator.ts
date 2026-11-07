import type {
  EditorBridgeApplyResult,
  EditorDocumentCapturePayload,
} from "@/assets/editor/src/bridge/protocol";
import { editorStore } from "@/stores/editor";

import { documentHistoryService } from "./document_history";

export type InputLeaseProvider = {
  captureDocument: () => Promise<EditorDocumentCapturePayload>;
  applyDocumentRevision: (revision: number, text: string) => Promise<EditorBridgeApplyResult>;
  blur: () => Promise<void>;
  setInputEnabled: (
    enabled: boolean,
    leaseToken?: string,
    identityRevision?: number,
  ) => Promise<EditorBridgeApplyResult>;
};

let leaseSequence = 0;
const suspended = new Map<string, number>();

const providersByEditorId = new Map<string, InputLeaseProvider>();
const transferTasksByDocumentId = new Map<string, Promise<void>>();
// 只保留最新用户意图；旧申请跨 bridge 等待返回后不能再次启用旧分屏。
const latestRequests = new Map<string, object>();

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
  if (!provider) throw new Error("输入持有者不可达，草稿尚未接管");

  const capture = await provider.captureDocument();
  if (capture.composing) throw new Error("请完成当前输入法 composition 后重试");
  const document = editorStore.getState().documentsById[documentId];
  if (!document || document.editOwnerEditorId !== editorId) return;
  if (capture.text === document.draft) return;
  if (capture.revision < document.draftRevision) throw new Error("capture修订过期，保留草稿并重试");
  documentHistoryService.capture(documentId, editorId, capture.text);
}

async function transferInputLease(
  editorId: string,
  restore = false,
  isCurrent = () => true,
): Promise<void> {
  if (!isCurrent()) return;
  const state = editorStore.getState();
  const targetView = state.editorsById[editorId];
  if (!targetView || !isViewEditable(editorId) || suspended.has(targetView.documentId)) return;

  const document = state.documentsById[targetView.documentId];
  const targetProvider = providersByEditorId.get(editorId);
  if (!document || !targetProvider || targetView.bridgeState !== "ready") return;

  const previousOwnerEditorId = document.editOwnerEditorId;
  if (previousOwnerEditorId === editorId && !restore) return;
  if (previousOwnerEditorId && previousOwnerEditorId !== editorId) {
    const previousOwner = state.editorsById[previousOwnerEditorId];
    const previousProvider = providersByEditorId.get(previousOwnerEditorId);
    if (previousProvider && previousOwner?.bridgeState === "ready") {
      const frozen = await previousProvider.setInputEnabled(false);
      if (!frozen.applied) throw new Error("输入法 composition 尚未结束");
      await captureReleasedOwner(document.documentId, previousOwnerEditorId);
    } else {
      throw new Error("当前 Editor 输入 lease 尚未安全释放");
    }
  }

  const latestDocument = editorStore.getState().documentsById[targetView.documentId];
  const latestTargetView = editorStore.getState().editorsById[editorId];
  if (!latestDocument || !latestTargetView || !isViewEditable(editorId) || !isCurrent()) return;

  await targetProvider.applyDocumentRevision(latestDocument.draftRevision, latestDocument.draft);
  if (suspended.has(latestDocument.documentId) || !isCurrent()) return;
  editorStore.getState().setDocumentEditOwner(latestDocument.documentId, editorId);
  try {
    const token =
      globalThis.crypto?.randomUUID?.() ??
      `lease-${Date.now()}-${++leaseSequence}-${Math.random().toString(36).slice(2)}`;
    documentHistoryService.grant(latestDocument.documentId, editorId, token);
    const enabled = await targetProvider.setInputEnabled(
      true,
      token,
      latestDocument.identityRevision,
    );
    if (!enabled.applied) throw new Error("Editor 未确认输入 lease");
  } catch (error) {
    editorStore.getState().setDocumentEditOwner(latestDocument.documentId, null);
    throw error;
  }
}

export const editorInputLeaseCoordinator = {
  suspendDocuments: async (documentIds: string[]): Promise<() => Promise<void>> => {
    for (const id of documentIds) suspended.set(id, (suspended.get(id) ?? 0) + 1);
    let resumed = false;
    const resume = async () => {
      if (resumed) return;
      resumed = true;
      for (const id of documentIds) {
        const count = (suspended.get(id) ?? 1) - 1;
        if (count) suspended.set(id, count);
        else suspended.delete(id);
      }
      const state = editorStore.getState();
      // 已销毁的 view 不再保留 bridge provider，也不能重新获取输入权。
      for (const id of providersByEditorId.keys())
        if (!state.editorsById[id]) providersByEditorId.delete(id);
      const owners = new Set(
        documentIds
          .map((id) => state.documentsById[id]?.editOwnerEditorId)
          .filter((id): id is string => Boolean(id)),
      );
      if (
        state.activeEditorId &&
        documentIds.includes(state.editorsById[state.activeEditorId]?.documentId) &&
        !state.documentsById[state.editorsById[state.activeEditorId]?.documentId]?.editOwnerEditorId
      )
        owners.add(state.activeEditorId);
      await Promise.all(
        [...owners].map((editorId) => {
          const view = editorStore.getState().editorsById[editorId];
          return view
            ? enqueueTransfer(view.documentId, () => transferInputLease(editorId, true))
            : Promise.resolve();
        }),
      );
    };
    try {
      await Promise.all(
        documentIds.map((id) =>
          enqueueTransfer(id, async () => {
            const document = editorStore.getState().documentsById[id];
            for (const editorId of document?.attachedEditorIds ?? []) {
              const provider = providersByEditorId.get(editorId);
              if (provider && !(await provider.setInputEnabled(false)).applied)
                throw new Error("输入法 composition 尚未结束");
            }
          }),
        ),
      );
      return resume;
    } catch (error) {
      await resume();
      throw error;
    }
  },
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
    const request = {};
    latestRequests.set(view.documentId, request);
    return enqueueTransfer(view.documentId, () =>
      transferInputLease(editorId, false, () => latestRequests.get(view.documentId) === request),
    ).finally(() => {
      if (latestRequests.get(view.documentId) === request) latestRequests.delete(view.documentId);
    });
  },

  releaseLease: (editorId: string): Promise<void> => {
    const view = editorStore.getState().editorsById[editorId];
    if (!view) return Promise.resolve();
    return enqueueTransfer(view.documentId, async () => {
      const state = editorStore.getState();
      const currentView = state.editorsById[editorId];
      const document = currentView ? state.documentsById[currentView.documentId] : null;
      if (!currentView || !document || document.editOwnerEditorId !== editorId) return;

      const provider = providersByEditorId.get(editorId);
      if (!provider || currentView.bridgeState !== "ready")
        throw new Error("输入持有者不可达，无法安全释放");
      if (provider && currentView.bridgeState === "ready") {
        await provider.blur();
        if (!(await provider.setInputEnabled(false)).applied)
          throw new Error("输入法 composition 尚未结束");
        await captureReleasedOwner(document.documentId, editorId);
      }

      const latestDocument = editorStore.getState().documentsById[document.documentId];
      if (latestDocument?.editOwnerEditorId === editorId) {
        editorStore.getState().setDocumentEditOwner(document.documentId, null);
      }
    });
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
