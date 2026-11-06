import type { WorkspaceTransferSource } from "@/api/commands/workspace/types";

export type WorkspaceFileClipboardRecord = {
  version: number;
  workspaceId: string;
  mode: "cut" | "copy";
  sources: WorkspaceTransferSource[];
};
export const normalizeTransferSources = (sources: WorkspaceTransferSource[]) =>
  sources.filter(
    (source, index, all) =>
      source.path &&
      all.findIndex((s) => s.path === source.path) === index &&
      !all.some((s) => s.path !== source.path && source.path.startsWith(`${s.path}/`)),
  );

export function createWorkspaceFileClipboard() {
  let value: WorkspaceFileClipboardRecord | null = null;
  let version = 0;
  const listeners = new Set<() => void>();
  const emit = () => {
    for (const listener of listeners) listener();
  };
  const clear = () => {
    value = null;
    version++;
    emit();
  };
  return {
    getSnapshot: () => value,
    subscribe: (listener: () => void) => {
      listeners.add(listener);
      return () => {
        listeners.delete(listener);
      };
    },
    record(workspaceId: string, mode: "cut" | "copy", sources: WorkspaceTransferSource[]) {
      value = {
        version: ++version,
        workspaceId,
        mode,
        sources: normalizeTransferSources(sources).map((s) => ({ ...s })),
      };
      emit();
      return value;
    },
    consumeSucceeded(recordVersion: number, paths: string[]) {
      if (!value || value.version !== recordVersion || value.mode !== "cut") return;
      const sources = value.sources.filter((s) => !paths.includes(s.path));
      value = sources.length ? { ...value, sources } : null;
      emit();
    },
    invalidateSources(workspaceId: string, paths: string[]) {
      if (!value || value.workspaceId !== workspaceId) return;
      const sources = value.sources.filter(
        (s) =>
          !paths.some(
            (p) => s.path === p || s.path.startsWith(`${p}/`) || p.startsWith(`${s.path}/`),
          ),
      );
      value = sources.length ? { ...value, sources } : null;
      emit();
    },
    workspaceChanged(workspaceId: string | null) {
      if (value && value.workspaceId !== workspaceId) clear();
    },
    clear,
  };
}
export const workspaceFileClipboard = createWorkspaceFileClipboard();
