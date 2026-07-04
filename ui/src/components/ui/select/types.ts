import type { ComponentProps, ReactNode } from "react";
import type { StyleProp, ViewStyle } from "react-native";
import type { Select as TamaguiSelect } from "tamagui";

import type { TextProps } from "../text";
import type { NativeHapticsSetting } from "../utils";

/** 原生 Picker 弹出模式。仅在 props.native 为 true 时生效。 */
export type NativePickerMode = "dialog" | "dropdown" | "wheel";
export type SelectNativeMode = boolean | "native-sheet" | "custom-sheet";
export type SelectNativeTriggerIcon = "stacked" | "chevrons-up-down" | "none";
export type SelectNativeDropdownAlign = "start" | "center" | "end";

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
export type SelectWebMenuPlacement =
  | "top"
  | "top-start"
  | "top-end"
  | "bottom"
  | "bottom-start"
  | "bottom-end"
  | "left"
  | "left-start"
  | "left-end"
  | "right"
  | "right-start"
  | "right-end";

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
  /** 原生 dropdown 锚点的水平对齐方式。Android dropdown 默认 `center`，其他场景默认 `start`。 */
  nativeDropdownAlign?: SelectNativeDropdownAlign;
  /** 原生 dropdown 锚点相对边缘的内缩距离。默认 `0`。 */
  nativeDropdownEdgeOffset?: number;
  /** Android 原生 dropdown 锚点宽度。默认使用组件内部宽度。 */
  nativeDropdownAnchorWidth?: number;
  /** Select 平台弹出模式。
   * true：移动端走原生 picker；web 走 Tamagui `native=true`
   * false：移动端走 native-sheet；web 保持原有非 native Select
   * "native-sheet"：移动端走 native-sheet；web 回退到 Tamagui `native=true`
   * "custom-sheet"：移动端走项目自定义 Sheet；web 回退到 Tamagui `native=true`
   * */
  native?: SelectNativeMode;
  /** 自定义 nativeTrigger 的完整内容。用于列表行等需要替换整套 trigger 结构的场景。 */
  nativeTriggerContent?: ReactNode;
  /** nativeTrigger 默认内容容器样式。用于不替换结构、只调整样式的场景。 */
  nativeTriggerContainerStyle?: StyleProp<ViewStyle>;
  /** nativeTrigger 默认文本样式。 */
  nativeTriggerLabelProps?: TextProps;
  /** nativeTrigger 默认图标样式。 */
  nativeTriggerIcon?: SelectNativeTriggerIcon;
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
  /** Web 非 native Menu 弹层的 placement。默认沿用底层 Menu 行为。 */
  placement?: SelectWebMenuPlacement;
  triggerProps?: SelectTriggerProps;
  viewportProps?: ComponentProps<typeof TamaguiSelect.Viewport>;
  /** Web 非 native Menu 弹层是否显示指向 trigger 的箭头。默认不显示。 */
  webMenuArrow?: boolean;
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
