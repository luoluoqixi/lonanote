import { Paths } from "expo-file-system";
import { LonanoteRustModule } from "lonanote_rust_module";
import { I18nManager, NativeModules } from "react-native";

import type { InvokeCommand } from "./types";

type CallbackFunction = (args: string | null | undefined) => Promise<string | null | undefined>;

interface AppleSettings {
  AppleLanguages?: unknown;
  AppleLocale?: unknown;
}

interface AppleSettingsManager {
  settings?: AppleSettings;
  getConstants?: () => { settings?: AppleSettings };
}

interface NativeRuntimeState {
  initialized?: boolean;
  rustLogUnlisten?: () => void;
  callbackRequestUnlisten?: () => void;
  callbackMap?: Record<string, CallbackFunction>;
}

const state: NativeRuntimeState = {};

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

function systemLocale(): string {
  const appleLocale = getApplePreferredLocale();
  if (appleLocale) {
    return appleLocale;
  }

  const nativeLocale = I18nManager.getConstants().localeIdentifier?.trim();
  if (nativeLocale) {
    return nativeLocale;
  }

  try {
    return Intl.DateTimeFormat().resolvedOptions().locale || "en";
  } catch {
    return "en";
  }
}

function getApplePreferredLocale(): string | undefined {
  try {
    const settingsManager = NativeModules.SettingsManager as AppleSettingsManager | undefined;
    const settings = settingsManager?.settings ?? settingsManager?.getConstants?.().settings;
    const preferredLanguage = Array.isArray(settings?.AppleLanguages)
      ? settings.AppleLanguages.find(
          (language): language is string => typeof language === "string" && language.trim() !== "",
        )
      : undefined;
    if (preferredLanguage) {
      return preferredLanguage.trim();
    }
    return typeof settings?.AppleLocale === "string" ? settings.AppleLocale.trim() : undefined;
  } catch {
    return undefined;
  }
}

function listenRustLogs(): void {
  if (state.rustLogUnlisten) {
    return;
  }
  state.rustLogUnlisten = LonanoteRustModule.onRustLog((entry) => {
    const prefix = `[rust][${entry.level.toLowerCase()}][${entry.target}]`;
    if (entry.level === "ERROR") {
      console.error(prefix, entry.message);
    } else if (entry.level === "WARN") {
      console.warn(prefix, entry.message);
    } else if (entry.level === "DEBUG" || entry.level === "TRACE") {
      console.debug(prefix, entry.message);
    } else {
      console.info(prefix, entry.message);
    }
  });
}

export function initializeRustRuntime(): void {
  if (state.initialized) {
    return;
  }
  const sandboxPath = normalizeFilePath(Paths.document.uri);
  const locale = systemLocale();
  listenRustLogs();
  console.info("systemLocale: ", locale);
  console.info("sandboxPath: ", sandboxPath);
  LonanoteRustModule.init(sandboxPath, locale);
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
  callback: CallbackFunction,
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
