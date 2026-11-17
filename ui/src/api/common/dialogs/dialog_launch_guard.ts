export type NativeDialogLaunchGuard = { started: boolean };

const nativeSettingsLaunchGuard: NativeDialogLaunchGuard = { started: false };
const nativeDialogLaunchGuards = new Map<string, NativeDialogLaunchGuard>();

/** 设置弹窗的保护状态跨组件重挂载共享，避免重复创建 Tauri 子窗口。 */
export function claimNativeSettingsDialogLaunch(isOpen: boolean, enabled: boolean): boolean {
  return claimNativeDialogLaunch(nativeSettingsLaunchGuard, isOpen, enabled);
}

export function claimNativeDialogWindowLaunch(
  dialogKey: string,
  isOpen: boolean,
  enabled: boolean,
): boolean {
  let guard = nativeDialogLaunchGuards.get(dialogKey);
  if (!guard) {
    guard = { started: false };
    nativeDialogLaunchGuards.set(dialogKey, guard);
  }
  return claimNativeDialogLaunch(guard, isOpen, enabled);
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
