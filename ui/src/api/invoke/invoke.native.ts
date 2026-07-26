import { Paths } from "expo-file-system";
import { LonanoteRustModule } from "lonanote_rust_module";

import type { InvokeCommand } from "./types";

const state: any = {};

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

async function ensureNativeRuntimeReady() {
  throwInitError();
  await ensureDefaultPathsInitialized();
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
