import { createStore } from "zustand/vanilla";

export type WorkspaceEditorPanel = "editor" | "info" | "outline" | "history";

export type WorkspaceEditorRecord = {
  editorId: string;
  noteId: string;
  title: string;
  createdAt: string;
  isDirty: boolean;
};

export type WorkspaceEditorState = {
  openEditorIds: string[];
  editorsById: Record<string, WorkspaceEditorRecord>;
  getDefaultEditorId: () => string | null;
  openNoteEditor: (noteId: string, options?: { duplicate?: boolean }) => string;
};

type WorkspaceEditorStoreApi = ReturnType<typeof createWorkspaceEditorStore>;

const workspaceEditorStoreInstances = new Map<string, WorkspaceEditorStoreApi>();

function createEditorRecord(noteId: string, editorId: string): WorkspaceEditorRecord {
  return {
    editorId,
    noteId,
    title: noteId,
    createdAt: new Date().toISOString(),
    isDirty: false,
  };
}

function findEditorByNoteId(
  state: WorkspaceEditorState,
  noteId: string,
): WorkspaceEditorRecord | null {
  for (const editorId of state.openEditorIds) {
    const editor = state.editorsById[editorId];
    if (editor?.noteId === noteId) {
      return editor;
    }
  }

  return null;
}

function createWorkspaceEditorStore() {
  let nextEditorSequence = 1;

  return createStore<WorkspaceEditorState>()((set, get) => ({
    openEditorIds: [],
    editorsById: {},
    getDefaultEditorId: () => {
      const [defaultEditorId] = get().openEditorIds;
      return defaultEditorId ?? null;
    },
    openNoteEditor: (noteId, options) => {
      const shouldDuplicate = options?.duplicate ?? false;
      const state = get();

      if (!shouldDuplicate) {
        const existingEditor = findEditorByNoteId(state, noteId);
        if (existingEditor) {
          return existingEditor.editorId;
        }
      }

      const editorId = `editor-${nextEditorSequence}`;
      nextEditorSequence += 1;
      const nextEditor = createEditorRecord(noteId, editorId);

      set((currentState) => ({
        openEditorIds: [...currentState.openEditorIds, nextEditor.editorId],
        editorsById: {
          ...currentState.editorsById,
          [nextEditor.editorId]: nextEditor,
        },
      }));

      return nextEditor.editorId;
    },
  }));
}

function ensureWorkspaceEditorStore(workspaceId: string): WorkspaceEditorStoreApi {
  let store = workspaceEditorStoreInstances.get(workspaceId);

  if (!store) {
    store = createWorkspaceEditorStore();
    workspaceEditorStoreInstances.set(workspaceId, store);
  }

  return store;
}

export const workspaceEditorStore = {
  getStore: (workspaceId: string): WorkspaceEditorStoreApi => {
    return ensureWorkspaceEditorStore(workspaceId);
  },
  ensureWorkspace: (workspaceId: string): void => {
    ensureWorkspaceEditorStore(workspaceId);
  },
  getSnapshot: (workspaceId: string): WorkspaceEditorState => {
    return ensureWorkspaceEditorStore(workspaceId).getState();
  },
  subscribe: (
    workspaceId: string,
    listener: (state: WorkspaceEditorState, previousState: WorkspaceEditorState) => void,
  ): (() => void) => {
    return ensureWorkspaceEditorStore(workspaceId).subscribe(listener);
  },
  getDefaultEditorId: (workspaceId: string): string | null => {
    return ensureWorkspaceEditorStore(workspaceId).getState().getDefaultEditorId();
  },
  openNoteEditor: (
    workspaceId: string,
    noteId: string,
    options?: {
      duplicate?: boolean;
    },
  ): string => {
    return ensureWorkspaceEditorStore(workspaceId).getState().openNoteEditor(noteId, options);
  },
};
