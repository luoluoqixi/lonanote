import { createStore } from "zustand/vanilla";

import { assertWindowCanOpen } from "@/api/common/window_close_preparation";

import {
  type DocumentLoadState,
  type DocumentModel,
  type DocumentSaveState,
  type EditorDocumentRef,
  getEditorDocumentKey,
  getEditorDocumentTitle,
  isDocumentDirty,
  normalizeEditorDocumentRef,
  normalizeEditorDocumentText,
} from "./editor_document_types";
import {
  type EditorGroup,
  type EditorLayoutNode,
  getLayoutGroupIds,
  pruneLayoutGroups,
  setLayoutSplitRatio,
  splitLayoutGroup,
} from "./editor_group_model";
import {
  EMPTY_EDITOR_STATE_SNAPSHOT,
  type EditorBridgeState,
  type EditorPreferences,
  type EditorStateSnapshot,
  type EditorViewSession,
} from "./editor_view_types";

export type OpenEditorOptions = {
  duplicate?: boolean;
  groupId?: string | null;
  readOnly?: boolean;
  previewMode?: boolean;
  initialText?: string;
};

export type OpenEditorResult = {
  documentId: string;
  editorId: string;
  reusedView: boolean;
};

export type WorkspaceViewerSession = {
  kind: "viewer";
  viewerId: string;
  groupId: string | null;
  windowLabel?: string;
  viewerKind: "image" | "video" | "pdf" | "unknown";
  ref: Extract<EditorDocumentRef, { kind: "workspaceFile" }>;
  title: string;
  identityRevision: number;
};

export type EditorStoreState = {
  groupsById: Record<string, EditorGroup>;
  layout: EditorLayoutNode;
  activeGroupId: string;
  setActiveGroup: (groupId: string) => void;
  splitEditor: (
    editorId: string,
    direction: "row" | "column",
    placement?: "before" | "after",
  ) => string;
  moveEditorToGroup: (editorId: string, groupId: string, beforeId?: string | null) => void;
  duplicateEditor: (editorId: string, groupId: string) => string;
  attachRemoteEditor: (editorId: string, targetWindowLabel: string) => string;
  attachRemoteViewer: (viewerId: string, targetWindowLabel: string) => string;
  openRemoteViewer: (
    ref: WorkspaceViewerSession["ref"],
    kind: WorkspaceViewerSession["viewerKind"],
    targetWindowLabel: string,
    options?: { groupId?: string; duplicate?: boolean },
  ) => string;
  openRemoteEditor: (
    ref: EditorDocumentRef,
    targetWindowLabel: string,
    options?: OpenEditorOptions,
  ) => OpenEditorResult;
  restoreRemoteEditor: (editorId: string, groupId?: string) => void;
  setSplitRatio: (splitId: string, ratio: number) => void;
  documentIds: string[];
  documentsById: Record<string, DocumentModel>;
  documentIdByKey: Record<string, string>;
  /** 文本和只读查看器共用标签顺序、活动 ID；查看器不进入 documentsById。 */
  openEditorIds: string[];
  moveEditor: (editorId: string, beforeId: string | null) => void;
  viewersById: Record<string, WorkspaceViewerSession>;
  closeWorkspaceViewers: (workspaceId: string) => void;
  openViewer: (
    ref: WorkspaceViewerSession["ref"],
    kind: WorkspaceViewerSession["viewerKind"],
    options?: { groupId?: string; duplicate?: boolean },
  ) => string;
  editorsById: Record<string, EditorViewSession>;
  activeEditorId: string | null;
  openEditor: (ref: EditorDocumentRef, options?: OpenEditorOptions) => OpenEditorResult;
  closeEditor: (editorId: string) => void;
  reserveDocumentTarget: (
    documentId: string,
    ref: Exclude<EditorDocumentRef, { kind: "untitled" }>,
  ) => () => void;
  bindDocumentFile: (
    documentId: string,
    targetRef: Exclude<EditorDocumentRef, { kind: "untitled" }>,
    expectedIdentityRevision: number,
  ) => void;
  reserveWorkspacePaths: (workspaceId: string, paths: string[]) => () => void;
  assertWorkspaceRename: (workspaceId: string, from: string, to: string) => void;
  renameWorkspacePath: (workspaceId: string, from: string, to: string) => void;
  removeWorkspacePaths: (workspaceId: string, paths: string[]) => void;
  setActiveEditor: (editorId: string | null) => void;
  setDocumentLoadState: (
    documentId: string,
    state: DocumentLoadState,
    error?: string | null,
  ) => void;
  setDocumentPersistedSnapshot: (
    documentId: string,
    text: string,
    fingerprint?: DocumentModel["savedFingerprint"],
  ) => void;
  setDocumentDraft: (documentId: string, draft: string) => void;
  markDocumentSaved: (
    documentId: string,
    savedRevision: number,
    savedText: string,
    savedFingerprint?: DocumentModel["savedFingerprint"],
  ) => void;
  discardDocumentDraft: (documentId: string) => void;
  setDocumentSaveState: (
    documentId: string,
    state: DocumentSaveState,
    error?: string | null,
  ) => void;
  setDocumentConflict: (
    documentId: string,
    externalFingerprint: DocumentModel["savedFingerprint"],
  ) => void;
  clearDocumentConflict: (
    documentId: string,
    externalFingerprint?: DocumentModel["savedFingerprint"],
  ) => void;
  setDocumentEditOwner: (documentId: string, editorId: string | null) => void;
  setEditorBridgeState: (editorId: string, state: EditorBridgeState, generation?: number) => void;
  setEditorPreferenceOverrides: (
    editorId: string,
    preferenceOverrides: Partial<EditorPreferences>,
  ) => void;
  setEditorPreviewMode: (editorId: string, previewMode: boolean) => void;
  setEditorStateSnapshot: (editorId: string, snapshot: EditorStateSnapshot) => void;
  setEditorPendingAnchor: (editorId: string, fragment: string | null) => void;
};

