import {
  getCommandAsyncKeys,
  getCommandKeys,
  clearCallbackFunction as rawClearCallbackFunction,
  getCommandCallbackKeys as rawGetCommandCallbackKeys,
  getCommandCallbackLength as rawGetCommandCallbackLength,
  invoke as rawInvoke,
  invokeAsync as rawInvokeAsync,
  regCallbackFunction as rawRegCallbackFunction,
  unregCallbackFunction as rawUnregCallbackFunction,
} from "./invoke";
import { OS, isNative, isTauri } from "./runtime";
import type { InvokeArgs, InvokeCommand } from "./types";
import { InvokeError } from "./types";

export type { InvokeArgs, InvokeCommand } from "./types";
export { isTauri, isNative, isWeb, isInvokeAvailable, OS } from "./runtime";

const state: any = {};

async function initializeCommands() {
  if (!state.syncCommands || !state.asyncCommands) {
    const syncCommands = await getCommandKeys();
    const asyncCommands = await getCommandAsyncKeys();
    state.syncCommands = new Set(syncCommands);
    state.asyncCommands = new Set(asyncCommands);
  }
}

async function isSyncCommand(command: InvokeCommand) {
  await initializeCommands();
  if (!state.syncCommands) {
    return false;
  }
  return state.syncCommands.has(command);
}

async function isAsyncCommand(command: InvokeCommand) {
  await initializeCommands();
  if (!state.asyncCommands) {
    return false;
  }
  return state.asyncCommands.has(command);
}

const getJson = (args?: any) => {
  const t = typeof args;
  if (t === "function" || t === "undefined") {
    return undefined;
  }
  if (t === null) {
    return t;
  }
  return JSON.stringify(args);
};

const getObject = <T>(res: string | null | undefined): T | undefined => {
  if (typeof res !== "string") {
    return undefined;
  }
  return JSON.parse(res);
};

export async function invoke<TResult = unknown>(
  command: InvokeCommand,
  args?: InvokeArgs,
): Promise<TResult | undefined> {
  if (!isTauri() && !isNative()) {
    throw new InvokeError(`invoke: not support Rust(runtime=${OS()})`, OS(), command);
  }
  if (await isSyncCommand(command)) {
    const jsonArgs = getJson(args);
    const res = await rawInvoke(command, jsonArgs);
    return getObject(res);
  }
  if (await isAsyncCommand(command)) {
    const jsonArgs = getJson(args);
    const res = await rawInvokeAsync(command, jsonArgs);
    return getObject(res);
  }
  throw new InvokeError(`invoke: command [${command}] not found(runtime=${OS()})`, OS(), command);
}

export async function regCallbackFunction<T, TRet>(
  key: string,
  callback: (args: T | undefined) => Promise<TRet | undefined>,
): Promise<() => void> {
  const handle = async (args: string | null | undefined) => {
    const data = getObject(args);
    const r = await callback(data as T);
    return getJson(r);
  };
  return await rawRegCallbackFunction(key, handle);
}

export async function unregCallbackFunction(key: string): Promise<void> {
  await rawUnregCallbackFunction(key);
}

export async function clearCallbackFunction(): Promise<void> {
  await rawClearCallbackFunction();
}

export async function getCommandCallbackKeys(): Promise<string[]> {
  return await rawGetCommandCallbackKeys();
}

export async function getCommandCallbackLength(): Promise<number> {
  return await rawGetCommandCallbackLength();
}
