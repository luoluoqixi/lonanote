import type { InvokeCommand } from "./types";

const state: any = {};

// Tauri 在原生 setup 阶段完成 Rust 初始化；普通 Web 没有 Rust runtime。
export function initializeRustRuntime(): void {}

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
  const unlisten = await appWebview.listen<{ requestId: string; key: string; args: string | null }>(
    "lonanote://callback-request",
    async (event) => {
      if (event.payload.key !== key) return;
      const { requestId, args } = event.payload;
      try {
        const result = await callback(args);
        await invoke("resolve_callback", { requestId, key, result: result ?? null, error: null });
      } catch (error) {
        await invoke("resolve_callback", {
          requestId,
          key,
          result: null,
          error: error instanceof Error ? error.message : String(error),
        });
      }
    },
  );
  state.listenMap = state.listenMap || {};
  state.listenMap[key]?.();
  state.listenMap[key] = unlisten;
  try {
    await invoke("reg_callback_function", { key });
  } catch (error) {
    unlisten();
    if (state.listenMap[key] === unlisten) delete state.listenMap[key];
    throw error;
  }
  return () => {
    void unregCallbackFunction(key, unlisten);
  };
}

export async function unregCallbackFunction(key: string, expectedListener?: () => void) {
  const invoke = await getInvoke();
  if (expectedListener && state.listenMap?.[key] !== expectedListener) return;
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
