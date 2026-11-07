import { createStore } from "zustand/vanilla";

import { type EditorWindowBootstrap, editorWindows } from "@/api/commands/win/editor_windows";
import { detectWorkspaceFileKind } from "@/api/common";
import { isDesktop, isTauri } from "@/api/common/platform";
import type { EditorDocumentChangedPayload } from "@/assets/editor/src/bridge/protocol";
import {
  type DocumentModel,
  type EditorDocumentRef,
  type EditorViewSession,
  editorStore,
  findMatchingGroupTab,
  getEditorDocumentKey,
} from "@/stores/editor";
import { workspaceSessionStore } from "@/stores/workspace/workspace_session_store";

import { type DocumentHistorySnapshot, documentHistoryService } from "./document_history";
import { withDocumentSaveWindow } from "./document_save_window";
import type { InputLeaseProvider } from "./editor_input_lease_coordinator";
import {
  type EditorWindowLayoutSnapshot,
  captureEditorWindowLayout,
  restoreEditorWindowLayout,
} from "./editor_window_layout";
import {
  type EditorWindowProjectionMessage,
  applyEditorWindowProjection,
  createEditorWindowProjection,
} from "./editor_window_projection";
import { EditorWindowReloadedError, EditorWindowRpc } from "./editor_window_rpc";
import { editorWindowRuntime } from "./editor_window_runtime";
import { completeEditorWindowTransfer } from "./editor_window_transfer";
import {
  applyViewerProjection,
  createViewerTransfer,
  handleViewerRequest,
  isViewerProjection,
  markViewerReadyCommitted,
  viewerProjection,
} from "./editor_window_viewers";
import { WorkspaceFileDragTickets } from "./workspace_file_drag";