const pathReservations = new Map<symbol, { workspaceId: string; paths: string[] }>();
const within = (path: string, parent: string) =>
  parent === "" || path === parent || path.startsWith(`${parent}/`);
const documentTargetReservations = new Map<
  string,
  { documentId: string; ref: Exclude<EditorDocumentRef, { kind: "untitled" }> }
>();
let nextRuntimeSequence = 1;

function createRuntimeId(prefix: string): string {
  const randomId = globalThis.crypto?.randomUUID?.();
  if (randomId) {
    return `${prefix}-${randomId}`;
  }

  const sequence = nextRuntimeSequence;
  nextRuntimeSequence += 1;
  return `${prefix}-${Date.now().toString(36)}-${sequence}`;
}

function createDocument(
  ref: EditorDocumentRef,
  documentId: string,
  documentKey: string,
  initialText: string,
): DocumentModel {
  initialText = normalizeEditorDocumentText(initialText);
  return {
    documentId,
    documentKey,
    identityRevision: 0,
    ref,
    title: getEditorDocumentTitle(ref),
    loadState: ref.kind === "untitled" ? "ready" : "idle",
    loadError: null,
    draft: initialText,
    draftRevision: 0,
    savedText: ref.kind === "untitled" ? "" : initialText,
    savedRevision: ref.kind === "untitled" && initialText ? -1 : 0,
    savedFingerprint: null,
    saveState: "idle",
    saveError: null,
    conflict: null,
    editOwnerEditorId: null,
    attachedEditorIds: [],
  };
}

function createView(
  documentId: string,
  editorId: string,
  options: OpenEditorOptions,
): EditorViewSession {
  return {
    editorId,
    documentId,
    groupId: options.groupId ?? null,
    readOnly: options.readOnly ?? false,
    previewMode: options.previewMode ?? false,
    preferenceOverrides: {},
    bridgeState: "detached",
    bridgeGeneration: 0,
    surfaceCapabilities: null,
    editorState: EMPTY_EDITOR_STATE_SNAPSHOT,
    pendingAnchor: null,
  };
}

function updateDocument(
  state: EditorStoreState,
  documentId: string,
  updater: (document: DocumentModel) => DocumentModel,
): Partial<EditorStoreState> | null {
  const document = state.documentsById[documentId];
  if (!document) return null;
  return {
    documentsById: {
      ...state.documentsById,
      [documentId]: updater(document),
    },
  };
}

const initialGroupId = createRuntimeId("group");

/** 旧快照缺少组状态时自动迁移；关闭空组时折叠布局。 */
function normalizeGroups(state: EditorStoreState, collapse = false): EditorStoreState {
  let groupsById = { ...state.groupsById };
  let activeGroupId = groupsById[state.activeGroupId]
    ? state.activeGroupId
    : (Object.keys(groupsById)[0] ?? initialGroupId);
  if (!Object.keys(groupsById).length)
    groupsById[activeGroupId] = { groupId: activeGroupId, tabIds: [], activeTabId: null };
  const valid = new Set(state.openEditorIds);
  const assigned = new Set<string>();
  for (const [id, group] of Object.entries(groupsById)) {
    const tabIds = group.tabIds.filter((tab) => valid.has(tab) && !assigned.has(tab));
    tabIds.forEach((tab) => assigned.add(tab));
    groupsById[id] = { ...group, tabIds };
  }
  const editorsById = { ...state.editorsById };
  const viewersById = { ...state.viewersById };
  for (const tab of state.openEditorIds) {
    const view = editorsById[tab] ?? viewersById[tab];
    if (!view) continue;
    let groupId = Object.values(groupsById).find((group) => group.tabIds.includes(tab))?.groupId;
    if (!groupId) {
      groupId = view.groupId && groupsById[view.groupId] ? view.groupId : activeGroupId;
      groupsById[groupId] = {
        ...groupsById[groupId],
        tabIds: [...groupsById[groupId].tabIds, tab],
      };
    }
    if (view.groupId !== groupId) {
      if (editorsById[tab]) editorsById[tab] = { ...editorsById[tab], groupId };
      else viewersById[tab] = { ...viewersById[tab], groupId };
    }
  }
  if (collapse) {
    const nonempty = Object.values(groupsById).filter((group) => group.tabIds.length);
    groupsById = Object.fromEntries(
      (nonempty.length ? nonempty : [groupsById[activeGroupId]]).map((group) => [
        group.groupId,
        group,
      ]),
    );
  }
  let layout = pruneLayoutGroups(
    state.layout ?? { kind: "group", groupId: activeGroupId },
    new Set(Object.keys(groupsById)),
  );
  if (!layout) layout = { kind: "group", groupId: Object.keys(groupsById)[0] };
  for (const groupId of Object.keys(groupsById))
    if (!getLayoutGroupIds(layout).includes(groupId)) {
      layout = {
        kind: "split",
        splitId: createRuntimeId("split"),
        direction: "row",
        ratio: 0.5,
        first: layout,
        second: { kind: "group", groupId },
      };
    }
  if (!groupsById[activeGroupId]) activeGroupId = getLayoutGroupIds(layout)[0];
  for (const [id, group] of Object.entries(groupsById)) {
    const activeTabId =
      id === activeGroupId && state.activeEditorId && group.tabIds.includes(state.activeEditorId)
        ? state.activeEditorId
        : group.activeTabId === null || group.tabIds.includes(group.activeTabId)
          ? group.activeTabId
          : (group.tabIds.at(-1) ?? null);
    groupsById[id] = { ...group, activeTabId };
  }
  return {
    ...state,
    groupsById,
    layout,
    activeGroupId,
    editorsById,
    viewersById,
    activeEditorId: groupsById[activeGroupId].activeTabId,
  };
}

