import { fs } from "@/api/commands/fs";
import type { ExternalWorkspaceStorageBindingRequest } from "@/api/commands/workspace";

import { isDesktop } from "./platform";

/** 资源引用必须由对应平台选择器产生，不能将未知 Provider 的引用当成本地路径。 */
export async function selectWorkspaceStorageFolder(
  providerId: string,
  title: string,
): Promise<ExternalWorkspaceStorageBindingRequest | null> {
  if (providerId !== "desktop-folder" || !isDesktop()) {
    throw new Error("当前平台尚不支持选择此存储位置的文件夹");
  }
  const selected = await fs.showSelectDialog({ type: "openFolder", title });
  return selected?.path
    ? { kind: "external", providerId, providerSchemaVersion: 1, resourceRef: selected.path }
    : null;
}