type WindowState = {
  role: "loading" | "workbench" | "editor";
  ready: boolean;
  connected: boolean;
  error: string | null;
  ownerDestroyed: boolean;
};
const workspaceFileDrags = new WorkspaceFileDragTickets();
export const editorWindowState = createStore<WindowState>(() => ({
  role: "loading",
  ready: false,
  connected: false,
  error: null,
  ownerDestroyed: false,
}));
type Projection = {
  document: DocumentModel;
  editor: EditorViewSession;
  historyStatus?: { canUndo: boolean; canRedo: boolean };
};
const sentProjections = new Map<string, Projection>();
const receivedProjections = new Map<string, Projection>();
const projectionTasks = new Map<string, Promise<void>>();
const remoteHistoryStatus = new Map<string, { canUndo: boolean; canRedo: boolean }>();
let bootstrap: EditorWindowBootstrap | undefined;
let rpc: EditorWindowRpc | undefined;
let initialization: Promise<void> | undefined;
let stopMessages: (() => void) | undefined;
let stopStore: (() => void) | undefined;
let stopMembers: (() => void) | undefined;
let heartbeat: ReturnType<typeof setInterval> | undefined;
let checkpointQueue: Promise<void> = Promise.resolve();
let preparedReload = false;
let windowStateTimer: ReturnType<typeof setTimeout> | undefined;
async function performPreparedReload(reload: () => void | Promise<void>) {
  preparedReload = true;
  try {
    await reload();
  } catch (error) {
    preparedReload = false;
    throw error;
  }
  setTimeout(() => {
    preparedReload = false;
  }, 1000);
}
const remoteViews = new Map<string, string>();
const windowLayouts = new Map<string, EditorWindowLayoutSnapshot>();
const pendingChanges = new Set<Promise<unknown>>();
const unconfirmedEditors = new Set<string>();
const localProviders = new Map<string, InputLeaseProvider>();
type ReadyWaiter = {
  resolve: () => void;
  reject: (error: Error) => void;
  timer: ReturnType<typeof setTimeout>;
};
type Cleanup = () => void;
type OwnerHandler = (args: unknown, from: string) => Promise<unknown>;
const readyWaiters = new Map<string, ReadyWaiter>();
const committedReadyViews = new Set<string>();
const disposers = new Map<string, Cleanup>();
const ownerHandlers = new Map<string, OwnerHandler>();
function requireRpc() {
  if (!rpc || !bootstrap) throw new Error("编辑器窗口尚未连接");
  return rpc;
}
function ownerRequest(method: string, args: unknown) {
  if (bootstrap?.ownerDestroyed)
    return Promise.reject(
      new Error("原窗口已意外关闭。请复制保留的草稿；此窗口无法重新连接或保存。"),
    );
  return requireRpc().request(
    bootstrap!.ownerWindowLabel,
    method,
    args,
    undefined,
    ["close", "prepare-close", "finish-close", "save", "save-all"].includes(method) ? null : 15000,
  );
}
function projection(editorId: string): Projection {
  const state = editorStore.getState(),
    editor = state.editorsById[editorId];
  if (!editor) throw new Error("编辑视图已关闭");
  return {
    editor,
    document: state.documentsById[editor.documentId],
    historyStatus: documentHistoryService.status(editor.documentId),
  };
}
function checkpoint() {
  const state = editorStore.getState();
  const epoch = bootstrap!.ownerEpoch;
  const snapshot = {
    documentsById: state.documentsById,
    editorsById: state.editorsById,
    remoteViews: Object.fromEntries(remoteViews),
    windowLayouts: Object.fromEntries(windowLayouts),
    documentIds: state.documentIds,
    documentIdByKey: state.documentIdByKey,
    groupsById: state.groupsById,
    layout: state.layout,
    activeGroupId: state.activeGroupId,
    openEditorIds: state.openEditorIds,
    activeEditorId: state.activeEditorId,
    viewersById: state.viewersById,
    histories: Object.fromEntries(
      state.documentIds.map((id) => [id, documentHistoryService.snapshot(id)]),
    ),
  };
  checkpointQueue = checkpointQueue
    .catch(() => {})
    .then(() => editorWindows.checkpoint(epoch, snapshot));
  return checkpointQueue;
}
function applyProjection(value: Projection) {
  if (isViewerProjection(value)) {
    applyViewerProjection(value);
    return;
  }
  if (bootstrap?.ownerDestroyed)
    value = { ...value, document: { ...value.document, editOwnerEditorId: null } };
  receivedProjections.set(value.editor.editorId, value);
  if (value.historyStatus) remoteHistoryStatus.set(value.document.documentId, value.historyStatus);
  const state = editorStore.getState();
  const local = state.editorsById[value.editor.editorId];
  const groupId = local?.groupId ?? state.activeGroupId;
  const existing = state.groupsById[groupId];
  const editor = {
    ...value.editor,
    ...(local
      ? {
          editorState: local.editorState,
          preferenceOverrides: local.preferenceOverrides,
          previewMode: local.previewMode,
          bridgeState: local.bridgeState,
          bridgeGeneration: local.bridgeGeneration,
        }
      : {}),
    groupId,
  };
  editorStore.setState({
    documentsById: { ...state.documentsById, [value.document.documentId]: value.document },
    documentIds: [...new Set([...state.documentIds, value.document.documentId])],
    documentIdByKey: {
      ...state.documentIdByKey,
      [value.document.documentKey]: value.document.documentId,
    },
    editorsById: { ...state.editorsById, [editor.editorId]: editor },
    openEditorIds: [...new Set([...state.openEditorIds, editor.editorId])],
    activeEditorId: local ? state.activeEditorId : editor.editorId,
    groupsById: {
      ...state.groupsById,
      [groupId]: {
        ...existing,
        tabIds: [...new Set([...existing.tabIds, editor.editorId])],
        activeTabId: local ? existing.activeTabId : editor.editorId,
      },
    },
  });
}
function assertRemoteView(editorId: string, from: string) {
  if (bootstrap?.role !== "workbench") throw new Error("当前窗口不是文档owner");
  if (
    (editorStore.getState().editorsById[editorId] ?? editorStore.getState().viewersById[editorId])
      ?.windowLabel === "pending"
  )
    remoteViews.set(editorId, from);
  if (remoteViews.get(editorId) !== from) throw new Error("该窗口不拥有编辑视图");
}
function recoverDestroyedMember(windowLabel: string) {
  rpc?.disconnectTarget(windowLabel);
  for (const [id, label] of remoteViews) {
    if (label !== windowLabel) continue;
    remoteViews.delete(id);
    committedReadyViews.delete(id);
    disposers.get(id)?.();
    disposers.delete(id);
    sentProjections.delete(id);
    editorStore.getState().restoreRemoteEditor(id);
  }
}
function restoreAuxiliaryLayout(snapshot: EditorWindowLayoutSnapshot) {
  const state = editorStore.getState();
  const restored = restoreEditorWindowLayout(snapshot, state.openEditorIds);
  const editorsById = { ...state.editorsById },
    viewersById = { ...state.viewersById };
  for (const group of Object.values(restored.groupsById))
    for (const id of group.tabIds) {
      if (editorsById[id]) {
        const saved = restored.viewStates?.[id];
        editorsById[id] = {
          ...editorsById[id],
          ...(saved
            ? {
                editorState: saved.editorState,
                preferenceOverrides: saved.preferenceOverrides,
                previewMode: saved.previewMode,
              }
            : {}),
          groupId: group.groupId,
        };
      }
      if (viewersById[id]) viewersById[id] = { ...viewersById[id], groupId: group.groupId };
    }
  editorStore.setState({
    groupsById: restored.groupsById,
    layout: restored.layout,
    activeGroupId: restored.activeGroupId,
    activeEditorId: restored.activeEditorId,
    openEditorIds: restored.openEditorIds,
    editorsById,
    viewersById,
  });
}
async function broadcastProjection(editorId: string, label: string) {
  const previous = projectionTasks.get(editorId) ?? Promise.resolve();
  const task = previous
    .catch(() => {})
    .then(async () => {
      // 创建 native window 不代表 renderer 已安装监听；销毁后的旧队列也不能继续发送。
      if (remoteViews.get(editorId) !== label || !committedReadyViews.has(editorId)) return;
      const state = editorStore.getState();
      if (state.viewersById[editorId]) {
        await requireRpc().request(label, "projection", viewerProjection(editorId));
        return;
      }
      if (!state.editorsById[editorId]) return;
      const next = projection(editorId);
      await requireRpc().request(
        label,
        "projection",
        createEditorWindowProjection(sentProjections.get(editorId), next),
      );
      sentProjections.set(editorId, next);
    });
  projectionTasks.set(editorId, task);
  await task.catch((error) => {
    sentProjections.delete(editorId);
    if (remoteViews.get(editorId) !== label || error instanceof EditorWindowReloadedError) return;
    console.warn("辅助窗口同步失败", error);
  });
  if (projectionTasks.get(editorId) === task) projectionTasks.delete(editorId);
}
async function initialize() {
  if (!isTauri() || !isDesktop()) {
    editorWindowState.setState({ role: "workbench", ready: true, connected: true });
    return;
  }
  bootstrap = await editorWindows.getBootstrap();
  editorWindowRuntime.setRemote(bootstrap.role === "editor");
  editorWindowRuntime.setOwnerEpoch(bootstrap.ownerEpoch);
  rpc = new EditorWindowRpc(
    bootstrap,
    (target, id, payload) => editorWindows.send(target, id, payload, bootstrap!.ownerEpoch),
    bootstrap.role === "workbench" ? checkpoint : async () => {},
  );
  rpc.onCommitted((method, args) => {
    if (method === "viewer-ready") {
      markViewerReadyCommitted((args as { editorId: string }).editorId);
    }
    if (method !== "ready" && method !== "viewer-ready") return;
    const { editorId } = args as { editorId: string };
    committedReadyViews.add(editorId);
    const waiter = readyWaiters.get(editorId);
    if (waiter) {
      clearTimeout(waiter.timer);
      readyWaiters.delete(editorId);
      waiter.resolve();
    }
    const label = remoteViews.get(editorId);
    if (label) void broadcastProjection(editorId, label);
  });
  // 先监听再请求快照，避免初始化间隙丢失修订。
  stopMessages = await editorWindows.listen(
    (message) =>
      void rpc
        ?.receive(message)
        .catch((error) => console.error("[editor-window] 消息处理失败", error)),
  );
  for (const [method, handler] of ownerHandlers) rpc.handle(method, handler);
  rpc.handle("projection", async (args, from) => {
    if (bootstrap?.role !== "editor" || from !== bootstrap.ownerWindowLabel)
      throw new Error("无权更新文档投影");
    if (isViewerProjection(args)) {
      applyViewerProjection(args);
      return null;
    }
    const message = args as EditorWindowProjectionMessage;
    const id =
      message.kind === "checkpoint" ? message.projection.editor.editorId : message.editor.editorId;
    try {
      applyProjection(applyEditorWindowProjection(receivedProjections.get(id), message));
    } catch {
      applyProjection((await ownerRequest("snapshot", { editorId: id })) as Projection);
    }
    return null;
  });
  rpc.handle("attach", async (args, from) => {
    if (bootstrap?.role !== "editor" || from !== bootstrap.ownerWindowLabel)
      throw new Error("无权接收标签");
    const { value, groupId, beforeId } = args as {
      value:
        | Projection
        | { viewer: ReturnType<typeof editorStore.getState>["viewersById"][string] };
      groupId: string;
      beforeId?: string | null;
    };
    if (!editorStore.getState().groupsById[groupId]) throw new Error("目标标签组已关闭");
    editorStore.getState().setActiveGroup(groupId);
    if (isViewerProjection(value)) applyViewerProjection(value, groupId);
    else applyProjection(value);
    const id = isViewerProjection(value) ? value.viewer.viewerId : value.editor.editorId;
    const existing = findMatchingGroupTab(editorStore.getState(), id, groupId);
    editorStore.getState().moveEditorToGroup(id, groupId, beforeId ?? null);
    return existing ?? id;
  });
  rpc.handle("merge-view", async (args, from) => {
    const { sourceId, targetId } = args as { sourceId: string; targetId: string };
    assertRemoteView(sourceId, from);
    assertRemoteView(targetId, from);
    const state = editorStore.getState();
    const same = state.editorsById[sourceId]
      ? state.editorsById[sourceId].documentId === state.editorsById[targetId]?.documentId
      : state.viewersById[sourceId] &&
        state.viewersById[targetId] &&
        getEditorDocumentKey(state.viewersById[sourceId].ref) ===
          getEditorDocumentKey(state.viewersById[targetId].ref);
    if (!same || sourceId === targetId) throw new Error("无法合并不同文档的标签");
    const documentId = state.editorsById[sourceId]?.documentId;
    if (documentId) {
      const { saveCoordinator } = await import("./save_coordinator");
      await saveCoordinator.withDocumentMutation([documentId], async (context) => {
        await context.capture();
        if (!editorStore.getState().editorsById[targetId]) throw new Error("目标标签已关闭");
        editorStore.getState().closeEditor(sourceId);
      });
    } else state.closeEditor(sourceId);
    return null;
  });
  rpc.handle("drop-tab", async (args, from) => {
    const { token, groupId, beforeId } = args as {
      token: string;
      groupId: string;
      beforeId?: string | null;
    };
    const [source, id] = await editorWindows.takeTabDrag(token, from);
    if (source === bootstrap?.windowLabel) {
      if (!editorStore.getState().openEditorIds.includes(id)) throw new Error("来源标签已关闭");
    } else assertRemoteView(id, source);
    await moveEditorToExistingWindow(id, from, groupId, beforeId);
    return null;
  });
  rpc.handle("provider", async (args, from) => {
    if (bootstrap?.role !== "editor" || from !== bootstrap.ownerWindowLabel)
      throw new Error("无权访问编辑surface");
    const { editorId, method, values } = args as {
      editorId: string;
      method: keyof InputLeaseProvider;
      values: unknown[];
    };
    const provider = localProviders.get(editorId);
    if (!provider) throw new Error("编辑视图尚未就绪");
    const fn = provider[method] as (...values: unknown[]) => Promise<unknown>;
    if (typeof fn !== "function") throw new Error("无效surface操作");
    return fn(...values);
  });
  rpc.handle("closed", async (args, from) => {
    if (bootstrap?.role !== "editor" || from !== bootstrap.ownerWindowLabel)
      throw new Error("无权关闭投影");
    const { editorId } = args as { editorId: string };
    editorStore.getState().closeEditor(editorId);
    return null;
  });
  rpc.handle("close", async (args, from) => {
    const { editorIds, savedOnly } = args as { editorIds: string[]; savedOnly?: boolean };
    for (const id of editorIds) assertRemoteView(id, from);
    const { closeEditorWindowViews } = await import("@/hooks/editor/use_editor_close_actions");
    return closeEditorWindowViews(editorIds, { savedOnly });
  });
  rpc.handle("prepare-close", async (args, from) => {
    const { requestId } = args as { requestId: string };
    // 刷新前的本地投影可能已过时，关闭范围以 owner 持有的该成员视图为准。
    const editorIds = [...remoteViews].filter(([, label]) => label === from).map(([id]) => id);
    return (await import("@/hooks/editor/use_editor_close_actions")).prepareRemoteEditorWindowClose(
      requestId,
      editorIds,
      from,
    );
  });
  rpc.handle("finish-close", async (args, from) => {
    if (bootstrap?.role !== "workbench") throw new Error("不是owner");
    const { requestId, commit } = args as { requestId: string; commit: boolean };
    return (await import("@/hooks/editor/use_editor_close_actions")).finishRemoteEditorWindowClose(
      requestId,
      commit,
      from,
    );
  });
  rpc.handle("snapshot", async (args, from) => {
    const { editorId } = args as { editorId: string };
    assertRemoteView(editorId, from);
    return projection(editorId);
  });
  rpc.handle("member-snapshot", async (args, from) => {
    await initialization;
    const { initialEditorId } = args as { initialEditorId?: string };
    if (
      initialEditorId &&
      (
        editorStore.getState().editorsById[initialEditorId] ??
        editorStore.getState().viewersById[initialEditorId]
      )?.windowLabel === "pending"
    )
      assertRemoteView(initialEditorId, from);
    const ids = [...remoteViews].filter(([, label]) => label === from).map(([id]) => id);
    for (const id of ids) {
      committedReadyViews.delete(id);
      sentProjections.delete(id);
    }
    requireRpc().resetTarget(from);
    return {
      projections: ids.map((id) =>
        editorStore.getState().viewersById[id] ? viewerProjection(id) : projection(id),
      ),
      layout: windowLayouts.get(from),
    };
  });
  rpc.handle("ready", async (args, from) => {
    const { editorId } = args as { editorId: string };
    assertRemoteView(editorId, from);
    sentProjections.delete(editorId);
    const [{ editorInputLeaseCoordinator }, { saveCoordinator }] = await Promise.all([
      import("./editor_input_lease_coordinator"),
      import("./save_coordinator"),
    ]);
    const call = (method: keyof InputLeaseProvider, ...values: unknown[]) =>
      requireRpc().request(from, "provider", { editorId, method, values });
    const provider: InputLeaseProvider = {
      captureDocument: () =>
        call("captureDocument") as ReturnType<InputLeaseProvider["captureDocument"]>,
      applyDocumentRevision: (revision, text) =>
        call("applyDocumentRevision", revision, text) as ReturnType<
          InputLeaseProvider["applyDocumentRevision"]
        >,
      blur: () => call("blur") as Promise<void>,
      setInputEnabled: (...values) =>
        call("setInputEnabled", ...values) as ReturnType<InputLeaseProvider["setInputEnabled"]>,
    };
    disposers.get(editorId)?.();
    editorStore.getState().setEditorBridgeState(editorId, "ready");
    const cleanupLease = editorInputLeaseCoordinator.registerProvider(editorId, provider);
    const cleanupCapture = saveCoordinator.registerCaptureProvider(
      projection(editorId).document.documentId,
      editorId,
      provider.captureDocument,
    );
    disposers.set(editorId, () => {
      cleanupLease();
      cleanupCapture();
    });
    return projection(editorId);
  });
  rpc.handle("lease", async (args, from) => {
    const { editorId } = args as { editorId: string };
    assertRemoteView(editorId, from);
    await (
      await import("./editor_input_lease_coordinator")
    ).editorInputLeaseCoordinator.requestLease(editorId);
    return projection(editorId);
  });
  rpc.handle("change", async (args, from) => {
    const { documentId, editorId, payload } = args as {
      documentId: string;
      editorId: string;
      payload: EditorDocumentChangedPayload;
    };
    assertRemoteView(editorId, from);
    if (projection(editorId).document.documentId !== documentId) throw new Error("文档身份不匹配");
    const accepted = (await import("./document_history")).documentHistoryService.submit(
      documentId,
      editorId,
      payload,
    );
    if (accepted) (await import("./save_coordinator")).saveCoordinator.scheduleAutoSave(documentId);
    return accepted;
  });
  rpc.handle("history", async (args, from) => {
    const { editorId, direction } = args as { editorId: string; direction: "undo" | "redo" };
    assertRemoteView(editorId, from);
    const p = projection(editorId);
    documentHistoryService.history(p.document.documentId, direction, editorId);
    (await import("./save_coordinator")).saveCoordinator.scheduleAutoSave(p.document.documentId);
    return null;
  });
  rpc.handle("save", async (args, from) => {
    const { editorId } = args as { editorId: string };
    assertRemoteView(editorId, from);
    const documentId = projection(editorId).document.documentId;
    return withDocumentSaveWindow(documentId, from, async () =>
      (await import("./save_coordinator")).saveCoordinator.requestSaveDocument(documentId),
    );
  });
  rpc.handle("save-all", async (_args, from) => {
    if (bootstrap?.role !== "workbench" || ![...remoteViews.values()].includes(from))
      throw new Error("不是当前会话成员");
    const { saveCoordinator } = await import("./save_coordinator");
    for (const id of Object.keys(editorStore.getState().documentsById)) {
      const result = await withDocumentSaveWindow(id, from, () =>
        saveCoordinator.requestSaveDocument(id),
      );
      if (result === "cancelled") return result;
    }
    return "saved";
  });
  rpc.handle("duplicate", async (args, from) => {
    const { editorId } = args as { editorId: string };
    assertRemoteView(editorId, from);
    const id = editorStore.getState().attachRemoteEditor(editorId, from);
    remoteViews.set(id, from);
    return projection(id);
  });
  for (const method of [
    "viewer-ready",
    "viewer-resource",
    "viewer-open-external",
    "viewer-duplicate",
  ])
    rpc.handle(method, (args, from) => handleViewerRequest(method, args, from, { remoteViews }));
  rpc.handle("resource-scope", async (args, from) => {
    const { editorId } = args as { editorId: string };
    assertRemoteView(editorId, from);
    const ref = projection(editorId).document.ref;
    if (ref.kind !== "workspaceFile") throw new Error("文档没有工作区资源");
    return (await import("@/api/commands/workspace")).workspaceResource.acquireScope(
      ref.workspaceId,
    );
  });
  rpc.handle("open-reference", async (args, from) => {
    const { sourceEditorId, ref, groupId, duplicate } = args as {
      sourceEditorId: string;
      ref: EditorDocumentRef;
      groupId?: string;
      duplicate?: boolean;
    };
    assertRemoteView(sourceEditorId, from);
    const source =
      editorStore.getState().viewersById[sourceEditorId] ?? projection(sourceEditorId).document;
    if (
      ref.kind !== "untitled" &&
      (ref.kind !== "workspaceFile" ||
        source.ref.kind !== "workspaceFile" ||
        ref.workspaceId !== source.ref.workspaceId)
    )
      throw new Error("无法在辅助窗口打开该文件");
    if (ref.kind === "workspaceFile") {
      const kind = detectWorkspaceFileKind(ref.filePath);
      if (kind !== "markdown" && kind !== "text") {
        const id = editorStore
          .getState()
          .openRemoteViewer(
            ref,
            kind === "image" || kind === "video" || kind === "pdf" ? kind : "unknown",
            from,
            { duplicate, groupId },
          );
        remoteViews.set(id, from);
        return viewerProjection(id);
      }
    }
    const { documentRegistry } = await import("./document_registry");
    const local = editorStore.getState().openRemoteEditor(ref, from, { duplicate, groupId });
    try {
      await documentRegistry.ensureDocumentLoaded(local.documentId);
      remoteViews.set(local.editorId, from);
      return projection(local.editorId);
    } catch (error) {
      editorStore.getState().closeEditor(local.editorId);
      throw error;
    }
  });
  rpc.handle("ping", async () => null);
  rpc.handle("drop-workspace-files", async (args, from) => {
    const { token, groupId } = args as { token: string; groupId: string };
    return openDraggedWorkspaceFiles(token, from, groupId);
  });
  rpc.handle("window-state", async (args, from) => {
    if (bootstrap?.role !== "workbench") throw new Error("不是owner");
    const snapshot = args as EditorWindowLayoutSnapshot;
    for (const id of snapshot.openEditorIds) assertRemoteView(id, from);
    for (const id of Object.keys(snapshot.viewStates ?? {})) assertRemoteView(id, from);
    const restored = restoreEditorWindowLayout(snapshot, snapshot.openEditorIds);
    windowLayouts.set(from, restored);
    const state = editorStore.getState();
    const editorsById = { ...state.editorsById },
      viewersById = { ...state.viewersById };
    let changed = false;
    for (const group of Object.values(restored.groupsById))
      for (const id of group.tabIds) {
        if (editorsById[id] && editorsById[id].groupId !== group.groupId) {
          editorsById[id] = { ...editorsById[id], groupId: group.groupId };
          changed = true;
        }
        const saved = restored.viewStates?.[id];
        if (saved && editorsById[id]) {
          editorsById[id] = {
            ...editorsById[id],
            editorState: saved.editorState,
            preferenceOverrides: saved.preferenceOverrides,
            previewMode: saved.previewMode,
          };
          changed = true;
        }
        if (viewersById[id] && viewersById[id].groupId !== group.groupId) {
          viewersById[id] = { ...viewersById[id], groupId: group.groupId };
          changed = true;
        }
      }
    if (changed) editorStore.setState({ editorsById, viewersById });
    return null;
  });
  rpc.handle("checkpoint", async (_args, from) => {
    if (bootstrap?.role !== "workbench" || ![...remoteViews.values()].includes(from))
      throw new Error("不是当前会话成员");
    return null;
  });
  rpc.handle("transfer", async (args, from) => {
    const { editorId, mode } = args as { editorId: string; mode: "move" | "copy" };
    assertRemoteView(editorId, from);
    await transferEditorToNewWindow(editorId, mode);
    return null;
  });
  if (bootstrap.role === "editor") {
    const restored = bootstrap.checkpoint as {
      documentsById?: Record<string, DocumentModel>;
      editorsById?: Record<string, EditorViewSession>;
      viewersById?: ReturnType<typeof editorStore.getState>["viewersById"];
      remoteViews?: Record<string, string>;
      windowLayouts?: Record<string, EditorWindowLayoutSnapshot>;
    } | null;
    const restoredEditor = Object.entries(restored?.remoteViews ?? {}).find(
      ([, label]) => label === bootstrap!.windowLabel,
    )?.[0];
    const initial =
      restoredEditor && restored?.viewersById?.[restoredEditor]
        ? { viewer: restored.viewersById[restoredEditor] }
        : restoredEditor && restored?.editorsById?.[restoredEditor]
          ? {
              editor: restored.editorsById[restoredEditor],
              document: restored.documentsById![restored.editorsById[restoredEditor].documentId],
            }
          : (bootstrap.initialPayload as Projection | undefined);
    if (isViewerProjection(initial)) {
      applyViewerProjection(initial);
    } else if (!initial?.document || !initial.editor) throw new Error("辅助窗口缺少文档恢复数据");
    if (!isViewerProjection(initial)) applyProjection(initial);
    for (const [id, label] of Object.entries(restored?.remoteViews ?? {})) {
      if (label !== bootstrap.windowLabel || id === restoredEditor) continue;
      if (restored?.viewersById?.[id]) {
        applyViewerProjection({ viewer: restored.viewersById[id] });
      } else if (restored?.editorsById?.[id]) {
        const editor = restored.editorsById[id];
        const document = restored.documentsById?.[editor.documentId];
        if (document) applyProjection({ editor, document });
      }
    }
    const savedLayout = restored?.windowLayouts?.[bootstrap.windowLabel];
    if (savedLayout) restoreAuxiliaryLayout(savedLayout);
    if (!bootstrap.ownerDestroyed) {
      // Rust checkpoint 只用于草稿兜底；刷新时从仍然存活的 owner 获取权威成员列表。
      const initialEditorId = isViewerProjection(initial)
        ? initial.viewer.viewerId
        : initial!.editor.editorId;
      const member = (await ownerRequest("member-snapshot", { initialEditorId })) as {
        projections: (
          | Projection
          | { viewer: ReturnType<typeof editorStore.getState>["viewersById"][string] }
        )[];
        layout?: EditorWindowLayoutSnapshot;
      };
      const ids = new Set(
        member.projections.map((p) =>
          isViewerProjection(p) ? p.viewer.viewerId : p.editor.editorId,
        ),
      );
      for (const id of editorStore.getState().openEditorIds)
        if (!ids.has(id)) editorStore.getState().closeEditor(id);
      for (const p of member.projections) {
        if (isViewerProjection(p)) applyViewerProjection(p);
        else applyProjection(p);
      }
      if (member.layout && ids.size) restoreAuxiliaryLayout(member.layout);
    }
    let previousLayout = "";
    stopStore = editorStore.subscribe((state) => {
      const snapshot = captureEditorWindowLayout(state);
      const serialized = JSON.stringify(snapshot);
      if (serialized === previousLayout) return;
      previousLayout = serialized;
      if (windowStateTimer) clearTimeout(windowStateTimer);
      if (bootstrap?.ownerDestroyed) return;
      windowStateTimer = setTimeout(() => {
        void ownerRequest("window-state", snapshot).catch((error) =>
          console.warn("辅助窗口布局同步失败", error),
        );
      }, 100);
    });
    if (!bootstrap.ownerDestroyed)
      heartbeat = setInterval(() => {
        void ownerRequest("ping", null).catch(async (error) => {
          editorWindowState.setState({ connected: false, error: String(error) });
          await Promise.allSettled(
            [...localProviders.values()].map((provider) => provider.setInputEnabled(false)),
          );
        });
      }, 10000);
  } else {
    const restored = bootstrap.checkpoint as
      | (Partial<ReturnType<typeof editorStore.getState>> & {
          remoteViews?: Record<string, string>;
          histories?: Record<string, DocumentHistorySnapshot>;
          windowLayouts?: Record<string, EditorWindowLayoutSnapshot>;
        })
      | null;
    if (restored?.documentsById && restored.editorsById) {
      editorStore.setState({
        documentIds: restored.documentIds ?? Object.keys(restored.documentsById),
        documentsById: Object.fromEntries(
          Object.entries(restored.documentsById).map(([id, document]) => [
            id,
            { ...document, editOwnerEditorId: null },
          ]),
        ),
        documentIdByKey: restored.documentIdByKey ?? {},
        editorsById: Object.fromEntries(
          Object.entries(restored.editorsById).map(([id, editor]) => [
            id,
            { ...editor, bridgeState: "detached" as const },
          ]),
        ),
        viewersById: restored.viewersById ?? {},
        openEditorIds: restored.openEditorIds ?? [],
        activeEditorId: restored.activeEditorId ?? null,
        ...(restored.groupsById && restored.layout && restored.activeGroupId
          ? {
              groupsById: restored.groupsById,
              layout: restored.layout,
              activeGroupId: restored.activeGroupId,
            }
          : {}),
      });
      for (const [id, label] of Object.entries(restored.remoteViews ?? {}))
        remoteViews.set(id, label);
      for (const [label, layout] of Object.entries(restored.windowLayouts ?? {}))
        windowLayouts.set(label, layout);
      for (const [id, history] of Object.entries(restored.histories ?? {}))
        if (history) documentHistoryService.restore(id, history);
      const { claimDocumentFile } = await import("@/api/commands/win/file_ownership");
      await Promise.all(Object.values(editorStore.getState().documentsById).map(claimDocumentFile));
    }
    const { WebviewWindow, getCurrentWebviewWindow } =
      await import("@tauri-apps/api/webviewWindow");
    stopMembers = await getCurrentWebviewWindow().listen<{
      windowLabel: string;
      sessionId: string;
      ownerEpoch: number;
    }>("lonanote://editor-window-member-destroyed", ({ payload }) => {
      if (payload.sessionId !== bootstrap?.sessionId || payload.ownerEpoch !== bootstrap.ownerEpoch)
        return;
      recoverDestroyedMember(payload.windowLabel);
      void checkpoint().catch((error) => console.error("恢复辅助窗口草稿失败", error));
    });
    for (const label of new Set(remoteViews.values()))
      if (!(await WebviewWindow.getByLabel(label))) recoverDestroyedMember(label);
    stopStore = editorStore.subscribe((state, previous) => {
      if (
        state.documentsById === previous.documentsById &&
        state.editorsById === previous.editorsById &&
        state.viewersById === previous.viewersById
      )
        return;
      for (const [editorId, label] of remoteViews) {
        if (state.editorsById[editorId] || state.viewersById[editorId])
          void broadcastProjection(editorId, label);
        else {
          remoteViews.delete(editorId);
          committedReadyViews.delete(editorId);
          disposers.get(editorId)?.();
          disposers.delete(editorId);
          void requireRpc()
            .request(label, "closed", { editorId })
            .catch(() => {});
        }
      }
    });
  }
  editorWindowState.setState({
    role: bootstrap.role,
    ready: true,
    connected: !bootstrap.ownerDestroyed,
    ownerDestroyed: !!bootstrap.ownerDestroyed,
  });
  if (bootstrap.ownerDestroyed) await editorWindowService.handleOwnerDestroyed();
}
export const editorWindowService = {
  dropTab: async (token: string, groupId: string, beforeId?: string | null) => {
    if (editorWindowRuntime.isRemote())
      return ownerRequest("drop-tab", { token, groupId, beforeId });
    const [source, id] = await editorWindows.takeTabDrag(token, bootstrap!.windowLabel);
    assertRemoteView(id, source);
    return moveEditorToExistingWindow(id, bootstrap!.windowLabel, groupId, beforeId);
  },
  moveTabToGroup: async (editorId: string, groupId: string, beforeId?: string | null) => {
    const existing = findMatchingGroupTab(editorStore.getState(), editorId, groupId);
    if (existing && editorWindowRuntime.isRemote()) {
      await ownerRequest("merge-view", { sourceId: editorId, targetId: existing });
      editorStore.getState().closeEditor(editorId);
      editorStore.getState().setActiveEditor(existing);
    } else if (existing && editorStore.getState().editorsById[editorId]) {
      const { saveCoordinator } = await import("./save_coordinator");
      const documentId = editorStore.getState().editorsById[editorId].documentId;
      await saveCoordinator.withDocumentMutation([documentId], async (context) => {
        await context.capture();
        editorStore.getState().moveEditorToGroup(editorId, groupId, beforeId ?? null);
      });
    } else editorStore.getState().moveEditorToGroup(editorId, groupId, beforeId ?? null);
    if (existing && editorStore.getState().editorsById[existing]) {
      if (editorWindowRuntime.isRemote()) await editorWindowService.requestLease(existing);
      else
        await (
          await import("./editor_input_lease_coordinator")
        ).editorInputLeaseCoordinator.requestLease(existing);
    }
  },
  beginWorkspaceFileDrag: (workspaceId: string, paths: string[]) => {
    if (
      editorWindowRuntime.isRemote() ||
      workspaceSessionStore.getCurrentWorkspaceId() !== workspaceId
    )
      throw new Error("只能拖动当前工作区中的文件");
    return workspaceFileDrags.begin(workspaceId, paths);
  },
  dropWorkspaceFiles: async (token: string, groupId: string) => {
    if (editorWindowRuntime.isRemote()) {
      const values = (await ownerRequest("drop-workspace-files", { token, groupId })) as (
        | Projection
        | { viewer: ReturnType<typeof editorStore.getState>["viewersById"][string] }
      )[];
      editorStore.getState().setActiveGroup(groupId);
      for (const value of values) {
        if (isViewerProjection(value)) applyViewerProjection(value, groupId);
        else applyProjection(value);
      }
    } else await openDraggedWorkspaceFiles(token, null, groupId);
  },
  handleOwnerDestroyed: async () => {
    if (bootstrap?.role !== "editor") return;
    bootstrap = { ...bootstrap, ownerDestroyed: true };
    if (heartbeat) clearInterval(heartbeat);
    if (windowStateTimer) clearTimeout(windowStateTimer);
    rpc?.dispose();
    editorWindowState.setState({
      connected: false,
      ownerDestroyed: true,
      error: "原窗口已意外关闭，请复制保留的草稿。",
    });
    const state = editorStore.getState();
    editorStore.setState({
      documentsById: Object.fromEntries(
        Object.entries(state.documentsById).map(([id, document]) => [
          id,
          { ...document, editOwnerEditorId: null },
        ]),
      ),
    });
    await Promise.allSettled(
      [...localProviders.values()].map((provider) => provider.setInputEnabled(false)),
    );
  },
  retry: async () => {
    if (bootstrap?.ownerDestroyed)
      throw new Error("原窗口已意外关闭，无法重新连接。请复制保留的草稿后关闭此窗口。");
    stopMessages?.();
    stopStore?.();
    stopMembers?.();
    if (heartbeat) clearInterval(heartbeat);
    if (windowStateTimer) clearTimeout(windowStateTimer);
    rpc?.dispose();
    initialization = undefined;
    editorWindowState.setState({ error: null, connected: false });
    await editorWindowService.initialize();
    for (const editorId of localProviders.keys())
      await editorWindowService.markRemoteProviderReady(editorId);
    const active = editorStore.getState().activeEditorId;
    if (active && localProviders.has(active))
      await editorWindowService.requestLease(active).catch((error) => {
        editorWindowState.setState({ connected: false, error: String(error) });
        throw error;
      });
  },
  getRecoveryDraft: async () => {
    const state = editorStore.getState();
    const ids = state.openEditorIds.filter((id) => !!state.editorsById[id]);
    const drafts = await Promise.all(
      ids.map(async (id) => {
        const document = projection(id).document;
        const provider = localProviders.get(id);
        const capture = provider ? await provider.captureDocument().catch(() => null) : null;
        return `${document.title}\n${capture?.text ?? document.draft}`;
      }),
    );
    return drafts.join("\n\n");
  },
  initialize: () =>
    (initialization ??= initialize().catch((error) => {
      editorWindowState.setState({ error: String(error), connected: false });
      throw error;
    })),
  acquireResourceScope: async (documentId: string) => {
    const editorId = Object.values(editorStore.getState().editorsById).find(
      (v) => v.documentId === documentId,
    )?.editorId;
    return ownerRequest("resource-scope", { editorId }) as Promise<{
      scopeId: string;
      generation: number;
    }>;
  },
  getRemoteHistoryStatus: (documentId: string) =>
    remoteHistoryStatus.get(documentId) ?? { canUndo: false, canRedo: false },
  getBootstrapSnapshot: () => bootstrap,
  confirmLocalDocumentChange: async () => {
    if (isTauri() && bootstrap?.role === "workbench") await checkpoint();
  },
  isRemote: editorWindowRuntime.isRemote,
  registerOwnerHandler: (
    method: string,
    handler: (args: unknown, from: string) => Promise<unknown>,
  ) => {
    ownerHandlers.set(method, handler);
    return rpc?.handle(method, handler) ?? (() => ownerHandlers.delete(method));
  },
  requestOwner: ownerRequest,
  splitRemoteEditor: async (
    editorId: string,
    direction: "row" | "column",
    placement?: "before" | "after",
  ) => {
    const viewer = editorStore.getState().viewersById[editorId];
    const p = (await ownerRequest(viewer ? "viewer-duplicate" : "duplicate", {
      editorId,
    })) as Projection;
    const state = editorStore.getState();
    const groupId = state.splitEditor(editorId, direction, placement);
    if (!groupId) throw new Error("无法拆分当前标签");
    const temporary = editorStore.getState().activeEditorId;
    applyProjection(p);
    if (temporary) editorStore.getState().closeEditor(temporary);
    return groupId;
  },
  openReference: async (
    sourceEditorId: string,
    ref: EditorDocumentRef,
    groupId?: string,
    options?: { duplicate?: boolean },
  ) => {
    const p = (await ownerRequest("open-reference", {
      sourceEditorId,
      ref,
      groupId,
      duplicate: options?.duplicate,
    })) as Projection;
    if (groupId) editorStore.getState().setActiveGroup(groupId);
    applyProjection(p);
    if (isViewerProjection(p)) {
      return { documentId: "", editorId: p.viewer.viewerId, reusedView: false };
    }
    return { documentId: p.document.documentId, editorId: p.editor.editorId, reusedView: false };
  },
  submitDocumentChange: (
    documentId: string,
    editorId: string,
    payload: EditorDocumentChangedPayload,
  ) => {
    const task = ownerRequest("change", { documentId, editorId, payload }) as Promise<boolean>;
    pendingChanges.add(task);
    void task.then(
      (accepted) => {
        if (!accepted) unconfirmedEditors.add(editorId);
      },
      () => unconfirmedEditors.add(editorId),
    );
    void task.finally(() => pendingChanges.delete(task)).catch(() => {});
    return task;
  },
  requestLease: async (editorId: string) => {
    const p = await ownerRequest("lease", { editorId });
    applyProjection(p as Projection);
  },
  remoteHistory: async (documentId: string, direction: "undo" | "redo") => {
    const editorId = editorStore.getState().activeEditorId;
    await ownerRequest("history", { documentId, editorId, direction });
  },
  markRemoteProviderReady: (editorId: string) =>
    bootstrap?.ownerDestroyed
      ? Promise.resolve(localProviders.get(editorId)?.setInputEnabled(false)).then(() => undefined)
      : ownerRequest("ready", { editorId })
          .then((value) => applyProjection(value as Projection))
          .catch((error) => {
            editorWindowState.setState({ connected: false, error: String(error) });
            throw error;
          }),
  registerRemoteProvider: (editorId: string, provider: InputLeaseProvider) => {
    localProviders.set(editorId, provider);

    return () => {
      if (localProviders.get(editorId) === provider) localProviders.delete(editorId);
    };
  },
  flushRemoteInputs: async () => {
    if (unconfirmedEditors.size) throw new Error("仍有未确认的草稿，请先复制保留内容");
    const captures = await Promise.all(
      [...localProviders.values()].map((provider) => provider.captureDocument()),
    );
    if (captures.some((capture) => capture.composing))
      throw new Error("请先完成输入法输入，再关闭窗口");
    await Promise.all([...pendingChanges]);
    if (unconfirmedEditors.size) throw new Error("仍有未确认的草稿，请先复制保留内容");
  },
  hasUnconfirmedChanges: () => {
    if (preparedReload) return false;
    const state = editorStore.getState();
    const documents = editorWindowRuntime.isRemote()
      ? state.openEditorIds.flatMap((id) => {
          const editor = state.editorsById[id];
          return editor ? [state.documentsById[editor.documentId]] : [];
        })
      : Object.values(state.documentsById);
    return (
      pendingChanges.size > 0 ||
      [...unconfirmedEditors].some((id) => !!state.editorsById[id]) ||
      documents.some(
        (document) =>
          document && (document.ref.kind === "untitled" || document.draft !== document.savedText),
      )
    );
  },
  reloadWindow: async (reload: () => void | Promise<void>) => {
    await editorWindowService.initialize();
    if (editorWindowRuntime.isRemote()) {
      await Promise.all(
        [...localProviders.values()].map((provider) => provider.setInputEnabled(false)),
      );
      try {
        await editorWindowService.flushRemoteInputs();
        if (windowStateTimer) clearTimeout(windowStateTimer);
        await ownerRequest("window-state", captureEditorWindowLayout(editorStore.getState()));
        await ownerRequest("checkpoint", null);
        await performPreparedReload(reload);
      } catch (error) {
        const active = editorStore.getState().activeEditorId;
        if (active) await editorWindowService.requestLease(active).catch(() => {});
        throw error;
      }
      return;
    }
    const { saveCoordinator } = await import("./save_coordinator");
    await saveCoordinator.withDocumentMutation(
      Object.keys(editorStore.getState().documentsById),
      async (context) => {
        await context.capture();
        if (isTauri()) await checkpoint();
        await performPreparedReload(reload);
      },
    );
  },
  save: async (editorId: string) => ownerRequest("save", { editorId }),
};
async function openDraggedWorkspaceFiles(token: string, target: string | null, groupId: string) {
  const workspaceId = workspaceSessionStore.requireCurrentWorkspaceId();
  const paths = workspaceFileDrags.take(token, workspaceId);
  const { documentRegistry } = await import("./document_registry");
  const values: (
    | Projection
    | { viewer: ReturnType<typeof editorStore.getState>["viewersById"][string] }
  )[] = [];
  const created: string[] = [];
  try {
    for (const filePath of paths) {
      if (workspaceSessionStore.getCurrentWorkspaceId() !== workspaceId)
        throw new Error("工作区已切换，请重新拖动");
      const ref = { kind: "workspaceFile" as const, workspaceId, filePath };
      const kind = detectWorkspaceFileKind(filePath);
      const state = editorStore.getState();
      if (kind !== "markdown" && kind !== "text") {
        const viewerKind =
          kind === "image" || kind === "video" || kind === "pdf" ? kind : "unknown";
        const id = target
          ? state.openRemoteViewer(ref, viewerKind, target, { groupId })
          : state.openViewer(ref, viewerKind, { groupId });
        if (target && !state.viewersById[id]) created.push(id);
        if (target) {
          remoteViews.set(id, target);
          values.push(viewerProjection(id));
        }
        continue;
      }
      const opened = target
        ? state.openRemoteEditor(ref, target, { groupId })
        : state.openEditor(ref, { groupId });
      if (target && !opened.reusedView) created.push(opened.editorId);
      try {
        await documentRegistry.ensureDocumentLoaded(opened.documentId);
        if (workspaceSessionStore.getCurrentWorkspaceId() !== workspaceId)
          throw new Error("工作区已切换，请重新拖动");
        if (target) {
          remoteViews.set(opened.editorId, target);
          values.push(projection(opened.editorId));
        }
      } catch (error) {
        if (!opened.reusedView) editorStore.getState().closeEditor(opened.editorId);
        throw error;
      }
    }
    return values;
  } catch (error) {
    for (const id of created) editorStore.getState().closeEditor(id);
    throw error;
  }
}

