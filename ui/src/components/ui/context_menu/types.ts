import type { ComponentProps, ReactNode } from "react";
import type { ContextMenu as TamaguiContextMenu } from "tamagui";

import type { NativeHapticsSetting } from "../utils";

export interface ContextMenuItemData {
  "aria-label"?: string;
  destructive?: boolean;
  disabled?: boolean;
  indicator?: ReactNode;
  label?: ReactNode;
  onPress?: ContextMenuItemProps["onSelect"];
  onSelect?: ContextMenuItemProps["onSelect"];
  separator?: boolean;
  textValue?: string;
  value: string;
}

export interface ContextMenuProps extends ComponentProps<typeof TamaguiContextMenu> {
  arrow?: boolean;
  arrowProps?: ContextMenuArrowProps;
  contentProps?: ContextMenuContentProps;
  itemProps?: Omit<ContextMenuItemProps, "children" | "onPress" | "onSelect">;
  items?: ContextMenuItemData[];
  nativeHaptics?: NativeHapticsSetting;
  portalProps?: ContextMenuPortalProps;
  trigger?: ReactNode;
  triggerProps?: ContextMenuTriggerProps;
}

export type ContextMenuTriggerProps = ComponentProps<typeof TamaguiContextMenu.Trigger>;
export type ContextMenuPortalProps = ComponentProps<typeof TamaguiContextMenu.Portal>;
export type ContextMenuContentProps = ComponentProps<typeof TamaguiContextMenu.Content>;
export type ContextMenuGroupProps = ComponentProps<typeof TamaguiContextMenu.Group>;
export type ContextMenuLabelProps = ComponentProps<typeof TamaguiContextMenu.Label>;
export type ContextMenuItemProps = ComponentProps<typeof TamaguiContextMenu.Item>;
export type ContextMenuItemTitleProps = ComponentProps<typeof TamaguiContextMenu.ItemTitle>;
export type ContextMenuItemSubtitleProps = ComponentProps<typeof TamaguiContextMenu.ItemSubtitle>;
export type ContextMenuItemIconProps = ComponentProps<typeof TamaguiContextMenu.ItemIcon>;
export type ContextMenuItemImageProps = ComponentProps<typeof TamaguiContextMenu.ItemImage>;
export type ContextMenuCheckboxItemProps = ComponentProps<typeof TamaguiContextMenu.CheckboxItem>;
export type ContextMenuRadioGroupProps = ComponentProps<typeof TamaguiContextMenu.RadioGroup>;
export type ContextMenuRadioItemProps = ComponentProps<typeof TamaguiContextMenu.RadioItem>;
export type ContextMenuItemIndicatorProps = ComponentProps<typeof TamaguiContextMenu.ItemIndicator>;
export type ContextMenuSeparatorProps = ComponentProps<typeof TamaguiContextMenu.Separator>;
export type ContextMenuArrowProps = ComponentProps<typeof TamaguiContextMenu.Arrow>;
export type ContextMenuSubProps = ComponentProps<typeof TamaguiContextMenu.Sub>;
export type ContextMenuSubTriggerProps = ComponentProps<typeof TamaguiContextMenu.SubTrigger>;
export type ContextMenuSubContentProps = ComponentProps<typeof TamaguiContextMenu.SubContent>;
export type ContextMenuPreviewProps = ComponentProps<typeof TamaguiContextMenu.Preview>;
