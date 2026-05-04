import type { InvokeCommand } from "./types";

const state: any = {};

const getInvoke = async () => {
  let invoke: typeof import("@tauri-apps/api/core").invoke = state.invoke;
  if (invoke) {
    return invoke;
  }
  invoke = (await import("@tauri-apps/api/core")).invoke;
  state.invoke = invoke;
  return invoke;
};

const getAppWebview = async () => {
  let wvWindow: typeof import("@tauri-apps/api/webviewWindow").getCurrentWebviewWindow =
    state.wvWindow;
  if (wvWindow) {
    return wvWindow();
  }
  wvWindow = (await import("@tauri-apps/api/webviewWindow")).getCurrentWebviewWindow;
  state.wvWindow = wvWindow;
  return wvWindow();
};

export async function invoke(
  command: InvokeCommand,
  args?: string | null | undefined,
): Promise<string | null | undefined> {
  const invoke = await getInvoke();
  return await invoke("invoke", { args }, { headers: { key: command } });
}

export async function getCommandKeys(): Promise<string[]> {
  const invoke = await getInvoke();
  return await invoke<string[]>("get_command_keys");
}

export async function getCommandLength(): Promise<number> {
  const invoke = await getInvoke();
  return await invoke<number>("get_command_len");
}

export async function invokeAsync(
  command: InvokeCommand,
  args?: string | null | undefined,
): Promise<string | null | undefined> {
  const invoke = await getInvoke();
  return await invoke("invoke_async", { args }, { headers: { key: command } });
}

export async function getCommandAsyncKeys(): Promise<string[]> {
  const invoke = await getInvoke();
  return await invoke<string[]>("get_command_async_keys");
}

export async function getCommandAsyncLength(): Promise<number> {
  const invoke = await getInvoke();
  return await invoke<number>("get_command_async_len");
}

export async function regCallbackFunction(
  key: string,
  callback: (args: string | null | undefined) => Promise<string | null | undefined>,
): Promise<() => void> {
  const invoke = await getInvoke();
  const appWebview = await getAppWebview();
  const unlisten = await appWebview.listen<string>(key, async (e) => {
    const preload = e.payload;
    const cbResultEvent = `callback_result:${key}:return`;
    const res = await callback(preload);
    appWebview.emit(cbResultEvent, res);
  });
  state.listenMap = state.listenMap || {};
  state.listenMap[key] = unlisten;
  await invoke("reg_callback_function", { key });
  return unlisten;
}

export async function unregCallbackFunction(key: string) {
  const invoke = await getInvoke();
  if (state.listenMap && state.listenMap[key]) {
    state.listenMap[key]();
    state.listenMap[key] = undefined;
  }
  return await invoke("unreg_callback_function", { key });
}

export async function clearCallbackFunction() {
  const invoke = await getInvoke();
  if (state.listenMap) {
    for (const key in state.listenMap) {
      if (state.listenMap[key]) {
        state.listenMap[key]();
        state.listenMap[key] = undefined;
      }
    }
  }
  return await invoke("clear_callback_function");
}

export async function getCommandCallbackKeys(): Promise<string[]> {
  const invoke = await getInvoke();
  return await invoke("get_callback_keys");
}

export async function getCommandCallbackLength(): Promise<number> {
  const invoke = await getInvoke();
  return await invoke("get_callback_len");
}
