import type {
  ExternalWorkspaceStorageBindingRequest,
  WorkspaceStorageView,
} from "@/api/commands/workspace";

/** 仅 desktop-folder 的资源引用可作为本地路径比较，其他 Provider 的引用保持不透明。 */
export function isCurrentWorkspaceLocation(
  storage: WorkspaceStorageView,
  currentPath: string | null,
  target: {
    providerId: string | null;
    isManaged: boolean;
    directoryName: string;
    externalBinding: ExternalWorkspaceStorageBindingRequest | null;
  },
): boolean {
  if (target.isManaged) {
    return (
      storage.kind === "managed" &&
      storage.providerId === target.providerId &&
      storage.directoryName === target.directoryName.trim()
    );
  }
  if (!currentPath || target.externalBinding?.providerId !== "desktop-folder") return false;
  const normalize = (path: string) =>
    /^[a-z]:[\\/]/i.test(path) || path.startsWith("\\\\") ? path.replace(/\\/g, "/") : path;
  return normalize(currentPath) === normalize(target.externalBinding.resourceRef);
}
