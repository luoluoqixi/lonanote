import type { WorkspaceListItem } from "@/api/commands/workspace";

export function getWorkspaceOpenLabel(
  workspace: Pick<WorkspaceListItem, "id" | "isOpen">,
  currentWorkspaceId: string | null,
): string | undefined {
  if (!workspace.isOpen) return undefined;
  return workspace.id === currentWorkspaceId ? "已打开(当前窗口)" : "已打开";
}
