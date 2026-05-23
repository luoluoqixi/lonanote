import type { ReactNode } from "react";
import type { StyleProp, ViewStyle } from "react-native";

export enum SplitLayoutPriority {
  Normal = "NORMAL",
  Low = "LOW",
  High = "HIGH",
}

export type SplitLayoutState = {
  sizes: number[];
  visible: boolean[];
};

export type SplitLayoutMobileHandlePosition = "center" | "left" | "right" | "top" | "bottom";

export type SplitLayoutMobileHandlePositions = Partial<
  Record<number, SplitLayoutMobileHandlePosition>
>;

export type SplitLayoutMobileHandleOffsets = Partial<Record<number, number>>;

export type SplitLayoutHandle = {
  reset: () => void;
  resize: (sizes: number[]) => void;
  setVisible: (index: number, visible: boolean) => void;
  getState: () => SplitLayoutState;
};

export type SplitLayoutProviderProps = {
  children: ReactNode;
  storageKey?: string;
  fallbackState?: SplitLayoutState;
};

export type SplitLayoutCommonProps = {
  className?: string;
  maxSize?: number;
  minSize?: number;
  snap?: boolean;
  style?: StyleProp<ViewStyle>;
};

export type SplitLayoutPaneProps = SplitLayoutCommonProps & {
  children: ReactNode;
  preferredSize?: number | string;
  priority?: SplitLayoutPriority;
  visible?: boolean;
};

export type SplitLayoutProps = SplitLayoutCommonProps & {
  children: ReactNode;
  defaultSizes?: number[];
  mobileHandleOffset?: number;
  mobileHandlePosition?: SplitLayoutMobileHandlePosition;
  mobileHandleOffsets?: SplitLayoutMobileHandleOffsets;
  mobileHandlePositions?: SplitLayoutMobileHandlePositions;
  proportionalLayout?: boolean;
  separator?: boolean;
  storageKey?: string;
  storageFallbackState?: SplitLayoutState;
  vertical?: boolean;
  onChange?: (sizes: number[]) => void;
  onDragEnd?: (sizes: number[]) => void;
  onDragStart?: (sizes: number[]) => void;
  onReset?: () => void;
  onStateChange?: (state: SplitLayoutState) => void;
  onVisibleChange?: (index: number, visible: boolean) => void;
};

export type PaneDescriptor = Required<Pick<SplitLayoutPaneProps, "priority">> & {
  key: string;
  children: ReactNode;
  className?: string;
  maxSize: number;
  minSize: number;
  preferredSize?: number | string;
  snap: boolean;
  style?: StyleProp<ViewStyle>;
  visible?: boolean;
};