async function moveEditorToExistingWindow(
  editorId: string,
  target: string,
  groupId: string,
  beforeId?: string | null,
) {
  const { saveCoordinator } = await import("./save_coordinator");
  const view = editorStore.getState().editorsById[editorId];
  let targetId: string | undefined;
  const move = async (capture: () => Promise<unknown>) => {
    await capture();
    const id = editorStore.getState().attachRemoteEditor(editorId, target);
    targetId = id;
    try {
      if (target === bootstrap!.windowLabel) {
        editorStore.getState().restoreRemoteEditor(id, groupId);
        targetId = findMatchingGroupTab(editorStore.getState(), id, groupId) ?? id;
        editorStore.getState().moveEditorToGroup(id, groupId, beforeId ?? null);
      } else {
        remoteViews.set(id, target);
        const ready = new Promise<void>((resolve, reject) => {
          const timer = setTimeout(() => {
            readyWaiters.delete(id);
            reject(new Error("目标编辑器初始化超时，源标签已保留"));
          }, 15000);
          readyWaiters.set(id, { resolve, reject, timer });
        });
        void ready.catch(() => {});
        const value = editorStore.getState().viewersById[id]
          ? viewerProjection(id)
          : projection(id);
        const actualId = await requireRpc().request(target, "attach", { value, groupId, beforeId });
        if (typeof actualId === "string" && actualId !== id) {
          assertRemoteView(actualId, target);
          const actual = editorStore.getState();
          const same = actual.editorsById[id]
            ? actual.editorsById[id].documentId === actual.editorsById[actualId]?.documentId
            : actual.viewersById[id] &&
              actual.viewersById[actualId] &&
              getEditorDocumentKey(actual.viewersById[id].ref) ===
                getEditorDocumentKey(actual.viewersById[actualId].ref);
          if (!same) throw new Error("目标标签文档身份不匹配");
          const waiter = readyWaiters.get(id);
          if (waiter) {
            clearTimeout(waiter.timer);
            readyWaiters.delete(id);
            waiter.resolve();
          }
          editorStore.getState().closeEditor(id);
          targetId = actualId;
        } else await ready;
      }
      await checkpoint();
      editorStore.getState().closeEditor(editorId);
      // 交接已提交；迟到的 checkpoint 错误不能再删除目标，导致两边都失去引用。
      await checkpoint().catch((error) => console.warn("标签交接后的恢复记录更新失败", error));
    } catch (error) {
      const waiter = readyWaiters.get(id);
      if (waiter) {
        clearTimeout(waiter.timer);
        readyWaiters.delete(id);
        waiter.reject(new Error("标签交接已撤销"));
      }
      editorStore.getState().closeEditor(id);
      throw error;
    }
  };
  if (view)
    await saveCoordinator.withDocumentMutation([view.documentId], (context) =>
      move(context.capture),
    );
  else await move(async () => {});
  if (targetId && view)
    await (
      await import("./editor_input_lease_coordinator")
    ).editorInputLeaseCoordinator.requestLease(targetId);
}
export async function transferEditorToNewWindow(
  editorId: string,
  mode: "move" | "copy",
): Promise<void> {
  await editorWindowService.initialize();
  if (editorWindowRuntime.isRemote()) {
    await ownerRequest("transfer", { editorId, mode });
    return;
  }
  const state = editorStore.getState();
  if (state.viewersById[editorId]) {
    await createViewerTransfer(editorId, mode, {
      create: editorWindows.create,
      show: editorWindows.show,
      checkpoint,
      remoteViews,
    });
    return;
  }
  if (!state.editorsById[editorId]) throw new Error("当前标签暂不支持跨窗口转移");
  let targetEditorId: string | undefined;
  const { saveCoordinator } = await import("./save_coordinator");
  await saveCoordinator.withDocumentMutation(
    [state.editorsById[editorId].documentId],
    async (context) => {
      await context.capture();
      const transferId = globalThis.crypto.randomUUID();
      const source = projection(editorId);
      const remoteEditorId = editorStore.getState().attachRemoteEditor(editorId, "pending");
      targetEditorId = remoteEditorId;
      const remoteEditor = editorStore.getState().editorsById[remoteEditorId];
      let target: EditorWindowBootstrap;
      try {
        target = await editorWindows.create(transferId, {
          document: source.document,
          editor: remoteEditor,
        });
      } catch (error) {
        editorStore.getState().closeEditor(remoteEditorId);
        throw error;
      }
      const latest = editorStore.getState();
      remoteViews.set(remoteEditor.editorId, target.windowLabel);
      editorStore.setState({
        editorsById: {
          ...latest.editorsById,
          [remoteEditor.editorId]: { ...remoteEditor, windowLabel: target.windowLabel },
        },
      });
      try {
        const ready = committedReadyViews.has(remoteEditor.editorId)
          ? Promise.resolve()
          : new Promise<void>((resolve, reject) => {
              const timer = setTimeout(() => {
                readyWaiters.delete(remoteEditor.editorId);
                reject(new Error("辅助窗口初始化超时，源标签已保留"));
              }, 15000);
              readyWaiters.set(remoteEditor.editorId, { resolve, reject, timer });
            });
        await completeEditorWindowTransfer(mode, {
          ready,
          checkpoint: async () => {
            await checkpoint();
            await editorWindows.show(target.windowLabel);
          },
          removeSource: () => editorStore.getState().closeEditor(editorId),
        });
      } catch (error) {
        remoteViews.delete(remoteEditor.editorId);
        committedReadyViews.delete(remoteEditor.editorId);
        disposers.get(remoteEditor.editorId)?.();
        disposers.delete(remoteEditor.editorId);
        editorStore.getState().closeEditor(remoteEditor.editorId);
        await editorWindows
          .discard(target.windowLabel, transferId)
          .catch((cleanupError) => console.error("清理辅助窗口失败", cleanupError));
        throw error;
      }
    },
  );
  if (targetEditorId)
    await (
      await import("./editor_input_lease_coordinator")
    ).editorInputLeaseCoordinator.requestLease(targetEditorId);
}
