import { editorStore } from "@/stores/editor";

/** Core 关闭会撤销 resource scope；相应查看器必须销毁，重开时获取新 scope。 */
export function closeWorkspaceViewerSessions(workspaceId: string) {
  editorStore.getState().closeWorkspaceViewers(workspaceId);
}
