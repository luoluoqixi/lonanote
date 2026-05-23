import { toast as webToast } from "@heroui/react";

import type { ToastContext, ToastShowOptions, WebToastProps } from "./types";

const getWebToastOptions = (options?: ToastShowOptions): WebToastProps => {
  const webOptions: WebToastProps = options?.webOptions || {};

  if (options?.description) {
    webOptions.description = options.description;
  }
  if (options?.variant) {
    webOptions.variant = options.variant;
  }
  if (options?.isLoading) {
    webOptions.isLoading = options.isLoading;
  }
  if (options?.timeout) {
    webOptions.timeout = options.timeout;
  }
  if (options?.onClose) {
    webOptions.onClose = options.onClose;
  }
  return webOptions;
};

const toastContext: ToastContext = {
  toast: (message: string, options?: ToastShowOptions) => {
    if (options?.message) {
      message = options.message;
    }
    return webToast(message, getWebToastOptions(options));
  },
  toastAccent: (message: string, options?: Omit<ToastShowOptions, "variant">) => {
    const opt = getWebToastOptions(options)!;
    opt.variant = "accent";
    return webToast(message, opt);
  },
  toastInfo: (message: string, options?: Omit<ToastShowOptions, "variant">) => {
    return webToast.info(message, getWebToastOptions(options));
  },
  toastSuccess: (message: string, options?: Omit<ToastShowOptions, "variant">) => {
    return webToast.success(message, getWebToastOptions(options));
  },
  toastError: (message: string, options?: Omit<ToastShowOptions, "variant">) => {
    return webToast.danger(message, getWebToastOptions(options));
  },
  toastWarning: (message: string, options?: Omit<ToastShowOptions, "variant">) => {
    return webToast.warning(message, getWebToastOptions(options));
  },
  closeToast: (id: string | string[]) => {
    if (typeof id === "string") {
      webToast.close(id);
    } else if (Array.isArray(id)) {
      id.forEach((toastId) => webToast.close(toastId));
    }
  },
  closeAllToast: () => {
    webToast.clear();
  },
  isToastVisible: () => {
    return webToast.getQueue().visibleToasts.length > 0;
  },
};

export function useToast(): ToastContext {
  return toastContext;
}
