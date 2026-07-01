import type { AlertButton } from "react-native";

export type NativeDialogResult = string;

export type NativeDialogButton = {
  key: string;
  onPress?: () => Promise<void> | void;
  style?: AlertButton["style"];
  text: string;
};

export type NativeDialogOptions = {
  buttons?: NativeDialogButton[];
  cancelable?: boolean;
  cancelText?: string;
  confirmText?: string;
  destructive?: boolean;
  message?: string;
  onCancel?: () => Promise<void> | void;
  onConfirm?: () => Promise<void> | void;
  title: string;
};

export type NativeDialogRequest = {
  buttons: NativeDialogButton[];
  id: number;
  options: NativeDialogOptions;
  resolve: (result: NativeDialogResult) => void;
};
