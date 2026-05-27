import type { ComponentProps, ReactNode } from "react";
import type { Popover as TamaguiPopover } from "tamagui";

export interface PopoverProps extends ComponentProps<typeof TamaguiPopover> {
  arrow?: boolean;
  arrowProps?: PopoverArrowProps;
  content?: ReactNode;
  contentProps?: PopoverContentProps;
  dismissOnBackPress?: boolean;
  trigger?: ReactNode;
  triggerProps?: PopoverTriggerProps;
}
export type PopoverAnchorProps = ComponentProps<typeof TamaguiPopover.Anchor>;
export type PopoverArrowProps = ComponentProps<typeof TamaguiPopover.Arrow>;
export type PopoverTriggerProps = ComponentProps<typeof TamaguiPopover.Trigger>;
export type PopoverContentProps = ComponentProps<typeof TamaguiPopover.Content>;
export type PopoverCloseProps = ComponentProps<typeof TamaguiPopover.Close>;
