import type { TrueSheetProps } from "@lodev09/react-native-true-sheet";
import type { ParamListBase } from "@react-navigation/native";
import type { ComponentType, ReactNode } from "react";
import type { ViewStyle } from "react-native";

import type { TrueSheetInnerStackScreenOptions } from "./true_sheet/stack_navigator";

export type NativeSheetSnapPoint = string | number;

export type NativeSheetSnapPointsMode = "percent" | "constant" | "fit" | "mixed";

export interface NativeSheetProps {
  backgroundColor?: ViewStyle["backgroundColor"];
  children?: ReactNode;
  content?: ReactNode;
  defaultOpen?: boolean;
  defaultPosition?: number;
  dismissOnBackPress?: boolean;
  dismissOnOverlayPress?: boolean;
  disableDrag?: boolean;
  /** 默认 grabber 下，内容区相对拖拽条预留的顶部占位；设为 0 可回到紧凑布局。 */
  grabberContentInsetTop?: number;
  handle?: boolean;
  modal?: boolean;
  name?: string;
  native?: boolean;
  onAnimationComplete?: (event: { open: boolean }) => void;
  onOpenChange?: (open: boolean) => void;
  onPositionChange?: (position: number) => void;
  open?: boolean;
  overlay?: boolean;
  overlayPortalHostName?: string;
  position?: number;
  snapPoints?: NativeSheetSnapPoint[];
  snapPointsMode?: NativeSheetSnapPointsMode;
}

export type NativeSheetStackScreenProps = {
  component: ComponentType<any>;
  name: string;
  options?: Record<string, unknown>;
};

export interface NativeSheetStackProps<ParamList extends ParamListBase = ParamListBase> {
  children: ReactNode;
  initialRouteName?: keyof ParamList & string;
  name?: string;
  onOpenChange?: (open: boolean) => void;
  open?: boolean;
  overlayPortalHostName?: string;
  screenOptions?: TrueSheetInnerStackScreenOptions;
  sheetProps?: Omit<TrueSheetProps, "children" | "header" | "name"> & {
    snapPoints?: NativeSheetProps["snapPoints"];
    snapPointsMode?: NativeSheetProps["snapPointsMode"];
  };
}
