import { createStore } from "zustand/vanilla";

import {
  type DocumentLoadState,
  type DocumentModel,
  type DocumentSaveState,
  type EditorDocumentRef,
  getEditorDocumentKey,
  getEditorDocumentTitle,
  isDocumentDirty,
  normalizeEditorDocumentRef,
} from "./editor_document_types";
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
  viewerKind: "image" | "video" | "pdf" | "unknown";
  ref: Extract<EditorDocumentRef, { kind: "workspaceFile" }>;
  title: string;
  identityRevision: number;
};

export type EditorStoreState = {
  documentIds: string[];
  documentsById: Record<string, DocumentModel>;
  documentIdByKey: Record<string, string>;
  /** 文本和只读查看器共用标签顺序、活动 ID；查看器不进入 documentsById。 */
  openEditorIds: string[];
  viewersById: Record<string, WorkspaceViewerSession>;
  closeWorkspaceViewers: (workspaceId: string) => void;
  openViewer: (
    ref: WorkspaceViewerSession["ref"],
    kind: WorkspaceViewerSession["viewerKind"],
  ) => string;
  editorsById: Record<string, EditorViewSession>;
  activeEditorId: string | null;
  openEditor: (ref: EditorDocumentRef, options?: OpenEditorOptions) => OpenEditorResult;
  closeEditor: (editorId: string) => void;
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
const within = (path: string, parent: string) => path === parent || path.startsWith(`${parent}/`);
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

export const editorStore = createStore<EditorStoreState>()((set, get) => ({
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

  openViewer: (ref, viewerKind) => {
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
    const existing = Object.values(state.viewersById).find(
      (v) => getEditorDocumentKey(v.ref) === getEditorDocumentKey(normalized),
    );
    if (existing) {
      set({ activeEditorId: existing.viewerId });
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
          ref: normalized,
          title: getEditorDocumentTitle(normalized),
          identityRevision: 0,
        },
      },
      openEditorIds: [...state.openEditorIds, viewerId],
      activeEditorId: viewerId,
    });
    return viewerId;
  },

  openEditor: (ref, options = {}) => {
    const normalizedRef = normalizeEditorDocumentRef(ref);
    const documentKey =
      normalizedRef.kind === "untitled"
        ? `untitled:${createRuntimeId("document")}`
        : getEditorDocumentKey(normalizedRef);
    const state = get();
    const existingDocumentId = state.documentIdByKey[documentKey];
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
        .find((editor) => editor != null);
      if (existingEditor) {
        set({ activeEditorId: existingEditor.editorId });
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
    const view = createView(documentId, editorId, options);
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
      activeEditorId: editorId,
    });

    return { documentId, editorId, reusedView: false };
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
          state.activeEditorId === editorId ? (openEditorIds.at(-1) ?? null) : state.activeEditorId,
      });
      return;
    }
    const document = state.documentsById[editor.documentId];
    const nextEditorsById = { ...state.editorsById };
    delete nextEditorsById[editorId];

    const nextOpenEditorIds = state.openEditorIds.filter((id) => id !== editorId);
    const activeEditorId =
      state.activeEditorId === editorId ? (nextOpenEditorIds.at(-1) ?? null) : state.activeEditorId;
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

  setActiveEditor: (editorId) => {
    if (editorId !== null && !get().editorsById[editorId] && !get().viewersById[editorId]) return;
    set({ activeEditorId: editorId });
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
    const change = updateDocument(get(), documentId, (document) => {
      const draftRevision = document.draftRevision + 1;
      const savedRevision = draft === document.savedText ? draftRevision : document.savedRevision;
      return { ...document, draft, draftRevision, savedRevision };
    });
    if (change) set(change);
  },

  markDocumentSaved: (documentId, savedRevision, savedText, savedFingerprint) => {
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
}));
