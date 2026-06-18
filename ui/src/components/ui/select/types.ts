import type { ComponentProps, ReactNode } from "react";
import type { ViewStyle } from "react-native";
import type { Select as TamaguiSelect } from "tamagui";

import type { NativeHapticsSetting } from "../utils";

/** 原生 Picker 弹出模式。仅在 props.native 为 true 时生效。 */
export type NativePickerMode = "dialog" | "dropdown" | "wheel";
export type SelectNativeMode = boolean | "native-sheet" | "custom-sheet";

export interface SelectItemData {
  "aria-label"?: string;
  description?: string;
  disabled?: boolean;
  endContent?: ReactNode;
  isDisabled?: boolean;
  label: string;
  startContent?: ReactNode;
  value: string;
}

export interface SelectItemGroupData {
  items: SelectItemData[];
  key?: string;
  label?: ReactNode;
}

export type SelectOption = SelectItemData;
export type SelectOptionGroup = SelectItemGroupData;

export interface SelectProps extends Omit<
  ComponentProps<typeof TamaguiSelect>,
  "children" | "native" | "onValueChange"
> {
  "aria-label"?: string;
  children?: ReactNode;
  contentProps?: ComponentProps<typeof TamaguiSelect.Content>;
  disabled?: boolean;
  isDisabled?: boolean;
  itemIndicatorProps?: ComponentProps<typeof TamaguiSelect.ItemIndicator>;
  itemGroups?: SelectItemGroupData[];
  itemProps?: Omit<ComponentProps<typeof TamaguiSelect.Item>, "index" | "value">;
  itemTextProps?: ComponentProps<typeof TamaguiSelect.ItemText>;
  items?: SelectItemData[];
  itemLabel?: ReactNode;
  itemLabelProps?: SelectLabelProps;
  nativeHaptics?: NativeHapticsSetting;
  /** 原生 Picker 弹出模式。仅在 props.native === true 时生效。
   * 默认 Android 端 "dialog"
   * 默认 iOS 端 "dropdown"
   * dialog 仅 Android 可用
   * dropdown Android 和 iOS 都可用
   * wheel iOS 专用，使用 Expo UI SwiftUI Picker wheel 样式
   * */
  nativePickerMode?: NativePickerMode;
  /** Select 平台弹出模式。
   * true：移动端走原生 picker；web 走 Tamagui `native=true`
   * false：移动端走 native-sheet；web 保持原有非 native Select
   * "native-sheet"：移动端走 native-sheet；web 回退到 Tamagui `native=true`
   * "custom-sheet"：移动端走项目自定义 Sheet；web 回退到 Tamagui `native=true`
   * */
  native?: SelectNativeMode;
  /** 是否使用项目自绘 trigger。
   * true = 在 Web / iOS / Android 上都使用统一的文本 + 双箭头 trigger 外观
   *   原生 picker 路径：打开平台原生 picker
   *   Tamagui Select 路径：打开现有 Select/Sheet/Menu 内容
   * false = 使用各路径默认 trigger 外观 */
  nativeTrigger?: boolean;
  onValueChange?: (nextValue: string | null) => void;
  options?: SelectItemData[];
  placeholder?: ReactNode;
  touchSheetMaxHeight?: ViewStyle["maxHeight"];
  triggerProps?: SelectTriggerProps;
  viewportProps?: ComponentProps<typeof TamaguiSelect.Viewport>;
}

export type SelectAdaptProps = ComponentProps<typeof TamaguiSelect.Adapt>;
export type SelectAdaptContentsProps = ComponentProps<typeof TamaguiSelect.Adapt.Contents>;
export type SelectContentProps = ComponentProps<typeof TamaguiSelect.Content>;
export type SelectGroupProps = ComponentProps<typeof TamaguiSelect.Group>;
export type SelectIconProps = ComponentProps<typeof TamaguiSelect.Icon>;
export type SelectItemProps = ComponentProps<typeof TamaguiSelect.Item>;
export type SelectItemIndicatorProps = ComponentProps<typeof TamaguiSelect.ItemIndicator>;
export type SelectItemTextProps = ComponentProps<typeof TamaguiSelect.ItemText>;
export type SelectLabelProps = ComponentProps<typeof TamaguiSelect.Label>;
export type SelectScrollDownButtonProps = ComponentProps<typeof TamaguiSelect.ScrollDownButton>;
export type SelectScrollUpButtonProps = ComponentProps<typeof TamaguiSelect.ScrollUpButton>;
export type SelectTriggerProps = ComponentProps<typeof TamaguiSelect.Trigger> & {
  nativeHaptics?: NativeHapticsSetting;
};
export type SelectValueProps = ComponentProps<typeof TamaguiSelect.Value>;
export type SelectViewportProps = ComponentProps<typeof TamaguiSelect.Viewport>;
export type SelectIndicatorProps = ComponentProps<typeof TamaguiSelect.Indicator>;
export type SelectFocusScopeProps = ComponentProps<typeof TamaguiSelect.FocusScope>;