export function findMatchingGroupTab(state: EditorStoreState, editorId: string, groupId: string) {
  const editor = state.editorsById[editorId];
  const viewer = state.viewersById[editorId];
  return state.groupsById[groupId]?.tabIds.find(
    (id) =>
      id !== editorId &&
      (editor
        ? state.editorsById[id]?.documentId === editor.documentId
        : viewer &&
          state.viewersById[id] &&
          getEditorDocumentKey(state.viewersById[id].ref) === getEditorDocumentKey(viewer.ref)),
  );
}

export const editorStore = createStore<EditorStoreState>()((rawSet, rawGet) => {
  const get = () => normalizeGroups(rawGet(), rawGet().openEditorIds.length === 0);
  const set = (change: Partial<EditorStoreState>) => {
    const previous = get();
    const next = { ...previous, ...change };
    rawSet(
      normalizeGroups(
        next,
        previous.openEditorIds.some((id) => !next.openEditorIds.includes(id)),
      ),
    );
  };
  return {
    groupsById: { [initialGroupId]: { groupId: initialGroupId, tabIds: [], activeTabId: null } },
    layout: { kind: "group", groupId: initialGroupId },
    activeGroupId: initialGroupId,
    setActiveGroup: (groupId) => {
      const state = get();
      if (state.groupsById[groupId])
        set({ activeGroupId: groupId, activeEditorId: state.groupsById[groupId].activeTabId });
    },
    setSplitRatio: (splitId, ratio) =>
      set({ layout: setLayoutSplitRatio(get().layout, splitId, ratio) }),
    attachRemoteEditor: (editorId, targetWindowLabel) => {
      assertWindowCanOpen();
      if (!targetWindowLabel) throw new Error("目标窗口不存在");
      const state = get();
      const viewer = state.viewersById[editorId];
      const newId = createRuntimeId(viewer ? "viewer" : "editor");
      if (viewer) {
        set({
          viewersById: {
            ...state.viewersById,
            [newId]: { ...viewer, viewerId: newId, groupId: null, windowLabel: targetWindowLabel },
          },
        });
        return newId;
      }
      const source = state.editorsById[editorId];
      if (!source) throw new Error("标签不存在");
      const document = state.documentsById[source.documentId];
      set({
        editorsById: {
          ...state.editorsById,
          [newId]: {
            ...source,
            editorId: newId,
            groupId: null,
            windowLabel: targetWindowLabel,
            bridgeState: "detached",
            bridgeGeneration: 0,
            surfaceCapabilities: null,
          },
        },
        documentsById: {
          ...state.documentsById,
          [document.documentId]: {
            ...document,
            attachedEditorIds: [...document.attachedEditorIds, newId],
          },
        },
      });
      return newId;
    },
    attachRemoteViewer: (viewerId, targetWindowLabel) => {
      if (!get().viewersById[viewerId]) throw new Error("查看器不存在");
      return get().attachRemoteEditor(viewerId, targetWindowLabel);
    },
    openRemoteViewer: (ref, viewerKind, targetWindowLabel, options = {}) => {
      assertWindowCanOpen();
      if (!targetWindowLabel) throw new Error("目标窗口不存在");
      const normalized = normalizeEditorDocumentRef(ref);
      if (normalized.kind !== "workspaceFile") throw new Error("查看器仅支持工作区文件");
      for (const reservation of pathReservations.values())
        if (
          reservation.workspaceId === normalized.workspaceId &&
          reservation.paths.some((path) => within(normalized.filePath, path))
        )
          throw new Error("此路径正在执行文件操作，请稍后重试");
      const state = get();
      const groupId = options.groupId ?? null;
      const existing =
        !options.duplicate &&
        Object.values(state.viewersById).find(
          (view) =>
            view.windowLabel === targetWindowLabel &&
            view.groupId === groupId &&
            getEditorDocumentKey(view.ref) === getEditorDocumentKey(normalized),
        );
      if (existing) return existing.viewerId;
      const viewerId = createRuntimeId("viewer");
      set({
        viewersById: {
          ...state.viewersById,
          [viewerId]: {
            kind: "viewer",
            viewerId,
            groupId,
            windowLabel: targetWindowLabel,
            viewerKind,
            ref: normalized,
            title: getEditorDocumentTitle(normalized),
            identityRevision: 0,
          },
        },
      });
      return viewerId;
    },
    openRemoteEditor: (ref, targetWindowLabel, options = {}) => {
      assertWindowCanOpen();
      if (!targetWindowLabel) throw new Error("目标窗口不存在");
      const normalizedRef = normalizeEditorDocumentRef(ref);
      const documentKey =
        normalizedRef.kind === "untitled"
          ? `untitled:${createRuntimeId("document")}`
          : getEditorDocumentKey(normalizedRef);
      if (documentTargetReservations.has(documentKey))
        throw new Error("该路径正在保存文档，请稍后重试");
      if (normalizedRef.kind === "workspaceFile")
        for (const reservation of pathReservations.values()) {
          if (
            reservation.workspaceId === normalizedRef.workspaceId &&
            reservation.paths.some((path) => within(normalizedRef.filePath, path))
          )
            throw new Error("此路径正在执行文件操作，请稍后重试");
        }
      const state = get();
      const existingDocumentId = state.documentIdByKey[documentKey];
      const documentId = existingDocumentId ?? createRuntimeId("document");
      const document = existingDocumentId
        ? state.documentsById[existingDocumentId]
        : createDocument(normalizedRef, documentId, documentKey, options.initialText ?? "");
      if (!document) throw new Error("Editor document 状态异常");
      const groupId = options.groupId ?? null;
      const existing =
        !options.duplicate &&
        document.attachedEditorIds
          .map((id) => state.editorsById[id])
          .find((view) => view?.windowLabel === targetWindowLabel && view.groupId === groupId);
      if (existing) return { documentId, editorId: existing.editorId, reusedView: true };
      const editorId = createRuntimeId("editor");
      const view = {
        ...createView(documentId, editorId, { ...options, groupId }),
        windowLabel: targetWindowLabel,
      };
      set({
        documentIds: existingDocumentId ? state.documentIds : [...state.documentIds, documentId],
        documentsById: {
          ...state.documentsById,
          [documentId]: {
            ...document,
            attachedEditorIds: [...document.attachedEditorIds, editorId],
          },
        },
        documentIdByKey: existingDocumentId
          ? state.documentIdByKey
          : { ...state.documentIdByKey, [documentKey]: documentId },
        editorsById: { ...state.editorsById, [editorId]: view },
      });
      return { documentId, editorId, reusedView: false };
    },
    restoreRemoteEditor: (editorId, requestedGroupId) => {
      const state = get();
      const view = state.editorsById[editorId] ?? state.viewersById[editorId];
      if (!view || state.openEditorIds.includes(editorId)) return;
      const groupId = requestedGroupId ?? state.activeGroupId;
      const group = state.groupsById[groupId];
      if (!group) throw new Error("标签组不存在");
      const textView = state.editorsById[editorId];
      set({
        openEditorIds: [...state.openEditorIds, editorId],
        activeGroupId: groupId,
        activeEditorId: editorId,
        groupsById: {
          ...state.groupsById,
          [groupId]: { ...group, tabIds: [...group.tabIds, editorId], activeTabId: editorId },
        },
        ...(textView
          ? {
              editorsById: {
                ...state.editorsById,
                [editorId]: {
                  ...textView,
                  groupId,
                  windowLabel: undefined,
                  bridgeState: "detached",
                  bridgeGeneration: 0,
                  surfaceCapabilities: null,
                },
              },
            }
          : {
              viewersById: {
                ...state.viewersById,
                [editorId]: { ...state.viewersById[editorId], groupId, windowLabel: undefined },
              },
            }),
      });
    },
    splitEditor: (editorId, direction, placement) => {
      assertWindowCanOpen();
      const state = get();
      const source = state.editorsById[editorId] ?? state.viewersById[editorId];
      if (!source?.groupId) throw new Error("标签不存在");
      const groupId = createRuntimeId("group");
      set({
        groupsById: { ...state.groupsById, [groupId]: { groupId, tabIds: [], activeTabId: null } },
        layout: splitLayoutGroup(
          state.layout,
          source.groupId,
          groupId,
          direction,
          createRuntimeId("split"),
          placement,
        ),
      });
      try {
        get().duplicateEditor(editorId, groupId);
      } catch (error) {
        set({
          groupsById: state.groupsById,
          layout: state.layout,
          activeGroupId: state.activeGroupId,
          activeEditorId: state.activeEditorId,
        });
        throw error;
      }
      return groupId;
    },
    duplicateEditor: (editorId, groupId) => {
      assertWindowCanOpen();
      const state = get();
      if (!state.groupsById[groupId]) throw new Error("标签组不存在");
      const viewer = state.viewersById[editorId];
      if (viewer)
        return get().openViewer(viewer.ref, viewer.viewerKind, { groupId, duplicate: true });
      const source = state.editorsById[editorId];
      if (!source) throw new Error("标签不存在");
      const document = state.documentsById[source.documentId];
      const newId = createRuntimeId("editor");
      const view = {
        ...source,
        windowLabel: undefined,
        editorId: newId,
        groupId,
        bridgeState: "detached" as const,
        bridgeGeneration: 0,
        surfaceCapabilities: null,
      };
      set({
        activeGroupId: groupId,
        activeEditorId: newId,
        openEditorIds: [...state.openEditorIds, newId],
        groupsById: {
          ...state.groupsById,
          [groupId]: {
            ...state.groupsById[groupId],
            tabIds: [...state.groupsById[groupId].tabIds, newId],
            activeTabId: newId,
          },
        },
        editorsById: { ...state.editorsById, [newId]: view },
        documentsById: {
          ...state.documentsById,
          [document.documentId]: {
            ...document,
            attachedEditorIds: [...document.attachedEditorIds, newId],
          },
        },
      });
      return newId;
    },
    moveEditorToGroup: (editorId, groupId, beforeId = null) => {
      const state = get();
      if (
        !state.groupsById[groupId] ||
        !state.openEditorIds.includes(editorId) ||
        beforeId === editorId
      )
        return;
      if (beforeId && !state.groupsById[groupId].tabIds.includes(beforeId)) return;
      const existing = findMatchingGroupTab(state, editorId, groupId);
      if (existing) {
        // 同一文档的不同视图合并到目标已有标签，不经过文档关闭确认。
        get().closeEditor(editorId);
        get().setActiveEditor(existing);
        return;
      }
      const groupsById = Object.fromEntries(
        Object.entries(state.groupsById).map(([id, group]) => [
          id,
          { ...group, tabIds: group.tabIds.filter((tab) => tab !== editorId) },
        ]),
      );
      const target = groupsById[groupId];
      target.tabIds.splice(
        beforeId ? target.tabIds.indexOf(beforeId) : target.tabIds.length,
        0,
        editorId,
      );
      target.activeTabId = editorId;
      const next = normalizeGroups(
        { ...state, groupsById, activeGroupId: groupId, activeEditorId: editorId },
        true,
      );
      set({
        ...next,
        openEditorIds: getLayoutGroupIds(next.layout).flatMap((id) => next.groupsById[id].tabIds),
      });
    },
    documentIds: [],
    documentsById: {},
    documentIdByKey: {},
    openEditorIds: [],
    viewersById: {},
    editorsById: {},
    activeEditorId: null,

    closeWorkspaceViewers: (workspaceId) => {
      for (const viewer of Object.values(get().viewersById))
        if (viewer.ref.workspaceId === workspaceId) get().closeEditor(viewer.viewerId);
    },

    openViewer: (ref, viewerKind, options = {}) => {
      assertWindowCanOpen();
      const normalized = normalizeEditorDocumentRef(ref);
      if (normalized.kind !== "workspaceFile") throw new Error("查看器仅支持工作区文件");
      for (const reservation of pathReservations.values()) {
        if (
          reservation.workspaceId === normalized.workspaceId &&
          reservation.paths.some((p) => within(normalized.filePath, p))
        )
          throw new Error("此路径正在执行文件操作，请稍后重试");
      }
      const state = get();
      const groupId = options.groupId ?? state.activeGroupId;
      if (!state.groupsById[groupId]) throw new Error("标签组不存在");
      const existing =
        !options.duplicate &&
        Object.values(state.viewersById).find(
          (v) =>
            state.openEditorIds.includes(v.viewerId) &&
            v.groupId === groupId &&
            getEditorDocumentKey(v.ref) === getEditorDocumentKey(normalized),
        );
      if (existing) {
        set({ activeGroupId: groupId, activeEditorId: existing.viewerId });
        return existing.viewerId;
      }
      const viewerId = createRuntimeId("viewer");
      set({
        viewersById: {
          ...state.viewersById,
          [viewerId]: {
            kind: "viewer",
            viewerId,
            viewerKind,
            groupId,
            ref: normalized,
            title: getEditorDocumentTitle(normalized),
            identityRevision: 0,
          },
        },
        openEditorIds: [...state.openEditorIds, viewerId],
        activeGroupId: groupId,
        activeEditorId: viewerId,
      });
      return viewerId;
    },

    openEditor: (ref, options = {}) => {
      assertWindowCanOpen();
      const normalizedRef = normalizeEditorDocumentRef(ref);
      const documentKey =
        normalizedRef.kind === "untitled"
          ? `untitled:${createRuntimeId("document")}`
          : getEditorDocumentKey(normalizedRef);
      const state = get();
      const groupId = options.groupId ?? state.activeGroupId;
      if (!state.groupsById[groupId]) throw new Error("标签组不存在");
      const existingDocumentId = state.documentIdByKey[documentKey];
      if (documentTargetReservations.has(documentKey))
        throw new Error("该路径正在保存文档，请稍后重试");
      const documentId = existingDocumentId ?? createRuntimeId("document");
      const document = existingDocumentId
        ? state.documentsById[existingDocumentId]
        : createDocument(normalizedRef, documentId, documentKey, options.initialText ?? "");

      if (!document) {
        throw new Error("Editor document 状态异常");
      }

      if (!options.duplicate) {
        const existingEditor = document.attachedEditorIds
          .map((editorId) => state.editorsById[editorId])
          .find(
            (editor) =>
              editor != null &&
              state.openEditorIds.includes(editor.editorId) &&
              editor.groupId === groupId,
          );
        if (existingEditor) {
          set({ activeGroupId: groupId, activeEditorId: existingEditor.editorId });
          return {
            documentId,
            editorId: existingEditor.editorId,
            reusedView: true,
          };
        }
      }

      if (normalizedRef.kind === "workspaceFile") {
        for (const reservation of pathReservations.values()) {
          if (
            reservation.workspaceId === normalizedRef.workspaceId &&
            reservation.paths.some((path) => within(normalizedRef.filePath, path))
          )
            throw new Error("此路径正在执行文件操作，请稍后重试");
        }
      }
      const editorId = createRuntimeId("editor");
      const view = createView(documentId, editorId, { ...options, groupId });
      const nextDocument = {
        ...document,
        attachedEditorIds: [...document.attachedEditorIds, editorId],
      };

      set({
        documentIds: existingDocumentId ? state.documentIds : [...state.documentIds, documentId],
        documentsById: {
          ...state.documentsById,
          [documentId]: nextDocument,
        },
        documentIdByKey: existingDocumentId
          ? state.documentIdByKey
          : { ...state.documentIdByKey, [documentKey]: documentId },
        openEditorIds: [...state.openEditorIds, editorId],
        editorsById: {
          ...state.editorsById,
          [editorId]: view,
        },
        activeGroupId: groupId,
        activeEditorId: editorId,
      });

      return { documentId, editorId, reusedView: false };
    },

    reserveDocumentTarget: (documentId, ref) => {
      if (ref.kind === "workspaceFile") {
        for (const reservation of pathReservations.values()) {
          if (
            reservation.workspaceId === ref.workspaceId &&
            reservation.paths.some((path) => within(ref.filePath, path))
          )
            throw new Error("目标路径正在执行文件操作，请稍后重试");
        }
      }
      const key = getEditorDocumentKey(ref);
      const existing = get().documentIdByKey[key];
      if ((existing && existing !== documentId) || documentTargetReservations.has(key))
        throw new Error("目标路径已有打开或正在保存的文档");
      documentTargetReservations.set(key, { documentId, ref });
      return () => {
        if (documentTargetReservations.get(key)?.documentId === documentId)
          documentTargetReservations.delete(key);
      };
    },

    bindDocumentFile: (documentId, targetRef, expectedIdentityRevision) => {
      const state = get();
      const document = state.documentsById[documentId];
      if (!document || document.identityRevision !== expectedIdentityRevision)
        throw new Error("文档身份已变化，请重新保存");
      const ref = normalizeEditorDocumentRef(targetRef);
      if (ref.kind === "untitled") throw new Error("保存目标必须是文件");
      const documentKey = getEditorDocumentKey(ref);
      const existing = state.documentIdByKey[documentKey];
      if (existing && existing !== documentId) throw new Error("目标路径已有打开的文档");
      if (ref.kind === "workspaceFile") {
        for (const reservation of pathReservations.values()) {
          if (
            reservation.workspaceId === ref.workspaceId &&
            reservation.paths.some((path) => within(ref.filePath, path))
          )
            throw new Error("此路径正在执行文件操作，请稍后重试");
        }
      }
      const documentIdByKey = { ...state.documentIdByKey };
      delete documentIdByKey[document.documentKey];
      documentIdByKey[documentKey] = documentId;
      set({
        documentIdByKey,
        documentsById: {
          ...state.documentsById,
          [documentId]: {
            ...document,
            ref,
            documentKey,
            title: getEditorDocumentTitle(ref),
            identityRevision: document.identityRevision + 1,
          },
        },
      });
    },

    closeEditor: (editorId) => {
      const state = get();
      const editor = state.editorsById[editorId];
      if (!editor) {
        if (!state.viewersById[editorId]) return;
        const viewersById = { ...state.viewersById };
        delete viewersById[editorId];
        const openEditorIds = state.openEditorIds.filter((id) => id !== editorId);
        set({
          viewersById,
          openEditorIds,
          activeEditorId:
            state.activeEditorId === editorId
              ? (openEditorIds.at(-1) ?? null)
              : state.activeEditorId,
        });
        return;
      }
      const document = state.documentsById[editor.documentId];
      const nextEditorsById = { ...state.editorsById };
      delete nextEditorsById[editorId];

      const nextOpenEditorIds = state.openEditorIds.filter((id) => id !== editorId);
      const activeEditorId =
        state.activeEditorId === editorId
          ? (nextOpenEditorIds.at(-1) ?? null)
          : state.activeEditorId;
      const nextDocumentsById = { ...state.documentsById };
      const nextDocumentIdByKey = { ...state.documentIdByKey };
      let nextDocumentIds = state.documentIds;

      if (document) {
        const attachedEditorIds = document.attachedEditorIds.filter((id) => id !== editorId);
        if (attachedEditorIds.length === 0 && !isDocumentDirty(document)) {
          delete nextDocumentsById[document.documentId];
          delete nextDocumentIdByKey[document.documentKey];
          nextDocumentIds = state.documentIds.filter((id) => id !== document.documentId);
        } else {
          nextDocumentsById[document.documentId] = {
            ...document,
            attachedEditorIds,
            editOwnerEditorId:
              document.editOwnerEditorId === editorId ? null : document.editOwnerEditorId,
          };
        }
      }

      set({
        openEditorIds: nextOpenEditorIds,
        editorsById: nextEditorsById,
        activeEditorId,
        documentIds: nextDocumentIds,
        documentsById: nextDocumentsById,
        documentIdByKey: nextDocumentIdByKey,
      });
    },

    reserveWorkspacePaths: (workspaceId, paths) => {
      for (const { ref } of documentTargetReservations.values()) {
        if (
          ref.kind === "workspaceFile" &&
          ref.workspaceId === workspaceId &&
          paths.some((path) => within(ref.filePath, path) || within(path, ref.filePath))
        )
          throw new Error("相关路径有正在保存的文档，请稍后重试");
      }
      for (const reservation of pathReservations.values()) {
        if (
          reservation.workspaceId === workspaceId &&
          reservation.paths.some((a) => paths.some((b) => within(a, b) || within(b, a)))
        )
          throw new Error("相关路径已有文件操作正在进行");
      }
      const key = Symbol();
      pathReservations.set(key, { workspaceId, paths });
      return () => {
        pathReservations.delete(key);
      };
    },

    assertWorkspaceRename: (workspaceId, from, to) => {
      const state = get();
      const affected = Object.values(state.documentsById).filter(
        (d) =>
          d.ref.kind === "workspaceFile" &&
          d.ref.workspaceId === workspaceId &&
          (d.ref.filePath === from || d.ref.filePath.startsWith(`${from}/`)),
      );
      const ids = new Set(affected.map((d) => d.documentId));
      for (const document of affected) {
        if (document.ref.kind !== "workspaceFile") continue;
        const key = getEditorDocumentKey({
          ...document.ref,
          filePath: to + document.ref.filePath.slice(from.length),
        });
        const other = state.documentIdByKey[key];
        if (other && !ids.has(other)) throw new Error("目标路径已有打开的文档");
      }
    },

    renameWorkspacePath: (workspaceId, from, to) => {
      get().assertWorkspaceRename(workspaceId, from, to);
      const state = get();
      const documentsById = { ...state.documentsById };
      const documentIdByKey = { ...state.documentIdByKey };
      for (const document of Object.values(state.documentsById)) {
        if (
          document.ref.kind !== "workspaceFile" ||
          document.ref.workspaceId !== workspaceId ||
          !(document.ref.filePath === from || document.ref.filePath.startsWith(`${from}/`))
        )
          continue;
        const ref = normalizeEditorDocumentRef({
          ...document.ref,
          filePath: to + document.ref.filePath.slice(from.length),
        });
        if (ref.kind !== "workspaceFile") continue;
        const key = getEditorDocumentKey(ref);
        delete documentIdByKey[document.documentKey];
        documentIdByKey[key] = document.documentId;
        documentsById[document.documentId] = {
          ...document,
          ref,
          documentKey: key,
          title: getEditorDocumentTitle(ref),
          identityRevision: document.identityRevision + 1,
          loadState: document.loadState === "loading" ? "idle" : document.loadState,
        };
      }
      const viewersById = Object.fromEntries(
        Object.entries(state.viewersById).map(([id, viewer]) => {
          if (viewer.ref.workspaceId !== workspaceId || !within(viewer.ref.filePath, from))
            return [id, viewer];
          const ref = { ...viewer.ref, filePath: to + viewer.ref.filePath.slice(from.length) };
          return [
            id,
            {
              ...viewer,
              ref,
              title: getEditorDocumentTitle(ref),
              identityRevision: viewer.identityRevision + 1,
            },
          ];
        }),
      );
      set({ documentsById, documentIdByKey, viewersById });
    },

    removeWorkspacePaths: (workspaceId, paths) => {
      const state = get();
      const removed = new Set(
        Object.values(state.documentsById)
          .filter(
            (d) =>
              d.ref.kind === "workspaceFile" &&
              d.ref.workspaceId === workspaceId &&
              paths.some(
                (p) =>
                  d.ref.kind === "workspaceFile" &&
                  (d.ref.filePath === p || d.ref.filePath.startsWith(`${p}/`)),
              ),
          )
          .map((d) => d.documentId),
      );
      const documentsById = Object.fromEntries(
        Object.entries(state.documentsById).filter(([id]) => !removed.has(id)),
      );
      const editorsById = Object.fromEntries(
        Object.entries(state.editorsById).filter(([, editor]) => !removed.has(editor.documentId)),
      );
      const viewersById = Object.fromEntries(
        Object.entries(state.viewersById).filter(
          ([, viewer]) =>
            viewer.ref.workspaceId !== workspaceId ||
            !paths.some((p) => within(viewer.ref.filePath, p)),
        ),
      );
      const openEditorIds = state.openEditorIds.filter((id) =>
        Boolean(editorsById[id] || viewersById[id]),
      );
      set({
        documentsById,
        documentIds: state.documentIds.filter((id) => !removed.has(id)),
        documentIdByKey: Object.fromEntries(
          Object.entries(state.documentIdByKey).filter(([, id]) => !removed.has(id)),
        ),
        editorsById,
        viewersById,
        openEditorIds,
        activeEditorId:
          state.activeEditorId &&
          (editorsById[state.activeEditorId] || viewersById[state.activeEditorId])
            ? state.activeEditorId
            : (openEditorIds.at(-1) ?? null),
      });
    },

    moveEditor: (editorId, beforeId) => {
      const state = get();
      const group = Object.values(state.groupsById).find((group) =>
        group.tabIds.includes(editorId),
      );
      if (group) {
        if (beforeId === editorId || (beforeId !== null && !group.tabIds.includes(beforeId)))
          return;
        const tabIds = group.tabIds.filter((id) => id !== editorId);
        tabIds.splice(beforeId === null ? tabIds.length : tabIds.indexOf(beforeId), 0, editorId);
        const groupsById = { ...state.groupsById, [group.groupId]: { ...group, tabIds } };
        set({
          groupsById,
          openEditorIds: getLayoutGroupIds(state.layout).flatMap((id) => groupsById[id].tabIds),
        });
      }
    },
    setActiveEditor: (editorId) => {
      const state = get();
      if (editorId === null) {
        set({
          groupsById: {
            ...state.groupsById,
            [state.activeGroupId]: { ...state.groupsById[state.activeGroupId], activeTabId: null },
          },
          activeEditorId: null,
        });
        return;
      }
      const group = Object.values(state.groupsById).find((group) =>
        group.tabIds.includes(editorId),
      );
      if (group) set({ activeGroupId: group.groupId, activeEditorId: editorId });
    },

    setDocumentLoadState: (documentId, loadState, loadError = null) => {
      const change = updateDocument(get(), documentId, (document) => ({
        ...document,
        loadState,
        loadError,
      }));
      if (change) set(change);
    },

    setDocumentPersistedSnapshot: (documentId, text, savedFingerprint = null) => {
      text = normalizeEditorDocumentText(text);
      const change = updateDocument(get(), documentId, (document) => {
        const revision =
          document.draft === text ? document.draftRevision : document.draftRevision + 1;
        return {
          ...document,
          draft: text,
          draftRevision: revision,
          savedText: text,
          savedRevision: revision,
          savedFingerprint,
          saveState: "idle",
          saveError: null,
          conflict: null,
        };
      });
      if (change) set(change);
    },

    setDocumentDraft: (documentId, draft) => {
      draft = normalizeEditorDocumentText(draft);
      const change = updateDocument(get(), documentId, (document) => {
        const draftRevision = document.draftRevision + 1;
        const savedRevision = draft === document.savedText ? draftRevision : document.savedRevision;
        return { ...document, draft, draftRevision, savedRevision };
      });
      if (change) set(change);
    },

    markDocumentSaved: (documentId, savedRevision, savedText, savedFingerprint) => {
      savedText = normalizeEditorDocumentText(savedText);
      const change = updateDocument(get(), documentId, (document) => {
        if (savedRevision > document.draftRevision) return document;
        const isCurrentDraft = document.draft === savedText;
        return {
          ...document,
          savedText,
          savedRevision: isCurrentDraft ? document.draftRevision : savedRevision,
          savedFingerprint: savedFingerprint ?? document.savedFingerprint,
          saveState: "idle",
          saveError: null,
          conflict: null,
        };
      });
      if (change) set(change);
    },

    discardDocumentDraft: (documentId) => {
      const change = updateDocument(get(), documentId, (document) => {
        const revision = document.draftRevision + 1;
        return {
          ...document,
          draft: document.savedText,
          draftRevision: revision,
          savedRevision: revision,
          saveState: "idle",
          saveError: null,
          conflict: null,
        };
      });
      if (change) set(change);
    },

    setDocumentSaveState: (documentId, saveState, saveError = null) => {
      const change = updateDocument(get(), documentId, (document) => ({
        ...document,
        saveState,
        saveError,
      }));
      if (change) set(change);
    },

    setDocumentConflict: (documentId, externalFingerprint) => {
      const change = updateDocument(get(), documentId, (document) => ({
        ...document,
        saveState: "conflict",
        saveError: null,
        conflict: {
          detectedAt: new Date().toISOString(),
          externalFingerprint,
        },
      }));
      if (change) set(change);
    },

    clearDocumentConflict: (documentId, externalFingerprint) => {
      const change = updateDocument(get(), documentId, (document) => ({
        ...document,
        savedFingerprint: externalFingerprint ?? document.savedFingerprint,
        saveState: "idle",
        saveError: null,
        conflict: null,
      }));
      if (change) set(change);
    },

    setDocumentEditOwner: (documentId, editorId) => {
      const state = get();
      const document = state.documentsById[documentId];
      if (!document) return;
      if (
        editorId !== null &&
        (!document.attachedEditorIds.includes(editorId) ||
          state.editorsById[editorId]?.documentId !== documentId)
      ) {
        return;
      }
      if (document.editOwnerEditorId === editorId) return;
      set({
        documentsById: {
          ...state.documentsById,
          [documentId]: { ...document, editOwnerEditorId: editorId },
        },
      });
    },

    setEditorBridgeState: (editorId, bridgeState, bridgeGeneration) => {
      const editor = get().editorsById[editorId];
      if (!editor) return;
      set({
        editorsById: {
          ...get().editorsById,
          [editorId]: {
            ...editor,
            bridgeState,
            bridgeGeneration: bridgeGeneration ?? editor.bridgeGeneration,
          },
        },
      });
    },

    setEditorPreferenceOverrides: (editorId, preferenceOverrides) => {
      const editor = get().editorsById[editorId];
      if (!editor) return;
      set({
        editorsById: {
          ...get().editorsById,
          [editorId]: {
            ...editor,
            preferenceOverrides: { ...editor.preferenceOverrides, ...preferenceOverrides },
          },
        },
      });
    },

    setEditorPreviewMode: (editorId, previewMode) => {
      const editor = get().editorsById[editorId];
      if (!editor || editor.previewMode === previewMode) return;
      set({
        editorsById: {
          ...get().editorsById,
          [editorId]: { ...editor, previewMode },
        },
      });
    },

    setEditorStateSnapshot: (editorId, editorState) => {
      const editor = get().editorsById[editorId];
      if (!editor) return;
      set({
        editorsById: {
          ...get().editorsById,
          [editorId]: { ...editor, editorState },
        },
      });
    },

    setEditorPendingAnchor: (editorId, pendingAnchor) => {
      const editor = get().editorsById[editorId];
      if (!editor) return;
      set({
        editorsById: {
          ...get().editorsById,
          [editorId]: { ...editor, pendingAnchor },
        },
      });
    },
  };
});
