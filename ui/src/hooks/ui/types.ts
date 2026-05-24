import { ExternalToast, PromiseData, PromiseT } from "@tamagui/toast/v2";

export type ToastShowOptions = ExternalToast;
export type TitleToast = React.ReactNode | (() => React.ReactNode);

export type ToastFunc = (title: TitleToast, options?: ToastShowOptions) => string | number;
export type ToastVariantFunc = (
  title: TitleToast,
  options?: Omit<ToastShowOptions, "variant">,
) => string | number;
export type ToastCustomFunc = (
  jsx: (id: string | number) => React.ReactElement,
  data?: ToastShowOptions,
) => string | number;
export type ToastPromiseFunc = <ToastData>(
  promise: PromiseT<ToastData>,
  data?: PromiseData<ToastData>,
) =>
  | (string & {
      unwrap: () => Promise<ToastData>;
    })
  | (number & {
      unwrap: () => Promise<ToastData>;
    })
  | {
      unwrap: () => Promise<ToastData>;
    }
  | undefined;

export interface ToastInterface {
  message: ToastVariantFunc;
  info: ToastVariantFunc;
  success: ToastVariantFunc;
  error: ToastVariantFunc;
  warning: ToastVariantFunc;
  loading: ToastVariantFunc;
  custom: ToastCustomFunc;
  promise: ToastPromiseFunc;
  close: (id: string | number) => void;
  closeAll: () => void;
}

export interface ToastContext {
  toast: ToastFunc & ToastInterface;
}
