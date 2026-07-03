import type { ParamListBase } from "@react-navigation/native";
import type { NativeStackNavigationOptions } from "@react-navigation/native-stack";
import type { StackNavigationOptions } from "@react-navigation/stack";
import type { TransitionProp } from "@tamagui/core";
import type { ComponentType, ReactNode } from "react";
import type { ViewStyle } from "react-native";

export type NativeSheetSnapPoint = string | number;

export type NativeSheetSnapPointsMode = "percent" | "constant" | "fit" | "mixed";

export type NativeSheetStackScreenOptions = NativeStackNavigationOptions | StackNavigationOptions;

export type NativeSheetStackSheetProps = {
  detents?: Array<number | "auto">;
  dismissible?: boolean;
  grabber?: boolean;
  initialDetentIndex?: number;
  insetAdjustment?: string;
  scrollable?: boolean;
  scrollableOptions?: Record<string, unknown>;
  snapPoints?: NativeSheetSnapPoint[];
  snapPointsMode?: NativeSheetSnapPointsMode;
  style?: unknown;
};

export interface NativeSheetProps {
  backgroundColor?: ViewStyle["backgroundColor"];
  children?: ReactNode;
  content?: ReactNode;
  defaultOpen?: boolean;
  defaultPosition?: number;
  dismissOnBackPress?: boolean;
  dismissOnOverlayPress?: boolean;
  disableDrag?: boolean;
  /** 原生 grabber 需要避让时，为内容区额外预留顶部占位；默认不预留，让拖拽条悬浮覆盖在内容顶部。 */
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
  transition?: TransitionProp;
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
  screenOptions?: NativeSheetStackScreenOptions;
  sheetProps?: NativeSheetStackSheetProps;
}
