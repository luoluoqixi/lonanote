import type { WorkspaceIndexEntry } from "@/api/commands/workspace/types";
import type { ExplorerDirectory } from "@/stores/workspace/workspace_explorer_store";

import type { TreeSelectionMode, WorkspaceTreeRow } from "./tree_types";

export function flattenVisibleRows(
  directories: Record<string, ExplorerDirectory>,
  expandedPaths: string[],
  sort: (entries: WorkspaceIndexEntry[]) => WorkspaceIndexEntry[],
): WorkspaceTreeRow[] {
  const rows: WorkspaceTreeRow[] = [];
  const expanded = new Set(expandedPaths);
  const visit = (path: string, depth: number) => {
    const directory = directories[path];
    for (const entry of sort([...(directory?.snapshot?.entries ?? [])])) {
      rows.push({
        kind: "node",
        key: `node:${entry.path}`,
        path: entry.path,
        parentPath: path,
        depth,
        entry,
        isLoading:
          entry.fileType === "directory" &&
          expanded.has(entry.path) &&
          !directories[entry.path]?.error &&
          (directories[entry.path]?.loading || !directories[entry.path]?.snapshot),
      });
      if (entry.fileType === "directory" && expanded.has(entry.path)) visit(entry.path, depth + 1);
    }
    if (directory?.error || (path === "" && (directory?.loading || !directory?.snapshot))) {
      const kind = directory?.error ? "error" : "loading";
      rows.push({
        kind,
        key: `status:${kind}:${path}`,
        path,
        parentPath: path,
        depth,
        error: directory?.error ?? undefined,
      });
    }
  };
  visit("", 0);
  return rows;
}

export function resolveTreeFocus(
  previousPath: string | null,
  previousRows: WorkspaceTreeRow[],
  nextRows: WorkspaceTreeRow[],
): string | null {
  const nodes = nextRows.filter((r) => r.kind === "node");
  if (!nodes.length) return null;
  if (!previousPath) return nodes[0].path;
  let path = previousPath;
  while (path) {
    if (nodes.some((r) => r.path === path)) return path;
    path = path.split("/").slice(0, -1).join("/");
  }
  const oldIndex = previousRows
    .filter((r) => r.kind === "node")
    .findIndex((r) => r.path === previousPath);
  return nodes[Math.min(Math.max(0, oldIndex), nodes.length - 1)].path;
}

export function selectTreePath({
  rows,
  selectedPaths,
  anchorPath,
  targetPath,
  mode,
}: {
  rows: WorkspaceTreeRow[];
  selectedPaths: string[];
  anchorPath: string | null;
  targetPath: string;
  mode: TreeSelectionMode;
}): { selectedPaths: string[]; anchorPath: string | null } {
  const paths = rows.filter((row) => row.kind === "node").map((row) => row.path);
  const target = paths.indexOf(targetPath);
  if (target < 0) return { selectedPaths, anchorPath };
  if (mode === "range") {
    const anchor = anchorPath ? paths.indexOf(anchorPath) : -1;
    if (anchor >= 0)
      return {
        selectedPaths: paths.slice(Math.min(anchor, target), Math.max(anchor, target) + 1),
        anchorPath,
      };
  }
  return {
    selectedPaths:
      mode === "toggle"
        ? selectedPaths.includes(targetPath)
          ? selectedPaths.filter((p) => p !== targetPath)
          : [...selectedPaths, targetPath]
        : [targetPath],
    anchorPath: targetPath,
  };
}
