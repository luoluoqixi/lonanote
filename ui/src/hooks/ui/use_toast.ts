import { PromiseData, PromiseT, toast as tamaguiToast } from "@tamagui/toast/v2";

import { os } from "@/api/common/platform";
import { useScreenOverlayPortalHost } from "@/components/ui/utils/screen_overlay_portal";

import type { TitleToast, ToastContext, ToastShowOptions } from "./types";

function resolveScopedToastOptions(
  options: ToastShowOptions | undefined,
  viewportName: string | undefined,
): ToastShowOptions | undefined {
  if (viewportName == null) {
    return options;
  }

  return { ...options, viewportName };
}

function isHttpResponse(value: unknown): value is Response {
  return typeof Response !== "undefined" && value instanceof Response;
}

export function useToast(): ToastContext {
  const screenOverlayPortalHost = useScreenOverlayPortalHost();
  const viewportName =
    os() === "ios" && screenOverlayPortalHost != null ? screenOverlayPortalHost : undefined;

  const messageFunction = (title: TitleToast, options?: ToastShowOptions) => {
    return tamaguiToast.message(title, resolveScopedToastOptions(options, viewportName));
  };
  const infoFunction = (title: TitleToast, options?: ToastShowOptions) => {
    return tamaguiToast.info(title, resolveScopedToastOptions(options, viewportName));
  };
  const successFunction = (title: TitleToast, options?: ToastShowOptions) => {
    return tamaguiToast.success(title, resolveScopedToastOptions(options, viewportName));
  };
  const errorFunction = (title: TitleToast, options?: ToastShowOptions) => {
    return tamaguiToast.error(title, resolveScopedToastOptions(options, viewportName));
  };
  const warningFunction = (title: TitleToast, options?: ToastShowOptions) => {
    return tamaguiToast.warning(title, resolveScopedToastOptions(options, viewportName));
  };
  const loadingFunction = (title: TitleToast, options?: ToastShowOptions) => {
    return tamaguiToast.loading(title, resolveScopedToastOptions(options, viewportName));
  };
  const toastFunction = (title: TitleToast, options?: ToastShowOptions) => {
    return messageFunction(title, options);
  };
  const customFunction = (
    jsx: (id: string | number) => React.ReactElement,
    options?: ToastShowOptions,
  ) => {
    return tamaguiToast.custom(jsx, resolveScopedToastOptions(options, viewportName));
  };
  const promiseFunction = <ToastData>(
    promise: PromiseT<ToastData>,
    data?: PromiseData<ToastData>,
  ) => {
    if (viewportName == null) {
      return tamaguiToast.promise(promise, data);
    }

    const resolvedPromise = Promise.resolve(typeof promise === "function" ? promise() : promise);
    let toastId: string | number | undefined;

    if (data?.loading !== undefined) {
      const description =
        typeof data.description === "function" ? undefined : data.description;
      toastId = loadingFunction(data.loading, {
        description,
        duration: Number.POSITIVE_INFINITY,
      });
    }

    const wrappedPromise = resolvedPromise
      .then(async (result) => {
        if (isHttpResponse(result) && !result.ok && data?.error !== undefined) {
          const message =
            typeof data.error === "function"
              ? await data.error(`HTTP error! status: ${result.status}`)
              : data.error;
          const description =
            typeof data.description === "function"
              ? await data.description(`HTTP error! status: ${result.status}`)
              : data.description;
          errorFunction(message, { description, id: toastId });
          toastId = undefined;
          return result;
        }

        if (data?.success !== undefined) {
          const message =
            typeof data.success === "function" ? await data.success(result) : data.success;
          const description =
            typeof data.description === "function" ? await data.description(result) : data.description;
          successFunction(message, { description, id: toastId });
          toastId = undefined;
        } else if (toastId != null) {
          tamaguiToast.dismiss(toastId);
          toastId = undefined;
        }

        return result;
      })
      .catch(async (error) => {
        if (data?.error !== undefined) {
          const message = typeof data.error === "function" ? await data.error(error) : data.error;
          const description =
            typeof data.description === "function" ? await data.description(error) : data.description;
          errorFunction(message, { description, id: toastId });
          toastId = undefined;
        } else if (toastId != null) {
          tamaguiToast.dismiss(toastId);
          toastId = undefined;
        }

        throw error;
      })
      .finally(() => {
        data?.finally?.();
      }) as Promise<ToastData>;

    return Object.assign(toastId ?? {}, {
      unwrap: () => wrappedPromise,
    }) as {
      unwrap: () => Promise<ToastData>;
    };
  };

  return {
    toast: Object.assign(toastFunction, {
      message: messageFunction,
      info: infoFunction,
      success: successFunction,
      error: errorFunction,
      warning: warningFunction,
      loading: loadingFunction,
      custom: customFunction,
      promise: promiseFunction,
      close: (id: string | number) => {
        tamaguiToast.dismiss(id);
      },
      closeAll: () => {
        tamaguiToast.dismiss();
      },
    }),
  };
}
