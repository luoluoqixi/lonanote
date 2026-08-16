import type { WorkspaceSnapshot } from "@/api/commands/workspace";
import {
  getManagedWorkspaceDirectory,
  nativePathToFileUri,
} from "@/api/common/storage_paths.native";

const APP_LOCAL_STORAGE_PROVIDER_ID = "app-local";

function isWorkspaceRelativePath(path: string): boolean {
  return (
    !path.startsWith("/") &&
    path.split("/").every((segment) => segment.length > 0 && segment !== "." && segment !== "..")
  );
}

/** 将 app-local Workspace 相对路径转换为 Android/iOS 可访问的 file URI。 */
export function resolveWorkspaceFileUrl(workspace: WorkspaceSnapshot, path: string): string {
  const { storage } = workspace;

  if (
    storage.kind !== "managed" ||
    storage.providerId !== APP_LOCAL_STORAGE_PROVIDER_ID ||
    !storage.directoryName
  ) {
    throw new Error("当前 Workspace 不支持直接访问文件");
  }
  if (!isWorkspaceRelativePath(path)) {
    throw new Error("文件路径无效");
  }

  const nativePath = `${getManagedWorkspaceDirectory()}/workspaces/${storage.directoryName}/${path}`;
  return nativePathToFileUri(nativePath);
}
