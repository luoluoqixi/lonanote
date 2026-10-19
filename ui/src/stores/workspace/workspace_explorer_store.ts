import { createStore } from "zustand/vanilla";

import type { WorkspaceDirectorySnapshot } from "@/api/commands/workspace/types";

export type ExplorerMode = "directory" | "tree";
export type ExplorerDirectory = {
  snapshot: WorkspaceDirectorySnapshot | null;
  loading: boolean;
  error: string | null;
  stale: boolean;
  requestId: number;
};
export type ExplorerWorkspace = {
  epoch: number;
  directories: Record<string, ExplorerDirectory>;
  expandedPaths: string[];
  selectedPaths: string[];
  focusedPath: string | null;
  rangeAnchorPath: string | null;
  selectionMode: boolean;
};
type IndexApi = {
  getDirectory: (
    workspaceId: string,
    path: string,
    options?: { reload?: boolean },
  ) => Promise<WorkspaceDirectorySnapshot>;
  refresh: (workspaceId: string) => Promise<void>;
};
export type WorkspaceExplorerState = {
  workspaces: Record<string, ExplorerWorkspace>;
  loadDirectory: (
    id: string,
    path: string,
    options: { reload: boolean },
  ) => Promise<WorkspaceDirectorySnapshot | null>;
  setExpanded: (id: string, path: string, expanded: boolean) => Promise<void>;
  refreshVisible: (id: string, mode: ExplorerMode, path: string) => Promise<void>;
  invalidatePaths: (id: string, paths: string[]) => Promise<void>;
  resetWorkspace: (id: string) => void;
  collapseAll: (id: string) => void;
  revealPath: (id: string, path: string) => Promise<void>;
  setSelection: (
    id: string,
    paths: string[],
    focusedPath?: string | null,
    anchor?: string | null,
  ) => void;
  setSelectionMode: (id: string, enabled: boolean) => void;
  registerHost: (id: string, mode: ExplorerMode, path: string) => () => void;
};

export const isPathWithin = (path: string, ancestor: string): boolean =>
  ancestor === "" || path === ancestor || path.startsWith(`${ancestor}/`);
export const parentWorkspacePath = (path: string): string => path.split("/").slice(0, -1).join("/");
const emptyDirectory = (): ExplorerDirectory => ({
  snapshot: null,
  loading: false,
  error: null,
  stale: true,
  requestId: 0,
});
const message = (error: unknown): string =>
  error instanceof Error ? error.message : String(error);

