import {
  type ToastShowOptions as NativeToastShowOptions,
  useToast as useToastNative,
} from "heroui-native";
import { useCallback } from "react";

import type { ToastContext, ToastShowOptions, ToastVariant } from "./types";

const getToastShowOptions = (
  message: string,
  options?: ToastShowOptions,
  variant?: ToastVariant,
): NativeToastShowOptions => {
  const nativeOptions = options?.nativeOptions || {};
  const resolvedVariant = variant || options?.variant || "default";

  return {
    ...nativeOptions,
    variant: resolvedVariant,
    label: message,
    description: options?.description,
    duration: options?.timeout,
    onHide: options?.onClose,
  };
};

export function useToast(): ToastContext {
  const { toast, isToastVisible } = useToastNative();

  const showToast = useCallback(
    (message: string, options?: ToastShowOptions) =>
      toast.show(getToastShowOptions(message, options)),
    [toast],
  );
  const showInfo = useCallback(
    (message: string, options?: ToastShowOptions) =>
      toast.show(getToastShowOptions(message, options, "default")),
    [toast],
  );
  const showAccent = useCallback(
    (message: string, options?: ToastShowOptions) =>
      toast.show(getToastShowOptions(message, options, "accent")),
    [toast],
  );
  const showSuccess = useCallback(
    (message: string, options?: ToastShowOptions) =>
      toast.show(getToastShowOptions(message, options, "success")),
    [toast],
  );
  const showWarning = useCallback(
    (message: string, options?: ToastShowOptions) =>
      toast.show(getToastShowOptions(message, options, "warning")),
    [toast],
  );
  const showError = useCallback(
    (message: string, options?: ToastShowOptions) =>
      toast.show(getToastShowOptions(message, options, "danger")),
    [toast],
  );
  const closeToast = useCallback((id: string | string[]) => toast.hide(id), [toast]);
  const closeAllToast = useCallback(() => toast.hide("all"), [toast]);

  return {
    toast: showToast,
    toastAccent: showAccent,
    toastInfo: showInfo,
    toastSuccess: showSuccess,
    toastError: showError,
    toastWarning: showWarning,
    closeToast,
    closeAllToast,
    isToastVisible: () => isToastVisible,
  };
}
