import type { ReactNode } from "react";
import type { ScrollViewProps, ViewStyle } from "react-native";

import type { SelectProps } from "../select";
import type { SwitchProps } from "../switch";
import type { NativeHapticsSetting } from "../utils";

/** 通用 item base props */
export type NativeListItemBaseProps = {
  /** `true` 或不传时沿用默认主色，传字符串时使用自定义 tint，传 `false` 时不传 tint。 */
  btnTint?: boolean | string;
  chevron?: boolean;
  disabled?: boolean;
  nativeHaptics?: NativeHapticsSetting;
  /** iOS 原生 List 用于滚动定位的稳定 id。 */
  nativeScrollId?: string | number;
  onPress?: () => void;
  selected?: boolean;
  subtitle?: ReactNode;
  title?: ReactNode;
  titleAlign?: "center" | "right" | "left";
  value?: ReactNode;
};

export type NativeListActionItemProps = NativeListItemBaseProps;
export type NativeListNavigationItemProps = NativeListItemBaseProps;

export type NativeListSwitchItemProps = NativeListItemBaseProps & {
  switchProps: Omit<SwitchProps, "label" | "native">;
};

export type NativeListSelectItemProps = NativeListItemBaseProps & {
  selectProps: Omit<SelectProps, "nativeTrigger">;
};

export type NativeListItemProps = NativeListItemBaseProps & {
  title: string;
  onPress?: () => void;
  disabled?: boolean;
  titleAlign?: "center" | "right" | "left";
};

export type NativeListButtonItemProps = NativeListItemProps;

export type NativeListCustomItemProps = {
  children?: ReactNode;
  disabled?: boolean;
  nativeHaptics?: NativeHapticsSetting;
  onPress?: () => void;
};

/** Section props */
export type NativeListSectionProps = {
  children?: ReactNode;
  footer?: ReactNode;
  title?: ReactNode;
};

/** NativeList Root props */
export type NativeListRootProps = Omit<ScrollViewProps, "children"> & {
  /** 列表宿主背景色：iOS 原生 List 直接作用于 List，自定义 fallback 作用于根容器。 */
  backgroundColor?: ViewStyle["backgroundColor"];
  children?: ReactNode;
  /** 原生 List 内容顶部内边距。 */
  contentMarginTop?: number;
  /** 原生 List 内容底部内边距。 */
  contentMarginBottom?: number;
  /** iOS 原生 List 初次挂载后滚动到的目标 id。 */
  initialScrollTarget?: string | number;
  /** 设为 false 时使用 list_group 回退模式（所有平台一致） */
  native?: boolean;
  /** 设为 false 时不创建内部 ScrollView，由外层宿主负责滚动。 */
  scrollable?: boolean;
};
