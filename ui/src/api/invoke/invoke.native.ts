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

export async function initializeRustRuntime(): Promise<void> {
  if (state.initialized) {
    return;
  }
  if (!state.initPromise) {
    const sandboxPath = normalizeFilePath(Paths.document.uri);
    state.initPromise = LonanoteRustModule.init(sandboxPath)
      .then(() => {
        state.initialized = true;
      })
      .finally(() => {
        state.initPromise = null;
      });
  }
  await state.initPromise;
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
  await initializeRustRuntime();
  return LonanoteRustModule.invoke(command, normalizeArgs(args));
}

export async function getCommandKeys(): Promise<string[]> {
  await initializeRustRuntime();
  return LonanoteRustModule.getCommandKeys();
}

export async function getCommandLength(): Promise<number> {
  await initializeRustRuntime();
  return LonanoteRustModule.getCommandLength();
}

export async function invokeAsync(
  command: InvokeCommand,
  args?: string | null | undefined,
): Promise<string | null | undefined> {
  await initializeRustRuntime();
  return await LonanoteRustModule.invokeAsync(command, normalizeArgs(args));
}

export async function getCommandAsyncKeys(): Promise<string[]> {
  await initializeRustRuntime();
  return LonanoteRustModule.getCommandAsyncKeys();
}

export async function getCommandAsyncLength(): Promise<number> {
  await initializeRustRuntime();
  return LonanoteRustModule.getCommandAsyncLength();
}

export async function regCallbackFunction(
  key: string,
  callback: (args: string | null | undefined) => Promise<string | null | undefined>,
): Promise<() => void> {
  await initializeRustRuntime();
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
  await initializeRustRuntime();
  delete state.callbackMap?.[key];
  await LonanoteRustModule.unregCallbackFunction(key);
}

export async function clearCallbackFunction(): Promise<void> {
  await initializeRustRuntime();
  state.callbackMap = {};
  await LonanoteRustModule.clearCallbackFunction();
}

export async function getCommandCallbackKeys(): Promise<string[]> {
  await initializeRustRuntime();
  return LonanoteRustModule.getCommandCallbackKeys();
}

export async function getCommandCallbackLength(): Promise<number> {
  await initializeRustRuntime();
  return LonanoteRustModule.getCommandCallbackLength();
}
