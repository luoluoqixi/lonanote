import type { WorkspaceListItem } from "@/api/commands/workspace";

export function canEditWorkspace(
  item: Pick<WorkspaceListItem, "id" | "isOpen">,
  currentWorkspaceId: string | null,
): boolean {
  return !item.isOpen || item.id === currentWorkspaceId;
}
