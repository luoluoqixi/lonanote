import { invoke } from "@/api/invoke";

import type { StorageCapabilities, StorageEntry, StorageEntryMetadata } from "./types";

const invokeWorkspaceFile = <T = unknown>(
  command: string,
  args: object,
): Promise<T | undefined> => {
  return invoke<T>(`workspace.file.${command}`, args);
};

export const workspaceFile = {
  capabilities: async (workspaceId: string): Promise<StorageCapabilities> => {
    return (await invokeWorkspaceFile("capabilities", {
      workspaceId,
    }))!;
  },
  exists: async (workspaceId: string, path: string): Promise<boolean> => {
    return (await invokeWorkspaceFile("exists", {
      workspaceId,
      path,
    }))!;
  },
  metadata: async (workspaceId: string, path: string): Promise<StorageEntryMetadata> => {
    return (await invokeWorkspaceFile("metadata", {
      workspaceId,
      path,
    }))!;
  },
  listDirectory: async (workspaceId: string, path = ""): Promise<StorageEntry[]> => {
    return (await invokeWorkspaceFile("list_directory", {
      workspaceId,
      path,
    }))!;
  },
  readBytes: async (workspaceId: string, path: string): Promise<number[]> => {
    return (await invokeWorkspaceFile("read_bytes", {
      workspaceId,
      path,
    }))!;
  },
  readText: async (workspaceId: string, path: string): Promise<string> => {
    return (await invokeWorkspaceFile("read_text", {
      workspaceId,
      path,
    }))!;
  },
  writeBytes: async (
    workspaceId: string,
    path: string,
    data: number[],
    options?: { overwrite?: boolean; createParent?: boolean },
  ): Promise<void> => {
    await invokeWorkspaceFile("write_bytes", {
      workspaceId,
      path,
      data,
      overwrite: options?.overwrite ?? true,
      createParent: options?.createParent ?? true,
    });
  },
  writeText: async (
    workspaceId: string,
    path: string,
    text: string,
    options?: { overwrite?: boolean; createParent?: boolean },
  ): Promise<void> => {
    await invokeWorkspaceFile("write_text", {
      workspaceId,
      path,
      text,
      overwrite: options?.overwrite ?? true,
      createParent: options?.createParent ?? true,
    });
  },
  createDirectory: async (workspaceId: string, path: string): Promise<void> => {
    await invokeWorkspaceFile("create_directory", {
      workspaceId,
      path,
    });
  },
  rename: async (workspaceId: string, fromPath: string, toPath: string): Promise<void> => {
    await invokeWorkspaceFile("rename", {
      workspaceId,
      fromPath,
      toPath,
    });
  },
  move: async (workspaceId: string, fromPath: string, toPath: string): Promise<void> => {
    await invokeWorkspaceFile("move", {
      workspaceId,
      fromPath,
      toPath,
    });
  },
  remove: async (workspaceId: string, path: string, recursive = false): Promise<void> => {
    await invokeWorkspaceFile("remove", {
      workspaceId,
      path,
      recursive,
    });
  },
};
