import type { WorkspaceDirectorySnapshot } from "@/api/commands/workspace/types";

export type DirectoryPickerOptions = {
  workspaceId: string;
  purpose: "save" | "move" | "copy";
  initialPath?: string;
  excludedPaths?: readonly string[];
  suggestedFileName?: string;
  sourceCount?: number;
};
export type DirectoryPickerResult = { directory: string; fileName?: string };
type Directory = { path: string; metadata: { kind: "file" | "directory" } };
export type DirectoryPickerState = {
  token: number;
  options: DirectoryPickerOptions;
  selected: string;
  fileName: string;
  expanded: ReadonlySet<string>;
  directories: Record<string, Directory[]>;
  loading: Record<string, boolean>;
  errors: Record<string, string>;
};

export function isValidNoteFileName(name: string): boolean {
  return (
    !!name.trim() &&
    name !== "." &&
    name !== ".." &&
    !/[\\/:*?"<>|]/.test(name) &&
    ![...name].some((c) => c.charCodeAt(0) < 32) &&
    !/[. ]$/.test(name)
  );
}

export function createDirectoryPickerModel(
  list: (workspaceId: string, path: string) => Promise<Directory[]>,
) {
  let state: DirectoryPickerState | null = null;
  let token = 0;
  let finish: ((result: DirectoryPickerResult | null) => void) | null = null;
  const listeners = new Set<() => void>();
  const emit = () => {
    for (const listener of listeners) listener();
  };
  const cancel = () => {
    const done = finish;
    finish = null;
    state = null;
    emit();
    done?.(null);
  };
  const canConfirm = () =>
    !!state &&
    !(state.options.excludedPaths ?? []).some(
      (p) => state!.selected === p || state!.selected.startsWith(`${p}/`),
    ) &&
    (state.options.purpose !== "save" || isValidNoteFileName(state.fileName));
  return {
    getSnapshot: () => state,
    subscribe: (listener: () => void) => {
      listeners.add(listener);
      return () => {
        listeners.delete(listener);
      };
    },
    request(options: DirectoryPickerOptions): Promise<DirectoryPickerResult | null> {
      cancel();
      state = {
        token: ++token,
        options,
        selected: options.initialPath ?? "",
        fileName: options.suggestedFileName ?? "",
        expanded: new Set([""]),
        directories: {},
        loading: {},
        errors: {},
      };
      const result = new Promise<DirectoryPickerResult | null>((resolve) => {
        finish = resolve;
      });
      emit();
      return result;
    },
    async activate(path: string) {
      if (
        !state ||
        (state.options.excludedPaths ?? []).some((p) => path === p || path.startsWith(`${p}/`))
      )
        return;
      const expanded = state.expanded.has(path);
      this.select(path);
      this.toggle(path);
      if (!expanded && !state.directories[path]) await this.load(path);
    },
    select(path: string) {
      if (state) {
        state = { ...state, selected: path };
        emit();
      }
    },
    setFileName(fileName: string) {
      if (state) {
        state = { ...state, fileName };
        emit();
      }
    },
    toggle(path: string) {
      if (!state) return;
      const expanded = new Set(state.expanded);
      if (expanded.has(path)) expanded.delete(path);
      else expanded.add(path);
      state = { ...state, expanded };
      emit();
    },
    async load(path: string) {
      if (!state || state.loading[path]) return;
      const request = state;
      state = { ...state, loading: { ...state.loading, [path]: true } };
      emit();
      try {
        const entries = await list(request.options.workspaceId, path);
        if (state?.token !== request.token) return;
        const errors = { ...state.errors };
        delete errors[path];
        state = {
          ...state,
          directories: {
            ...state.directories,
            [path]: entries.filter((e) => e.metadata.kind === "directory"),
          },
          errors,
        };
      } catch (error) {
        if (state?.token !== request.token) return;
        state = {
          ...state,
          errors: {
            ...state.errors,
            [path]: error instanceof Error ? error.message : String(error),
          },
        };
      } finally {
        if (state?.token === request.token) {
          state = { ...state, loading: { ...state.loading, [path]: false } };
          emit();
        }
      }
    },
    canConfirm,
    confirm() {
      if (!state || !canConfirm()) return;
      const result: DirectoryPickerResult = {
        directory: state.selected,
        ...(state.options.purpose === "save" ? { fileName: state.fileName.trim() } : {}),
      };
      const done = finish;
      finish = null;
      state = null;
      emit();
      done?.(result);
    },
    cancel,
  };
}

// 与文件浏览器使用同一 Index，由 Core 统一应用 ignore / gitignore 和保留目录规则。
export function createIndexedDirectoryLoader(
  getDirectory: (workspaceId: string, path: string) => Promise<WorkspaceDirectorySnapshot>,
) {
  return async (workspaceId: string, path: string): Promise<Directory[]> => {
    const snapshot = await getDirectory(workspaceId, path);
    return snapshot.entries
      .filter((entry) => entry.fileType === "directory")
      .map((entry) => ({ path: entry.path, metadata: { kind: "directory" as const } }));
  };
}
