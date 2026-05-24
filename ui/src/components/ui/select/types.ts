import type { ComponentProps, ReactNode } from "react";
import type { Select as TamaguiSelect } from "tamagui";

export interface SelectItemData {
  description?: string;
  disabled?: boolean;
  endContent?: ReactNode;
  isDisabled?: boolean;
  label: string;
  startContent?: ReactNode;
  value: string;
}

export type SelectOption = SelectItemData;

export interface SelectProps extends Omit<
  ComponentProps<typeof TamaguiSelect>,
  "children" | "onValueChange"
> {
  accessibilityLabel?: string;
  children?: ReactNode;
  contentProps?: ComponentProps<typeof TamaguiSelect.Content>;
  disabled?: boolean;
  isDisabled?: boolean;
  itemIndicatorProps?: ComponentProps<typeof TamaguiSelect.ItemIndicator>;
  itemProps?: Omit<ComponentProps<typeof TamaguiSelect.Item>, "index" | "value">;
  itemTextProps?: ComponentProps<typeof TamaguiSelect.ItemText>;
  items?: SelectItemData[];
  onValueChange?: (nextValue: string | null) => void;
  options?: SelectItemData[];
  placeholder?: ReactNode;
  triggerProps?: ComponentProps<typeof TamaguiSelect.Trigger>;
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
export type SelectTriggerProps = ComponentProps<typeof TamaguiSelect.Trigger>;
export type SelectValueProps = ComponentProps<typeof TamaguiSelect.Value>;
export type SelectViewportProps = ComponentProps<typeof TamaguiSelect.Viewport>;
export type SelectIndicatorProps = ComponentProps<typeof TamaguiSelect.Indicator>;
export type SelectFocusScopeProps = ComponentProps<typeof TamaguiSelect.FocusScope>;
