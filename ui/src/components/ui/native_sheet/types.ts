import type { ReactNode } from "react";

/** iOS native sheet 的 detents 定义（百分比 0~1） */
export type NativeSheetDetent = number;

export interface NativeSheetProps {
  children?: ReactNode;
  /** Sheet 是否打开 */
  open?: boolean;
  /** 打开/关闭回调 */
  onOpenChange?: (open: boolean) => void;
  /** 关闭回调（快捷） */
  onDismiss?: () => void;
  /** Sheet 名称（用于标识） */
  name?: string;
  /** 可用 detents，例如 [0.5, 1] */
  detents?: NativeSheetDetent[];
  /** 默认展开到第几个 detent */
  defaultDetentIndex?: number;
  /** 是否显示 grabber */
  grabberVisible?: boolean;
  /** iOS 特定 sheet 配置，透传给 react-native-screens Screen */
  iosSheetProps?: {
    sheetAllowedDetents?: (number | "fitToContents")[] | "all" | "medium" | "large";
    sheetExpandsWhenScrolledToEdge?: boolean;
    sheetGrabberVisible?: boolean;
    sheetCornerRadius?: number;
    sheetLargestUndimmedDetentIndex?: number | "none" | "last" | "medium" | "large" | "all";
  };
  /** Android 特定 props */
  androidSheetProps?: Record<string, unknown>;
}

export interface NativeSheetScreenProps {
  children?: ReactNode;
  name: string;
  component?: React.ComponentType;
  options?: Record<string, unknown>;
}

export type NativeSheetComponent = React.FC<NativeSheetProps> & {
  Screen: React.FC<NativeSheetScreenProps>;
};
