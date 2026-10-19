import { useEffect, useMemo } from "react";
import { useStore } from "zustand";

import { workspaceExplorerStore } from "@/stores/workspace/workspace_explorer_runtime";
import type { ExplorerMode, ExplorerWorkspace } from "@/stores/workspace/workspace_explorer_store";

const emptyWorkspace: ExplorerWorkspace = {
  epoch: 0,
  directories: {},
  expandedPaths: [],
  selectedPaths: [],
  focusedPath: null,
  rangeAnchorPath: null,
  selectionMode: false,
};

export function useWorkspaceExplorer({
  workspaceId,
  mode,
  currentPath = "",
}: {
  workspaceId: string;
  mode: ExplorerMode;
  currentPath?: string;
}) {
  const projection = useStore(
    workspaceExplorerStore,
    (state) => state.workspaces[workspaceId] ?? emptyWorkspace,
  );
  const actions = workspaceExplorerStore.getState();
  useEffect(() => {
    const release = actions.registerHost(workspaceId, mode, currentPath);
    const initialLoad =
      mode === "tree"
        ? actions.refreshVisible(workspaceId, mode, currentPath)
        : actions.loadDirectory(workspaceId, currentPath, { reload: true });
    void initialLoad.catch(() => undefined);
    return release;
  }, [
    actions.registerHost,
    actions.loadDirectory,
    actions.refreshVisible,
    workspaceId,
    mode,
    currentPath,
  ]);
  const bound = useMemo(
    () => ({
      reload: () => actions.loadDirectory(workspaceId, currentPath, { reload: true }),
      refresh: () => actions.refreshVisible(workspaceId, mode, currentPath),
      setExpanded: (path: string, expanded: boolean) =>
        actions.setExpanded(workspaceId, path, expanded),
      collapseAll: () => actions.collapseAll(workspaceId),
      revealPath: (path: string) => actions.revealPath(workspaceId, path),
      setSelection: (paths: string[], focusedPath?: string | null, anchor?: string | null) =>
        actions.setSelection(workspaceId, paths, focusedPath, anchor),
      setSelectionMode: (enabled: boolean) => actions.setSelectionMode(workspaceId, enabled),
    }),
    [
      workspaceId,
      mode,
      currentPath,
      actions.loadDirectory,
      actions.refreshVisible,
      actions.setExpanded,
      actions.collapseAll,
      actions.revealPath,
      actions.setSelection,
      actions.setSelectionMode,
    ],
  );
  return { ...projection, ...bound };
}
