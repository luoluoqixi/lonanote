import { PromiseData, PromiseT, toast as tamaguiToast } from "@tamagui/toast/v2";

import type { TitleToast, ToastContext, ToastShowOptions } from "./types";

const messageFunction = (title: TitleToast, options?: ToastShowOptions) => {
  return tamaguiToast.message(title, options);
};
const infoFunction = (title: TitleToast, options?: ToastShowOptions) => {
  return tamaguiToast.info(title, options);
};
const successFunction = (title: TitleToast, options?: ToastShowOptions) => {
  return tamaguiToast.success(title, options);
};
const errorFunction = (title: TitleToast, options?: ToastShowOptions) => {
  return tamaguiToast.error(title, options);
};
const warningFunction = (title: TitleToast, options?: ToastShowOptions) => {
  return tamaguiToast.warning(title, options);
};
const loadingFunction = (title: TitleToast, options?: ToastShowOptions) => {
  return tamaguiToast.loading(title, options);
};
const toastFunction = (title: TitleToast, options?: ToastShowOptions) => {
  return messageFunction(title, options);
};
const customFunction = (
  jsx: (id: string | number) => React.ReactElement,
  options?: ToastShowOptions,
) => {
  return tamaguiToast.custom(jsx, options);
};
const promiseFunction = <ToastData>(
  promise: PromiseT<ToastData>,
  data?: PromiseData<ToastData>,
) => {
  return tamaguiToast.promise(promise, data);
};

const toast: ToastContext = {
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

export function useToast(): ToastContext {
  return toast;
}
