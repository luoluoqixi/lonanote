import type { ComponentProps, ReactNode } from "react";
import type { Tooltip as TamaguiTooltip, TooltipGroup as TamaguiTooltipGroup } from "tamagui";

export type TooltipRootProps = ComponentProps<typeof TamaguiTooltip>;

export interface TooltipProps extends Omit<TooltipRootProps, "children"> {
  anchor?: ReactNode;
  anchorProps?: TooltipAnchorProps;
  arrow?: boolean;
  arrowProps?: TooltipArrowProps;
  children: ReactNode;
  content: ReactNode;
  contentProps?: TooltipContentProps;
  triggerProps?: TooltipTriggerProps;
}

export type TooltipAnchorProps = ComponentProps<typeof TamaguiTooltip.Anchor>;
export type TooltipArrowProps = ComponentProps<typeof TamaguiTooltip.Arrow>;
export type TooltipContentProps = ComponentProps<typeof TamaguiTooltip.Content>;
export type TooltipTriggerProps = ComponentProps<typeof TamaguiTooltip.Trigger>;
export type TooltipGroupProps = ComponentProps<typeof TamaguiTooltipGroup>;
