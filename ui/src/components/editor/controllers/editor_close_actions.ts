import { type DocumentModel, editorStore, isDocumentDirty } from "@/stores/editor";

import type { saveCoordinator } from "./save_coordinator";

export type EditorCloseTargets = {
  editorIds: string[];
  documentIds?: string[];
  workspaceId?: string;
  savedOnly?: boolean;
};
export type EditorCloseDecision = "save" | "discard" | "cancel";

export function getWorkspaceCloseTargets(workspaceId: string): EditorCloseTargets {
  const state = editorStore.getState();
  const documents = Object.values(state.documentsById).filter(
    (d) => d.ref.kind === "workspaceFile" && d.ref.workspaceId === workspaceId,
  );
  const documentIds = new Set(documents.map((d) => d.documentId));
  return {
    workspaceId,
    documentIds: [...documentIds],
    editorIds: state.openEditorIds.filter((id) => {
      const editor = state.editorsById[id];
      return (
        documentIds.has(editor?.documentId) ||
        state.viewersById[id]?.ref.workspaceId === workspaceId
      );
    }),
  };
}

/** capture、确认、保存和关闭共用 mutation 屏障，避免最后一次输入或自动保存与关闭竞争。 */
export function createEditorCloseActions(deps: {
  saveCoordinator: Pick<typeof saveCoordinator, "withDocumentMutation">;
  confirmDirty(documents: DocumentModel[]): Promise<EditorCloseDecision>;
}) {
  let pending = false;
  return {
    async close(
      targets: EditorCloseTargets,
      beforeClose?: () => Promise<boolean | void>,
    ): Promise<boolean> {
      if (pending) return false;
      pending = true;
      try {
        const closing = new Set(targets.editorIds);
        const state = editorStore.getState();
        const documentIds = [
          ...new Set([
            ...(targets.documentIds ?? []),
            ...targets.editorIds.flatMap((id) =>
              state.editorsById[id] ? [state.editorsById[id].documentId] : [],
            ),
          ]),
        ];
        const finalDocuments = () =>
          documentIds.flatMap((id) => {
            const d = editorStore.getState().documentsById[id];
            return d && d.attachedEditorIds.every((editorId) => closing.has(editorId)) ? [d] : [];
          });
        return await deps.saveCoordinator.withDocumentMutation(documentIds, async (context) => {
          await context.capture();
          if (targets.savedOnly) {
            for (const id of closing) {
              const editor = editorStore.getState().editorsById[id];
              const d = editor ? editorStore.getState().documentsById[editor.documentId] : null;
              if (d && isDocumentDirty(d)) closing.delete(id);
            }
          }
          const dirty = finalDocuments().filter(isDocumentDirty);
          const decision = dirty.length ? await deps.confirmDirty(dirty) : "discard";
          if (decision === "cancel") return false;
          if (decision === "save") {
            await context.save(finalDocuments().map((d) => d.documentId));
            if (finalDocuments().some(isDocumentDirty))
              throw new Error("保存期间出现新的编辑，请重试");
          }
          if (targets.workspaceId) {
            const latest = getWorkspaceCloseTargets(targets.workspaceId);
            if (
              latest.editorIds.some((id) => !closing.has(id)) ||
              latest.documentIds?.some((id) => !documentIds.includes(id))
            )
              throw new Error("确认期间打开了新的工作区标签，请重试");
          }
          // Core 操作失败时保留所有标签和草稿，确认“放弃”不提前销毁数据。
          if ((await beforeClose?.()) === false) return false;
          const closedDocuments = finalDocuments();
          for (const d of closedDocuments)
            editorStore.getState().discardDocumentDraft(d.documentId);
          for (const id of closing) editorStore.getState().closeEditor(id);
          // 清理以前版本关闭标签后保留的工作区孤立草稿。
          if (targets.workspaceId)
            editorStore.getState().removeWorkspacePaths(
              targets.workspaceId,
              closedDocuments.flatMap((d) =>
                d.ref.kind === "workspaceFile" ? [d.ref.filePath] : [],
              ),
            );
          return true;
        });
      } finally {
        pending = false;
      }
    },
  };
}
