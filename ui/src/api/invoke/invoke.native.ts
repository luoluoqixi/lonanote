import { Paths } from "expo-file-system";
import { LonanoteRustModule } from "lonanote_rust_module";
import { Platform } from "react-native";

import type { InvokeCommand } from "./types";

const state: any = {};

type StartupWorkspaceRootKind =
  | "mobileAppSandbox"
  | "mobileAppCloud"
  | "mobileAppExternalSandbox"
  | "custom";

type StartupWorkspaceRoot = {
  key: string;
  path: string;
  kind: StartupWorkspaceRootKind;
  source: {
    kind: "systemDefault";
  };
};

function normalizeArgs(args?: string | null | undefined): string | null {
  return args ?? null;
}

function normalizeFilePath(uri: string): string {
  if (!uri.startsWith("file://")) {
    return uri;
  }

  const path = decodeURIComponent(uri.slice("file://".length));
  return path || "/";
}

function getDirectoryUri(directory: { uri: string } | string | null | undefined): string | null {
  if (!directory) {
    return null;
  }
  if (typeof directory === "string") {
    return normalizeFilePath(directory);
  }
  return normalizeFilePath(directory.uri);
}

function normalizeWorkspaceRootKey(key: string): string {
  return key
    .trim()
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "");
}

function pushWorkspaceRoot(
  roots: StartupWorkspaceRoot[],
  root: StartupWorkspaceRoot | null,
  seenPaths: Set<string>,
) {
  if (!root) {
    return;
  }
  if (!root.key || !root.path || seenPaths.has(root.path)) {
    return;
  }
  seenPaths.add(root.path);
  roots.push(root);
}

function resolveDefaultPathArgs(): string {
  const dataDir = normalizeFilePath(Paths.document.uri);
  const cacheDir = normalizeFilePath(Paths.cache.uri);
  const downloadDir = normalizeFilePath(Paths.join(dataDir, "downloads"));
  const homeDir = normalizeFilePath(Paths.dirname(Paths.document));

  return JSON.stringify({
    dataDir,
    cacheDir,
    downloadDir,
    homeDir,
  });
}

function resolveStartupWorkspaceRoots(): StartupWorkspaceRoot[] {
  const roots: StartupWorkspaceRoot[] = [];
  const seenPaths = new Set<string>();

  pushWorkspaceRoot(
    roots,
    {
      key: normalizeWorkspaceRootKey(`${Platform.OS}-app-sandbox`),
      path: normalizeFilePath(Paths.document.uri),
      kind: "mobileAppSandbox",
      source: { kind: "systemDefault" },
    },
    seenPaths,
  );

  if (Platform.OS === "ios") {
    for (const [containerId, directory] of Object.entries(Paths.appleSharedContainers ?? {})) {
      const path = getDirectoryUri(directory);
      pushWorkspaceRoot(
        roots,
        path
          ? {
              key: normalizeWorkspaceRootKey(`ios-shared-${containerId}`),
              path,
              kind: "mobileAppCloud",
              source: { kind: "systemDefault" },
            }
          : null,
        seenPaths,
      );
    }
  }

  return roots;
}

function throwInitError() {
  if (state.initialized) {
    return;
  }
  const error = LonanoteRustModule.init();
  if (error) {
    throw new Error(error);
  }
  state.initialized = true;
}

async function ensureDefaultPathsInitialized() {
  if (state.pathsInitialized) {
    return;
  }

  if (!state.pathsInitPromise) {
    state.pathsInitPromise = (async () => {
      await LonanoteRustModule.invoke("path.init_dir", resolveDefaultPathArgs());
      state.pathsInitialized = true;
    })().finally(() => {
      state.pathsInitPromise = null;
    });
  }

  await state.pathsInitPromise;
}

async function ensureWorkspaceRootsInitialized() {
  if (state.workspaceRootsInitialized) {
    return;
  }

  if (!state.workspaceRootsInitPromise) {
    state.workspaceRootsInitPromise = (async () => {
      const roots = resolveStartupWorkspaceRoots();
      await LonanoteRustModule.invoke(
        "workspace.registry.set_workspace_roots",
        JSON.stringify({ roots }),
      );
      state.workspaceRootsInitialized = true;
    })().finally(() => {
      state.workspaceRootsInitPromise = null;
    });
  }

  await state.workspaceRootsInitPromise;
}

async function ensureNativeRuntimeReady() {
  throwInitError();
  await ensureDefaultPathsInitialized();
  await ensureWorkspaceRootsInitialized();
}

function listenCallbackRequests() {
  if (state.callbackRequestUnlisten) {
    return;
  }
  state.callbackRequestUnlisten = LonanoteRustModule.onCallbackRequest(async (request) => {
    const callback = state.callbackMap?.[request.key];
    if (!callback) {
      LonanoteRustModule.rejectCallback(request.id, `callback [${request.key}] not found`);
      return;
    }
    try {
      const result = await callback(request.args);
      LonanoteRustModule.resolveCallback(request.id, normalizeArgs(result));
    } catch (error) {
      const message = error instanceof Error ? error.message : String(error);
      LonanoteRustModule.rejectCallback(request.id, message);
    }
  });
}

export async function invoke(
  command: InvokeCommand,
  args?: string | null | undefined,
): Promise<string | null | undefined> {
  await ensureNativeRuntimeReady();
  return LonanoteRustModule.invoke(command, normalizeArgs(args));
}

export async function getCommandKeys(): Promise<string[]> {
  await ensureNativeRuntimeReady();
  return LonanoteRustModule.getCommandKeys();
}

export async function getCommandLength(): Promise<number> {
  await ensureNativeRuntimeReady();
  return LonanoteRustModule.getCommandLength();
}

export async function invokeAsync(
  command: InvokeCommand,
  args?: string | null | undefined,
): Promise<string | null | undefined> {
  await ensureNativeRuntimeReady();
  return await LonanoteRustModule.invokeAsync(command, normalizeArgs(args));
}

export async function getCommandAsyncKeys(): Promise<string[]> {
  await ensureNativeRuntimeReady();
  return LonanoteRustModule.getCommandAsyncKeys();
}

export async function getCommandAsyncLength(): Promise<number> {
  await ensureNativeRuntimeReady();
  return LonanoteRustModule.getCommandAsyncLength();
}

export async function regCallbackFunction(
  key: string,
  callback: (args: string | null | undefined) => Promise<string | null | undefined>,
): Promise<() => void> {
  await ensureNativeRuntimeReady();
  listenCallbackRequests();
  state.callbackMap = state.callbackMap || {};
  state.callbackMap[key] = callback;
  await LonanoteRustModule.regCallbackFunction(key);
  return () => {
    delete state.callbackMap?.[key];
    void LonanoteRustModule.unregCallbackFunction(key);
  };
}

export async function unregCallbackFunction(key: string): Promise<void> {
  await ensureNativeRuntimeReady();
  delete state.callbackMap?.[key];
  await LonanoteRustModule.unregCallbackFunction(key);
}

export async function clearCallbackFunction(): Promise<void> {
  await ensureNativeRuntimeReady();
  state.callbackMap = {};
  await LonanoteRustModule.clearCallbackFunction();
}

export async function getCommandCallbackKeys(): Promise<string[]> {
  await ensureNativeRuntimeReady();
  return LonanoteRustModule.getCommandCallbackKeys();
}

export async function getCommandCallbackLength(): Promise<number> {
  await ensureNativeRuntimeReady();
  return LonanoteRustModule.getCommandCallbackLength();
}
