import type { toast } from "@heroui/react";
import type { ToastShowConfig as NativeToastShowConfig } from "heroui-native";

export type WebToastProps = Parameters<typeof toast>[1];

export type { NativeToastShowConfig };

export type ToastVariant = "default" | "accent" | "success" | "warning" | "danger";

export interface ToastShowOptions {
  nativeOptions?: NativeToastShowConfig;
  webOptions?: WebToastProps;

  message?: string;
  description?: string;
  variant?: ToastVariant;
  isLoading?: boolean;
  timeout?: number;
  onClose?: () => void;
}

export type ToastFunc = (message: string, options?: ToastShowOptions) => string;
export type ToastVariantFunc = (
  message: string,
  options?: Omit<ToastShowOptions, "variant">,
) => string;

export interface ToastContext {
  toast: ToastFunc;
  toastAccent: ToastVariantFunc;
  toastInfo: ToastVariantFunc;
  toastSuccess: ToastVariantFunc;
  toastError: ToastVariantFunc;
  toastWarning: ToastVariantFunc;
  closeToast: (id: string) => void;
  closeAllToast: () => void;
  isToastVisible: () => boolean;
}
