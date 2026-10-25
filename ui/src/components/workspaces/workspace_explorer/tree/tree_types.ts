import type { WorkspaceIndexEntry } from "@/api/commands/workspace/types";

export type WorkspaceTreeNodeRow = {
  kind: "node";
  key: string;
  path: string;
  parentPath: string;
  depth: number;
  entry: WorkspaceIndexEntry;
  isLoading: boolean;
};
export type WorkspaceTreeRow =
  | WorkspaceTreeNodeRow
  | {
      kind: "loading" | "error";
      key: string;
      path: string;
      parentPath: string;
      depth: number;
      error?: string;
    };
export type TreeSelectionMode = "replace" | "toggle" | "range";
export type TreeInputIntent =
  | { type: "moveFocus"; delta: number }
  | { type: "expand" | "collapse" | "activate" }
  | { type: "select"; selection: TreeSelectionMode };
export type TreeHandle = {
  collapseAll(): void;
  expandNodes(paths: string[]): Promise<void>;
  selectNode(path: string): void;
  scrollToNode(path: string): void;
};
