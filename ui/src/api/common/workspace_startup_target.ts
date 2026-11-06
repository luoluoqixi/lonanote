import type { WindowBootstrap } from "@/api/commands/win/multi_window";

export async function resolveWorkspaceStartupTarget(
  bootstrap: WindowBootstrap,
  loadLastWorkspaceId: () => Promise<string | null>,
): Promise<{ workspaceId: string; alreadyOpen: boolean } | null> {
  if (bootstrap.currentWorkspaceId) {
    return { workspaceId: bootstrap.currentWorkspaceId, alreadyOpen: true };
  }
  if (!bootstrap.restoreLastWorkspace) return null;
  const workspaceId = await loadLastWorkspaceId();
  return workspaceId ? { workspaceId, alreadyOpen: false } : null;
}
