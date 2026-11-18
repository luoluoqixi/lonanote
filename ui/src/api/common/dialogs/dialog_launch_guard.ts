export type NativeDialogLaunchGuard = { started: boolean };

const nativeSettingsLaunchGuard: NativeDialogLaunchGuard = { started: false };
const nativeDialogLaunchGuards = new Map<string, string>();
const nativeDialogLaunchListeners = new Map<string, Set<() => void>>();

/** 设置弹窗的保护状态跨组件重挂载共享，避免重复创建 Tauri 子窗口。 */
export function claimNativeSettingsDialogLaunch(isOpen: boolean, enabled: boolean): boolean {
  return claimNativeDialogLaunch(nativeSettingsLaunchGuard, isOpen, enabled);
}

export function claimNativeDialogWindowLaunch(
  dialogKey: string,
  enabled: boolean,
  requestId: string,
): boolean {
  if (!enabled || nativeDialogLaunchGuards.has(dialogKey)) return false;
  nativeDialogLaunchGuards.set(dialogKey, requestId);
  return true;
}

/** 请求结束后归还租约；旧请求延迟结束不能解除新窗口的防重保护。 */
export function releaseNativeDialogWindowLaunch(dialogKey: string, requestId: string): void {
  if (nativeDialogLaunchGuards.get(dialogKey) === requestId) {
    nativeDialogLaunchGuards.delete(dialogKey);
    nativeDialogLaunchListeners.get(dialogKey)?.forEach((listener) => listener());
  }
}

/** 重挂载的新实例等待旧实例撤销完成，再取得启动租约。 */
export function subscribeNativeDialogWindowLaunch(dialogKey: string, listener: () => void) {
  const listeners = nativeDialogLaunchListeners.get(dialogKey) ?? new Set<() => void>();
  nativeDialogLaunchListeners.set(dialogKey, listeners);
  listeners.add(listener);
  return () => {
    listeners.delete(listener);
    if (!listeners.size) nativeDialogLaunchListeners.delete(dialogKey);
  };
}

export function claimNativeDialogLaunch(
  guard: NativeDialogLaunchGuard,
  isOpen: boolean,
  enabled: boolean,
): boolean {
  if (!isOpen) {
    guard.started = false;
    return false;
  }
  if (!enabled || guard.started) return false;
  guard.started = true;
  return true;
}
