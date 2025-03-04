import { create } from 'zustand';

export interface GlobalDialogType {
  open: boolean;
  options: GlobalDialogOption;
}

export type GlobalDialogButtonColorPalette =
  | 'transparent'
  | 'current'
  | 'black'
  | 'white'
  | 'whiteAlpha'
  | 'blackAlpha'
  | 'gray'
  | 'red'
  | 'orange'
  | 'yellow'
  | 'green'
  | 'teal'
  | 'blue'
  | 'cyan'
  | 'purple'
  | 'pink'
  | 'bg'
  | 'fg'
  | 'border';

export interface GlobalDialogOption {
  content?: string | null;
  title?: string | null;
  /** @default "md" */
  size?: 'xs' | 'sm' | 'md' | 'lg' | 'xl' | 'cover' | 'full';
  /** @default "outside" */
  scrollBehavior?: 'inside' | 'outside';
  /** @default "center" */
  placement?: 'center' | 'top' | 'bottom';
  /** @default "scale" */
  motionPreset?:
    | 'scale'
    | 'slide-in-bottom'
    | 'slide-in-top'
    | 'slide-in-left'
    | 'slide-in-right'
    | 'none';
  okText?: string;
  cancelText?: string;
  okBtnVariant?: 'solid' | 'subtle' | 'surface' | 'outline' | 'ghost' | 'plain';
  cancelBtnVariant?: 'solid' | 'subtle' | 'surface' | 'outline' | 'ghost' | 'plain';
  okBtnColorPalette?: GlobalDialogButtonColorPalette;
  cancelBtnColorPalette?: GlobalDialogButtonColorPalette;
  /** 隐藏确定按钮 */
  hideOkBtn?: boolean;
  /** 隐藏取消按钮 */
  hideCancelBtn?: boolean;
  /** 隐藏关闭按钮 */
  hideCloseBtn?: boolean;
  /** 点击确定按钮时关闭 */
  closeOk?: boolean;
  /** 点击取消按钮时关闭 */
  closeCancel?: boolean;
  onOk?: (() => void) | null;
  onCancel?: (() => void) | null;
  onClose?: (() => void) | null;
}

export const useGlobalDialogStore = create<GlobalDialogType>(() => ({
  open: false,
  options: {},
}));
