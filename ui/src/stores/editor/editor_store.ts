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

export type EditorStoreState = {
  documentIds: string[];
  documentsById: Record<string, DocumentModel>;
  documentIdByKey: Record<string, string>;
  openEditorIds: string[];
  editorsById: Record<string, EditorViewSession>;
  activeEditorId: string | null;
  openEditor: (ref: EditorDocumentRef, options?: OpenEditorOptions) => OpenEditorResult;
  closeEditor: (editorId: string) => void;
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
  setEditorStateSnapshot: (editorId: string, snapshot: EditorStateSnapshot) => void;
  setEditorPendingAnchor: (editorId: string, fragment: string | null) => void;
};

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
  editorsById: {},
  activeEditorId: null,

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
    if (!editor) return;
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

  setActiveEditor: (editorId) => {
    if (editorId !== null && !get().editorsById[editorId]) return;
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
