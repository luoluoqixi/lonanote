import type { ReactNode } from "react";
import type { ScrollViewProps } from "react-native";

import type { SelectProps } from "../select";
import type { SwitchProps } from "../switch";
import type { NativeHapticsSetting } from "../utils";

/** 通用 item base props */
export type NativeListItemBaseProps = {
  chevron?: boolean;
  disabled?: boolean;
  nativeHaptics?: NativeHapticsSetting;
  onPress?: () => void;
  subtitle?: ReactNode;
  title?: ReactNode;
  value?: ReactNode;
};

export type NativeListActionItemProps = NativeListItemBaseProps;
export type NativeListNavigationItemProps = NativeListItemBaseProps;

export type NativeListSwitchItemProps = NativeListItemBaseProps & {
  switchProps: Omit<SwitchProps, "label" | "native">;
};

export type NativeListSelectItemProps = NativeListItemBaseProps & {
  selectProps: Omit<SelectProps, "native" | "nativeTrigger">;
};

/** Section props */
export type NativeListSectionProps = {
  children?: ReactNode;
  footer?: ReactNode;
  title?: ReactNode;
};

/** NativeList Root props */
export type NativeListRootProps = Omit<ScrollViewProps, "children"> & {
  children?: ReactNode;
  /** 设为 false 时使用 list_group 回退模式（所有平台一致） */
  native?: boolean;
};
