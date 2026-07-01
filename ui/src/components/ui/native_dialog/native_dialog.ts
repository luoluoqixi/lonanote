import { Alert } from "react-native";

import { isWeb } from "@/api/common/platform";

import type { NativeDialogButton, NativeDialogOptions, NativeDialogResult } from "./types";

function getDefaultButtons(options: NativeDialogOptions): NativeDialogButton[] {
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

function getButtons(options: NativeDialogOptions): NativeDialogButton[] {
  const buttons = options.buttons?.filter((button) => button.text.length > 0);
  return buttons != null && buttons.length > 0 ? buttons : getDefaultButtons(options);
}

async function runButton(button: NativeDialogButton): Promise<NativeDialogResult> {
  await button.onPress?.();
  return button.key;
}

function confirmWeb(
  options: NativeDialogOptions,
  buttons: NativeDialogButton[],
): Promise<NativeDialogResult> {
  const cancelButton = buttons.find((button) => button.style === "cancel");
  const confirmButton =
    [...buttons].reverse().find((button) => button.style !== "cancel") ??
    cancelButton ??
    buttons[0];
  const accepted = window.confirm([options.title, options.message].filter(Boolean).join("\n\n"));
  return runButton(accepted ? confirmButton : (cancelButton ?? confirmButton));
}

export function confirmNative(options: NativeDialogOptions): Promise<NativeDialogResult> {
  const buttons = getButtons(options);

  if (isWeb()) {
    return confirmWeb(options, buttons);
  }

  return new Promise((resolve) => {
    let resolved = false;
    const resolveOnce = (result: NativeDialogResult) => {
      if (resolved) {
        return;
      }

      resolved = true;
      resolve(result);
    };

    Alert.alert(
      options.title,
      options.message,
      buttons.map((button) => ({
        onPress: () => {
          void runButton(button).then(resolveOnce);
        },
        style: button.style,
        text: button.text,
      })),
      {
        cancelable: options.cancelable ?? true,
        onDismiss: () => resolveOnce("dismiss"),
      },
    );
  });
}
