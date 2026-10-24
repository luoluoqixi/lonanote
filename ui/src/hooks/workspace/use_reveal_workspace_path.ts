import { workspaceExplorerStore } from "@/stores/workspace/workspace_explorer_runtime";

/** 展开目标的父目录并同步树的选择、焦点与滚动定位。 */
export function useRevealWorkspacePath() {
  return workspaceExplorerStore.getState().revealPath;
}