export function createWorkspaceExplorerStore(api: IndexApi) {
  let sequence = 0;
  const pending = new Map<string, Promise<WorkspaceDirectorySnapshot | null>>();
  const refreshVersions = new Map<string, number>();
  const revealVersions = new Map<string, number>();
  const hosts = new Map<string, Map<symbol, { mode: ExplorerMode; path: string }>>();
  const store = createStore<WorkspaceExplorerState>()((set, get) => {
    function ensure(id: string): ExplorerWorkspace {
      const existing = get().workspaces[id];
      if (existing) return existing;
      const value: ExplorerWorkspace = {
        epoch: ++sequence,
        directories: {},
        expandedPaths: [],
        selectedPaths: [],
        focusedPath: null,
        rangeAnchorPath: null,
        selectionMode: false,
      };
      set({ workspaces: { ...get().workspaces, [id]: value } });
      return value;
    }
    function update(
      id: string,
      epoch: number,
      change: (w: ExplorerWorkspace) => ExplorerWorkspace,
    ) {
      const current = get().workspaces[id];
      if (current?.epoch !== epoch) return;
      set({ workspaces: { ...get().workspaces, [id]: change(current) } });
    }
    function prune(w: ExplorerWorkspace, snapshot: WorkspaceDirectorySnapshot): ExplorerWorkspace {
      const valid = new Set(
        snapshot.entries.filter((e) => e.fileType === "directory").map((e) => e.path),
      );
      const removed = (p: string) =>
        p !== snapshot.path &&
        isPathWithin(p, snapshot.path) &&
        ![...valid].some((v) => isPathWithin(p, v));
      const directories = Object.fromEntries(
        Object.entries(w.directories).filter(([p]) => !removed(p)),
      );
      const visible = new Set(snapshot.entries.map((e) => e.path));
      const gone = (p: string) =>
        removed(p) && !(parentWorkspacePath(p) === snapshot.path && visible.has(p));
      return {
        ...w,
        directories,
        expandedPaths: w.expandedPaths.filter((p) => !removed(p)),
        selectedPaths: w.selectedPaths.filter((p) => !gone(p)),
        focusedPath: w.focusedPath && gone(w.focusedPath) ? snapshot.path || null : w.focusedPath,
        rangeAnchorPath: w.rangeAnchorPath && gone(w.rangeAnchorPath) ? null : w.rangeAnchorPath,
      };
    }
    return {
      workspaces: {},
      loadDirectory: (id, path, { reload }) => {
        const w = ensure(id);
        const epoch = w.epoch;
        const key = `${id}:${epoch}:${path}`;
        if (!reload && pending.has(key)) return pending.get(key)!;
        const previous = w.directories[path] ?? emptyDirectory();
        if (!reload && previous.snapshot && !previous.stale)
          return Promise.resolve(previous.snapshot);
        const requestId = ++sequence;
        update(id, epoch, (current) => ({
          ...current,
          directories: {
            ...current.directories,
            [path]: { ...previous, loading: true, error: null, requestId },
          },
        }));
        const isCurrent = () =>
          get().workspaces[id]?.epoch === epoch &&
          get().workspaces[id]?.directories[path]?.requestId === requestId;
        const task = (async () => {
          try {
            const snapshot = await api.getDirectory(id, path, { reload });
            if (!isCurrent()) return null;
            update(id, epoch, (current) => {
              const next = prune(current, snapshot);
              return {
                ...next,
                directories: {
                  ...next.directories,
                  [path]: { snapshot, loading: false, error: null, stale: false, requestId },
                },
              };
            });
            return snapshot;
          } catch (error) {
            if (!isCurrent()) return null;
            update(id, epoch, (current) => ({
              ...current,
              directories: {
                ...current.directories,
                [path]: {
                  ...current.directories[path],
                  loading: false,
                  error: message(error),
                  stale: true,
                },
              },
            }));
            throw error;
          }
        })();
        void task
          .finally(() => {
            if (pending.get(key) === task) pending.delete(key);
          })
          .catch(() => undefined);
        pending.set(key, task);
        return task;
      },
      setExpanded: async (id, path, expanded) => {
        const w = ensure(id);
        if (!expanded) revealVersions.set(id, ++sequence);
        if (expanded && w.expandedPaths.includes(path) && w.directories[path]?.loading) return;
        update(id, w.epoch, (current) => ({
          ...current,
          expandedPaths: expanded
            ? [...new Set([...current.expandedPaths, path])]
            : current.expandedPaths.filter((p) => p !== path),
        }));
        if (expanded) {
          const snapshot = await get().loadDirectory(id, path, { reload: true });
          const effective = () =>
            path
              .split("/")
              .every((_, n, parts) =>
                get().workspaces[id]?.expandedPaths.includes(parts.slice(0, n + 1).join("/")),
              );
          if (!snapshot || get().workspaces[id]?.epoch !== w.epoch || !effective()) return;
          for (const child of snapshot.entries) {
            if (
              effective() &&
              child.fileType === "directory" &&
              get().workspaces[id]?.expandedPaths.includes(child.path)
            )
              await get().setExpanded(id, child.path, true);
          }
        }
      },
      refreshVisible: async (id, mode, path) => {
        const epoch = ensure(id).epoch;
        const candidates = new Set(ensure(id).expandedPaths);
        const version = ++sequence;
        refreshVersions.set(id, version);
        update(id, epoch, (w) => ({
          ...w,
          directories: Object.fromEntries(
            Object.entries(w.directories).map(([p, d]) => [
              p,
              d.loading ? { ...d, requestId: ++sequence, loading: false, stale: true } : d,
            ]),
          ),
        }));
        const effective = (p: string) => {
          const expanded = get().workspaces[id]?.expandedPaths ?? [];
          const parts = p.split("/");
          return parts.every(
            (_, n) =>
              expanded.includes(parts.slice(0, n + 1).join("/")) &&
              candidates.has(parts.slice(0, n + 1).join("/")),
          );
        };
        const current = () =>
          get().workspaces[id]?.epoch === epoch && refreshVersions.get(id) === version;
        await api.refresh(id);
        if (!current()) return;
        const root = await get().loadDirectory(id, mode === "tree" ? "" : path, { reload: true });
        if (mode !== "tree" || !root || !current()) return;
        let layer = [root];
        let firstError: unknown;
        while (layer.length && current()) {
          const paths = layer.flatMap((s) =>
            s.entries
              .filter((e) => e.fileType === "directory" && effective(e.path))
              .map((e) => e.path),
          );
          const next: WorkspaceDirectorySnapshot[] = [];
          // 每层先完成父目录投影；最多四个读取在途，失败只暂停其分支。
          let cursor = 0;
          await Promise.all(
            Array.from({ length: Math.min(4, paths.length) }, async () => {
              while (cursor < paths.length && current()) {
                const p = paths[cursor++];
                if (!effective(p)) continue;
                try {
                  const result = await get().loadDirectory(id, p, { reload: true });
                  if (result) next.push(result);
                } catch (error) {
                  firstError ??= error;
                }
              }
            }),
          );
          layer = next;
        }
        if (firstError && current()) throw firstError;
      },
      invalidatePaths: async (id, paths) => {
        const w = get().workspaces[id];
        if (!w) return;
        const all = paths.some((p) => p.split("/").at(-1) === ".gitignore");
        update(id, w.epoch, (current) => ({
          ...current,
          directories: Object.fromEntries(
            Object.entries(current.directories).map(([p, d]) => [
              p,
              all || paths.some((changed) => isPathWithin(changed, p) || isPathWithin(p, changed))
                ? { ...d, stale: true, loading: false, requestId: ++sequence }
                : d,
            ]),
          ),
        }));
        const active = [...(hosts.get(id)?.values() ?? [])];
        const tree = active.find((h) => h.mode === "tree");
        if (tree) {
          if (all) {
            await get().refreshVisible(id, "tree", "");
            return;
          }
          const epoch = w.epoch;
          const effective = (p: string) =>
            p
              .split("/")
              .every((_, n, parts) =>
                get().workspaces[id]?.expandedPaths.includes(parts.slice(0, n + 1).join("/")),
              );
          let layer = [""];
          let failure: unknown;
          while (layer.length && get().workspaces[id]?.epoch === epoch) {
            const next: string[] = [];
            for (let offset = 0; offset < layer.length; offset += 4) {
              await Promise.all(
                layer.slice(offset, offset + 4).map(async (p) => {
                  if (get().workspaces[id]?.epoch !== epoch || (p && !effective(p))) return;
                  try {
                    const d = get().workspaces[id]?.directories[p];
                    const value = d?.stale
                      ? await get().loadDirectory(id, p, { reload: true })
                      : d?.snapshot;
                    if (value)
                      next.push(
                        ...value.entries
                          .filter((e) => e.fileType === "directory" && effective(e.path))
                          .map((e) => e.path),
                      );
                  } catch (error) {
                    failure ??= error;
                  }
                }),
              );
            }
            layer = next;
          }
          if (failure) throw failure;
          return;
        }
        const visible = [
          ...new Set(
            active
              .filter(
                (h) => all || paths.some((p) => isPathWithin(p, h.path) || isPathWithin(h.path, p)),
              )
              .map((h) => h.path),
          ),
        ];
        await Promise.all(visible.map((p) => get().loadDirectory(id, p, { reload: true })));
      },
      resetWorkspace: (id) => {
        const workspaces = { ...get().workspaces };
        delete workspaces[id];
        refreshVersions.set(id, ++sequence);
        revealVersions.set(id, ++sequence);
        hosts.delete(id);
        for (const key of pending.keys()) if (key.startsWith(`${id}:`)) pending.delete(key);
        set({ workspaces });
      },
      collapseAll: (id) => {
        revealVersions.set(id, ++sequence);
        const w = ensure(id);
        update(id, w.epoch, (current) => ({ ...current, expandedPaths: [] }));
      },
      revealPath: async (id, path) => {
        const epoch = ensure(id).epoch;
        const reveal = ++sequence;
        revealVersions.set(id, reveal);
        const current = () =>
          get().workspaces[id]?.epoch === epoch && revealVersions.get(id) === reveal;
        const parts = path.split("/");
        let directory = "";
        for (let n = 0; n < parts.length; n++) {
          if (!current()) return;
          const s = await get().loadDirectory(id, directory, { reload: true });
          const next = parts.slice(0, n + 1).join("/");
          if (!current()) return;
          if (!s?.entries.some((e) => e.path === next)) return;
          if (n < parts.length - 1) {
            if (!s.entries.some((e) => e.path === next && e.fileType === "directory")) return;
            update(id, epoch, (w) => ({
              ...w,
              expandedPaths: [...new Set([...w.expandedPaths, next])],
            }));
            directory = next;
          }
        }
        update(id, epoch, (w) => ({
          ...w,
          selectedPaths: [path],
          focusedPath: path,
          rangeAnchorPath: path,
        }));
      },
      setSelection: (id, paths, focusedPath, anchor) => {
        const w = ensure(id);
        update(id, w.epoch, (current) => ({
          ...current,
          selectedPaths: paths,
          focusedPath: focusedPath === undefined ? current.focusedPath : focusedPath,
          rangeAnchorPath: anchor === undefined ? current.rangeAnchorPath : anchor,
        }));
      },
      setSelectionMode: (id, enabled) => {
        const w = ensure(id);
        update(id, w.epoch, (current) => ({
          ...current,
          selectionMode: enabled,
          selectedPaths: enabled ? current.selectedPaths : [],
        }));
      },
      registerHost: (id, mode, path) => {
        ensure(id);
        const key = Symbol();
        const registered = hosts.get(id) ?? new Map();
        hosts.set(id, registered);
        registered.set(key, { mode, path });
        return () => {
          registered.delete(key);
          if (hosts.get(id) === registered && !registered.size) hosts.delete(id);
        };
      },
    };
  });
  return store;
}
