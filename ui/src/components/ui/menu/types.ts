import type { ComponentProps, ReactNode } from "react";
import type { Menu as TamaguiMenu } from "tamagui";

export interface MenuItemData {
  disabled?: boolean;
  indicator?: ReactNode;
  label?: ReactNode;
  onPress?: MenuItemProps["onPress"];
  separator?: boolean;
  value: string;
}

export interface MenuProps extends ComponentProps<typeof TamaguiMenu> {
  arrow?: boolean;
  arrowProps?: MenuArrowProps;
  contentProps?: MenuContentProps;
  itemProps?: Omit<MenuItemProps, "children" | "onPress">;
  items?: MenuItemData[];
  portalProps?: MenuPortalProps;
  trigger?: ReactNode;
  triggerProps?: MenuTriggerProps;
}
export type MenuTriggerProps = ComponentProps<typeof TamaguiMenu.Trigger>;
export type MenuPortalProps = ComponentProps<typeof TamaguiMenu.Portal>;
export type MenuContentProps = ComponentProps<typeof TamaguiMenu.Content>;
export type MenuGroupProps = ComponentProps<typeof TamaguiMenu.Group>;
export type MenuLabelProps = ComponentProps<typeof TamaguiMenu.Label>;
export type MenuItemProps = ComponentProps<typeof TamaguiMenu.Item>;
export type MenuCheckboxItemProps = ComponentProps<typeof TamaguiMenu.CheckboxItem>;
export type MenuRadioGroupProps = ComponentProps<typeof TamaguiMenu.RadioGroup>;
export type MenuRadioItemProps = ComponentProps<typeof TamaguiMenu.RadioItem>;
export type MenuItemIndicatorProps = ComponentProps<typeof TamaguiMenu.ItemIndicator>;
export type MenuSeparatorProps = ComponentProps<typeof TamaguiMenu.Separator>;
export type MenuArrowProps = ComponentProps<typeof TamaguiMenu.Arrow>;
