import { ButtonProps } from '@radix-ui/themes';
import { ReactNode } from 'react';
import { create } from 'zustand';

export interface GlobalDialogType {
  open: boolean;
  options: GlobalDialogOption;
}

export interface GlobalDialogOption {
  description?: string | ReactNode;
  content?: string | ReactNode | null;
  title?: string | null;
  okText?: string;
  cancelText?: string;
  okBtnProps?: ButtonProps;
  cancelBtnProps?: ButtonProps;
  /** 隐藏确定按钮 */
  hideOkBtn?: boolean;
  /** 隐藏取消按钮 */
  hideCancelBtn?: boolean;
  /** 点击确定按钮时关闭 */
  closeOk?: boolean;
  /** 点击取消按钮时关闭 */
  closeCancel?: boolean;
  onOk?: (() => boolean | void | any) | null;
  onCancel?: (() => boolean | void | any) | null;
  onClose?: (() => void) | null;
}

export const useGlobalDialogStore = create<GlobalDialogType>(() => ({
  open: false,
  options: {},
}));
