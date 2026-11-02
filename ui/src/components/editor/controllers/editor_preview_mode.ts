import { editorStore } from "@/stores/editor";

import { editorInputLeaseCoordinator } from "./editor_input_lease_coordinator";

/** 进入预览前捕获 surface 的最新草稿，再释放输入权限。 */
export async function toggleEditorPreviewMode(editorId: string): Promise<void> {
  const view = editorStore.getState().editorsById[editorId];
  if (!view || view.bridgeState !== "ready") return;
  if (view.previewMode) {
    editorStore.getState().setEditorPreviewMode(editorId, false);
    await editorInputLeaseCoordinator.requestLease(editorId);
  } else {
    await editorInputLeaseCoordinator.releaseLease(editorId);
    if (editorStore.getState().editorsById[editorId]) {
      editorStore.getState().setEditorPreviewMode(editorId, true);
    }
  }
}
