import { invoke } from "@tauri-apps/api/core";
import { confirmNative as confirmNativeFallback } from "rn-ui-kit";

import { dialogWindows } from "@/api/commands/win/dialog_windows";
import { isDialogWindowRendererFailure } from "@/api/common/dialogs/dialog_types";
import { isDesktop, isTauri } from "@/api/common/platform";
import { uiPreferences } from "@/stores/ui/ui_preferences";

import { type NativeDialogChoice, mapNativeMessageButtons } from "./native_dialog_model";

type NativeDialogOptions = Parameters<typeof confirmNativeFallback>[0];
type NativeDialogButton = NonNullable<NativeDialogOptions["buttons"]>[number];

function getButtons(options: NativeDialogOptions): NativeDialogButton[] {
  const buttons = options.buttons?.filter((button) => button.text.length > 0);
  if (buttons?.length) return buttons;
  return [
    {
      key: "cancel",
      onPress: options.onCancel,
      style: "cancel",
      text: options.cancelText ?? "取消",
    },
    {
      key: "confirm",
      onPress: options.onConfirm,
      style: options.destructive ? "destructive" : "default",
      text: options.confirmText ?? "确定",
    },
  ];
}

export async function showNativeDialog(options: NativeDialogOptions): Promise<string> {
  if (!isDesktop() || !isTauri() || !uiPreferences.getPreferences().window.nativeDialogs) {
    return confirmNativeFallback(options);
  }

  const buttons = getButtons(options);
  const plan = mapNativeMessageButtons(buttons as NativeDialogChoice[]);
  if (!plan) {
    try {
      const result = await dialogWindows.open({
        requestId: crypto.randomUUID(),
        dialogId: "native.confirm",
        payload: {
          title: options.title,
          message: options.message ?? "",
          buttons: buttons.map(({ key, text, style }) => ({ key, text, style })),
        },
        title: options.title,
        width: 460,
        height: 220,
        blockParentInput: true,
      });
      if (isDialogWindowRendererFailure(result)) return confirmNativeFallback(options);
      const selected =
        buttons.find((button) => button.key === result) ??
        buttons.find((button) => button.style === "cancel");
      if (!selected) return "dismiss";
      await selected.onPress?.();
      return selected.key;
    } catch (error) {
      console.error("[native-dialog] 自定义原生提示失败，回退到应用内提示", error);
      return confirmNativeFallback(options);
    }
  }

  let token: string | undefined;
  let result: string | undefined;
  let nativeError: unknown;
  try {
    token = await invoke<string>("acquire_parent_input_lock");
    result = await invoke<string>("show_native_message", {
      title: options.title,
      message: options.message ?? "",
      kind: options.destructive ? "warning" : "info",
      buttons: plan.buttons,
    });
  } catch (error) {
    nativeError = error;
  } finally {
    if (token) {
      await invoke("release_parent_input_lock", { token }).catch((error) => {
        console.error("[native-dialog] 释放父窗口输入锁失败", error);
      });
    }
  }
  if (nativeError) {
    console.error("[native-dialog] 原生提示失败，回退到应用内提示", nativeError);
    return confirmNativeFallback(options);
  }

  const key = plan.resolve(result ?? "");
  if (!key) return "dismiss";
  const selected = buttons.find((button) => button.key === key);
  if (!selected) return "dismiss";
  await selected.onPress?.();
  return selected.key;
}

export function showNativeAlert(options: NativeDialogOptions): Promise<string> {
  return showNativeDialog(options);
}

export const confirmNative = showNativeDialog;
