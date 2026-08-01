import { invokeWorkspaceResult, invokeWorkspaceUnit } from "./invoke_workspace";
import type {
  ByteArrayJson,
  StorageCapabilities,
  StorageEntry,
  StorageEntryMetadata,
  WorkspaceId,
  WorkspaceRelativePath,
  WriteWorkspaceFileOptions,
} from "./types";

function writeOptions(options?: WriteWorkspaceFileOptions) {
  return {
    overwrite: options?.overwrite ?? true,
    createParent: options?.createParent ?? true,
  };
}

export const workspaceFile = {
  capabilities: (workspaceId: WorkspaceId): Promise<StorageCapabilities> => {
    return invokeWorkspaceResult("workspace.file.capabilities", { workspaceId });
  },

  exists: (workspaceId: WorkspaceId, path: WorkspaceRelativePath): Promise<boolean> => {
    return invokeWorkspaceResult("workspace.file.exists", { workspaceId, path });
  },

  metadata: (
    workspaceId: WorkspaceId,
    path: WorkspaceRelativePath,
  ): Promise<StorageEntryMetadata> => {
    return invokeWorkspaceResult("workspace.file.metadata", { workspaceId, path });
  },

  list: (workspaceId: WorkspaceId, path: WorkspaceRelativePath = ""): Promise<StorageEntry[]> => {
    return invokeWorkspaceResult("workspace.file.list", { workspaceId, path });
  },

  readText: (workspaceId: WorkspaceId, path: WorkspaceRelativePath): Promise<string> => {
    return invokeWorkspaceResult("workspace.file.read_text", { workspaceId, path });
  },

  readBytes: (workspaceId: WorkspaceId, path: WorkspaceRelativePath): Promise<ByteArrayJson> => {
    return invokeWorkspaceResult("workspace.file.read_bytes", { workspaceId, path });
  },

  writeText: (
    workspaceId: WorkspaceId,
    path: WorkspaceRelativePath,
    text: string,
    options?: WriteWorkspaceFileOptions,
  ): Promise<void> => {
    return invokeWorkspaceUnit("workspace.file.write_text", {
      workspaceId,
      path,
      text,
      ...writeOptions(options),
    });
  },

  writeBytes: (
    workspaceId: WorkspaceId,
    path: WorkspaceRelativePath,
    data: ByteArrayJson,
    options?: WriteWorkspaceFileOptions,
  ): Promise<void> => {
    return invokeWorkspaceUnit("workspace.file.write_bytes", {
      workspaceId,
      path,
      data,
      ...writeOptions(options),
    });
  },

  createDirectory: (workspaceId: WorkspaceId, path: WorkspaceRelativePath): Promise<void> => {
    return invokeWorkspaceUnit("workspace.file.create_directory", { workspaceId, path });
  },

  rename: (
    workspaceId: WorkspaceId,
    fromPath: WorkspaceRelativePath,
    toPath: WorkspaceRelativePath,
  ): Promise<void> => {
    return invokeWorkspaceUnit("workspace.file.rename", { workspaceId, fromPath, toPath });
  },

  remove: (
    workspaceId: WorkspaceId,
    path: WorkspaceRelativePath,
    recursive = false,
  ): Promise<void> => {
    return invokeWorkspaceUnit("workspace.file.remove", { workspaceId, path, recursive });
  },
};
