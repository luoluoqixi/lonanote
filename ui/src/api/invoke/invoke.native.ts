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

export function initializeRustRuntime(): void {
  if (state.initialized) {
    return;
  }
  const sandboxPath = normalizeFilePath(Paths.document.uri);
  LonanoteRustModule.init(sandboxPath);
  state.initialized = true;
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
  initializeRustRuntime();
  return LonanoteRustModule.invoke(command, normalizeArgs(args));
}

export async function getCommandKeys(): Promise<string[]> {
  initializeRustRuntime();
  return LonanoteRustModule.getCommandKeys();
}

export async function getCommandLength(): Promise<number> {
  initializeRustRuntime();
  return LonanoteRustModule.getCommandLength();
}

export async function invokeAsync(
  command: InvokeCommand,
  args?: string | null | undefined,
): Promise<string | null | undefined> {
  initializeRustRuntime();
  return await LonanoteRustModule.invokeAsync(command, normalizeArgs(args));
}

export async function getCommandAsyncKeys(): Promise<string[]> {
  initializeRustRuntime();
  return LonanoteRustModule.getCommandAsyncKeys();
}

export async function getCommandAsyncLength(): Promise<number> {
  initializeRustRuntime();
  return LonanoteRustModule.getCommandAsyncLength();
}

export async function regCallbackFunction(
  key: string,
  callback: (args: string | null | undefined) => Promise<string | null | undefined>,
): Promise<() => void> {
  initializeRustRuntime();
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
  initializeRustRuntime();
  delete state.callbackMap?.[key];
  await LonanoteRustModule.unregCallbackFunction(key);
}

export async function clearCallbackFunction(): Promise<void> {
  initializeRustRuntime();
  state.callbackMap = {};
  await LonanoteRustModule.clearCallbackFunction();
}

export async function getCommandCallbackKeys(): Promise<string[]> {
  initializeRustRuntime();
  return LonanoteRustModule.getCommandCallbackKeys();
}

export async function getCommandCallbackLength(): Promise<number> {
  initializeRustRuntime();
  return LonanoteRustModule.getCommandCallbackLength();
}
