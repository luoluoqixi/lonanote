import type { WorkspaceTreeRow } from "./tree_types";

export type TreeDragBounds = {
  left: number;
  top: number;
  width: number;
  height: number;
  scaleY: number;
};
export type TreeDrop = { directory: string; paths: string[]; rowPath: string | null };

/** 按实际目标目录高亮整个子树，不按鼠标命中的单个文件高亮。 */
export function isTreeDropRegion(path: string, target: TreeDrop | null | undefined): boolean {
  return (
    !!target &&
    (target.directory === "" ||
      path === target.directory ||
      path.startsWith(`${target.directory}/`))
  );
}

export function getTreeDragSources(path: string, selected: string[]): string[] {
  const paths = [...new Set(selected.includes(path) ? selected : [path])].filter(Boolean);
  return paths.filter((source) => !paths.some((parent) => source.startsWith(`${parent}/`)));
}

export function treeRowAtPoint(
  x: number,
  y: number,
  bounds: TreeDragBounds,
  offset: number,
  rowHeight: number,
): number | null {
  if (
    x < bounds.left ||
    x >= bounds.left + bounds.width ||
    y < bounds.top ||
    y >= bounds.top + bounds.height
  )
    return null;
  return Math.floor(((y - bounds.top) / bounds.scaleY + offset) / rowHeight);
}

export function resolveTreeDrop(
  sources: string[],
  rows: WorkspaceTreeRow[],
  index: number,
): TreeDrop | null {
  const row = rows[index];
  if (index < 0 || (row && row.kind !== "node")) return null;
  const directory = !row ? "" : row.entry.fileType === "directory" ? row.path : row.parentPath;
  if (sources.some((path) => directory === path || directory.startsWith(`${path}/`))) return null;
  // 拖放是移动意图，同一父目录不产生菜单操作所支持的副本。
  const paths = sources.filter((path) => path.split("/").slice(0, -1).join("/") !== directory);
  return paths.length ? { directory, paths, rowPath: row?.path ?? null } : null;
}
