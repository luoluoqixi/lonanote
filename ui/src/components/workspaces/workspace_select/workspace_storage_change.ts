import type { StorageCleanupStatus } from "@/api/commands/workspace";

type StorageChangeDependencies = {
  isOpen: (id: string) => Promise<boolean>;
  close: (id: string) => Promise<void>;
  open: (id: string) => Promise<unknown>;
  withClose: (id: string, action: () => Promise<void>) => Promise<boolean>;
  sessionChanged?: (id: string) => void;
};

/** Core 变更失败时抛错，让保存屏障保留编辑器和草稿；提交后的重开失败单独反馈。 */
export async function changeWorkspaceStorage(
  workspaceId: string,
  change: () => Promise<StorageCleanupStatus | null>,
  deps: StorageChangeDependencies,
): Promise<{
  completed: boolean;
  wasOpen: boolean;
  reopened: boolean;
  reopenError: string | null;
  sourceCleanup: StorageCleanupStatus | null;
}> {
  const wasOpen = await deps.isOpen(workspaceId);
  let reopened = false;
  let reopenError: string | null = null;
  let sourceCleanup: StorageCleanupStatus | null = null;
  const completed = await deps.withClose(workspaceId, async () => {
    if (wasOpen) await deps.close(workspaceId);
    try {
      sourceCleanup = await change();
    } catch (error) {
      if (wasOpen) {
        try {
          await deps.open(workspaceId);
        } catch (restoreError) {
          throw new Error(
            `${error instanceof Error ? error.message : String(error)}；恢复原工作区失败：${restoreError instanceof Error ? restoreError.message : String(restoreError)}`,
            { cause: restoreError },
          );
        } finally {
          deps.sessionChanged?.(workspaceId);
        }
      }
      throw error;
    }
    if (wasOpen) {
      try {
        await deps.open(workspaceId);
        reopened = true;
      } catch (error) {
        reopenError = error instanceof Error ? error.message : String(error);
      }
      deps.sessionChanged?.(workspaceId);
    }
  });
  return { completed, wasOpen, reopened, reopenError, sourceCleanup };
}
