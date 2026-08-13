import {
  DocumentDirectoryPath,
  ExternalDirectoryPath,
  LibraryDirectoryPath,
} from "@dr.pogodin/react-native-fs";

import { os } from "@/api/common/platform";

function requireNativePath(path: string | undefined, label: string): string {
  const normalized = path?.replace(/\/+$/, "");
  if (!normalized) {
    throw new Error(`[storage-paths] ${label} 不可用`);
  }
  return normalized;
}

/** LonaNote 自身的 catalog、session、settings 等内部数据根目录。 */
export function getAppDataDirectory(): string {
  switch (os()) {
    case "ios":
      return `${requireNativePath(LibraryDirectoryPath, "iOS LibraryDirectoryPath")}/Application Support`;
    case "android":
      return requireNativePath(DocumentDirectoryPath, "Android DocumentDirectoryPath");
    default:
      throw new Error("[storage-paths] 当前 Native 平台不受支持");
  }
}

/** app-local Provider 的 Managed 根目录；Workspace Core 会在其下创建 workspaces。 */
export function getManagedWorkspaceDirectory(): string {
  switch (os()) {
    case "ios":
      return requireNativePath(DocumentDirectoryPath, "iOS DocumentDirectoryPath");
    case "android":
      return requireNativePath(ExternalDirectoryPath, "Android ExternalDirectoryPath");
    default:
      throw new Error("[storage-paths] 当前 Native 平台不受支持");
  }
}

export function nativePathToFileUri(path: string): string {
  return encodeURI(`file://${path}`);
}
