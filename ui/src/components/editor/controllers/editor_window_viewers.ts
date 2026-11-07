import type { EditorWindowBootstrap } from "@/api/commands/win/editor_windows";
import { type WorkspaceViewerSession, editorStore } from "@/stores/editor/editor_store";

import { editorWindowRuntime } from "./editor_window_runtime";
import { completeEditorWindowTransfer } from "./editor_window_transfer";

export type ViewerProjection = { viewer: WorkspaceViewerSession };
type OwnerDeps = { remoteViews: Map<string, string> };
type TransferDeps = OwnerDeps & {
  create(transferId: string, payload: unknown): Promise<EditorWindowBootstrap>;
  show(label: string): Promise<void>;
  checkpoint(): Promise<unknown>;
};
const transferringViews = new Set<string>();
const readyViews = new Set<string>();
type ReadyCallback = () => void;
const readyWaiters = new Map<string, ReadyCallback>();
/** 仅由 RPC 在 Rust checkpoint 成功后调用，不能在 ready handler 内提前提交。 */
export function markViewerReadyCommitted(editorId: string): void {
  if (transferringViews.has(editorId)) {
    readyViews.add(editorId);
    readyWaiters.get(editorId)?.();
  }
}

export function isViewerProjection(value: unknown): value is ViewerProjection {
  return (
    !!value &&
    typeof value === "object" &&
    "viewer" in value &&
    !!(value as ViewerProjection).viewer?.viewerId
  );
}
export function viewerProjection(id: string): ViewerProjection {
  const viewer = editorStore.getState().viewersById[id];
  if (!viewer) throw new Error("预览标签已关闭");
  return { viewer };
}
export function applyViewerProjection(value: ViewerProjection, targetGroupId?: string): void {
  const state = editorStore.getState();
  const local = state.viewersById[value.viewer.viewerId];
  const groupId = targetGroupId ?? local?.groupId ?? state.activeGroupId;
  const group = state.groupsById[groupId];
  if (!group) throw new Error("目标编辑组已关闭");
  const id = value.viewer.viewerId;
  const existing = group.tabIds.includes(id);
  editorStore.setState({
    viewersById: { ...state.viewersById, [id]: { ...value.viewer, groupId } },
    openEditorIds: [...new Set([...state.openEditorIds, id])],
    activeGroupId: existing ? state.activeGroupId : groupId,
    activeEditorId: existing ? state.activeEditorId : id,
    groupsById: {
      ...state.groupsById,
      [groupId]: {
        ...group,
        tabIds: [...new Set([...group.tabIds, id])],
        activeTabId: existing ? group.activeTabId : id,
      },
    },
  });
}
function assertViewerOwner(id: string, from: string, deps: OwnerDeps): WorkspaceViewerSession {
  if (editorWindowRuntime.isRemote()) throw new Error("辅助窗口不能提供权威预览");
  const viewer = viewerProjection(id).viewer;
  if (viewer.windowLabel === "pending") deps.remoteViews.set(id, from);
  if (deps.remoteViews.get(id) !== from) throw new Error("当前窗口不拥有预览视图");
  return viewer;
}
async function localResourceUri(viewer: WorkspaceViewerSession): Promise<string> {
  const [
    { workspaceResource },
    { isTauri, os },
    { createWorkspaceResourceEndpoint },
    { appendWorkspaceResourceUrl },
  ] = await Promise.all([
    import("@/api/commands/workspace"),
    import("@/api/common/platform"),
    import("@/api/common/workspace_resource_endpoint"),
    import("@/assets/editor/src/resources/resource_url"),
  ]);
  if (isTauri()) {
    const scope = await workspaceResource.acquireScope(viewer.ref.workspaceId);
    const uri = appendWorkspaceResourceUrl(
      createWorkspaceResourceEndpoint(scope, os()),
      viewer.ref.filePath,
    );
    if (!uri) throw new Error("预览资源路径无效");
    return uri;
  }
  const [{ workspace }, { resolveWorkspaceFileUrl }] = await Promise.all([
    import("@/api/commands/workspace"),
    import("@/api/common"),
  ]);
  return resolveWorkspaceFileUrl(await workspace.get(viewer.ref.workspaceId), viewer.ref.filePath);
}
export async function resolveViewerResource(viewer: WorkspaceViewerSession): Promise<string> {
  if (!editorWindowRuntime.isRemote()) return localResourceUri(viewer);
  const { editorWindowService } = await import("./editor_window_service");
  return editorWindowService.requestOwner("viewer-resource", {
    editorId: viewer.viewerId,
  }) as Promise<string>;
}
export async function openViewerExternally(viewerId: string): Promise<void> {
  if (editorWindowRuntime.isRemote()) {
    const { editorWindowService } = await import("./editor_window_service");
    await editorWindowService.requestOwner("viewer-open-external", { editorId: viewerId });
    return;
  }
  const viewer = viewerProjection(viewerId).viewer;
  const [{ workspaceFile }, { openExternalFile }, { getFileMimeType }] = await Promise.all([
    import("@/api/commands/workspace"),
    import("@/api/commands/utils"),
    import("@/api/common"),
  ]);
  const path = await workspaceFile.nativePath(viewer.ref.workspaceId, viewer.ref.filePath);
  if (!path) throw new Error("当前工作区不支持外部打开");
  await openExternalFile(path, getFileMimeType(viewer.ref.filePath));
}
export async function handleViewerRequest(
  method: string,
  args: unknown,
  from: string,
  deps: OwnerDeps,
): Promise<unknown> {
  const { editorId } = args as { editorId: string };
  const viewer = assertViewerOwner(editorId, from, deps);
  if (method === "viewer-resource") return localResourceUri(viewer);
  if (method === "viewer-open-external") return openViewerExternally(editorId);
  if (method === "viewer-duplicate") {
    const id = editorStore.getState().attachRemoteViewer(editorId, from);
    deps.remoteViews.set(id, from);
    return viewerProjection(id);
  }
  if (method === "viewer-ready") {
    // 预览无编辑 bridge；确认资源可申请后才允许移除源标签。
    if (viewer.viewerKind === "image" || viewer.viewerKind === "video")
      await localResourceUri(viewer);
    return viewerProjection(editorId);
  }
  throw new Error("未知预览操作");
}
export async function createViewerTransfer(
  id: string,
  mode: "move" | "copy",
  deps: TransferDeps,
): Promise<void> {
  const remoteId = editorStore.getState().attachRemoteViewer(id, "pending");
  transferringViews.add(remoteId);
  const transferId = globalThis.crypto.randomUUID();
  let target: EditorWindowBootstrap | undefined;
  let timer: ReturnType<typeof setTimeout> | undefined;
  try {
    target = await deps.create(transferId, viewerProjection(remoteId));
    deps.remoteViews.set(remoteId, target.windowLabel);
    const state = editorStore.getState();
    editorStore.setState({
      viewersById: {
        ...state.viewersById,
        [remoteId]: { ...state.viewersById[remoteId], windowLabel: target.windowLabel },
      },
    });
    const ready = readyViews.has(remoteId)
      ? Promise.resolve()
      : new Promise<void>((resolve, reject) => {
          readyWaiters.set(remoteId, resolve);
          timer = setTimeout(() => reject(new Error("辅助预览初始化超时，源标签已保留")), 15000);
        });
    await completeEditorWindowTransfer(mode, {
      ready,
      checkpoint: async () => {
        await deps.checkpoint();
        await deps.show(target!.windowLabel);
      },
      removeSource: () => editorStore.getState().closeEditor(id),
    });
  } catch (error) {
    deps.remoteViews.delete(remoteId);
    editorStore.getState().closeEditor(remoteId);
    if (target) {
      const { editorWindows } = await import("@/api/commands/win/editor_windows");
      await editorWindows.discard(target.windowLabel, transferId).catch(() => {});
    }
    throw error;
  } finally {
    if (timer) clearTimeout(timer);
    transferringViews.delete(remoteId);
    readyViews.delete(remoteId);
    readyWaiters.delete(remoteId);
  }
}
