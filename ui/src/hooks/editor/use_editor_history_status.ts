import { documentHistoryService } from "@/components/editor/controllers/document_history";
import { editorWindowService } from "@/components/editor/controllers/editor_window_service";

import { useEditorSelector } from "./use_editor_selector";

/** 菜单直接订阅文档历史，不依赖 iframe 异步回传的焦点与历史快照。 */
export function useEditorHistoryStatus(editorId: string | null) {
  return useEditorSelector((state) => {
    const documentId = editorId ? state.editorsById[editorId]?.documentId : undefined;
    if (!documentId) return { canUndo: false, canRedo: false };
    return editorWindowService.isRemote()
      ? editorWindowService.getRemoteHistoryStatus(documentId)
      : documentHistoryService.status(documentId);
  });
}
