import { Popover as TamaguiPopover } from "tamagui";

import type {
  PopoverAnchorProps,
  PopoverArrowProps,
  PopoverCloseProps,
  PopoverContentProps,
  PopoverProps,
  PopoverTriggerProps,
} from "./types";

function PopoverRoot(props: PopoverProps) {
  const {
    arrow,
    arrowProps,
    children,
    content,
    contentProps,
    trigger,
    triggerProps,
    ...rootProps
  } = props;
  const hasDefaultStructure = trigger != null || content != null || arrow != null;

  if (!hasDefaultStructure) {
    return <TamaguiPopover {...rootProps}>{children}</TamaguiPopover>;
  }

  return (
    <TamaguiPopover {...rootProps}>
      {trigger != null ? <PopoverTrigger {...triggerProps}>{trigger}</PopoverTrigger> : null}
      <PopoverContent {...contentProps}>
        {arrow ? <PopoverArrow {...arrowProps} /> : null}
        {content ?? children}
      </PopoverContent>
    </TamaguiPopover>
  );
}

function PopoverAnchor(props: PopoverAnchorProps) {
  return <TamaguiPopover.Anchor {...props} />;
}

function PopoverArrow(props: PopoverArrowProps) {
  return <TamaguiPopover.Arrow {...props} />;
}

function PopoverTrigger(props: PopoverTriggerProps) {
  return <TamaguiPopover.Trigger {...props} />;
}

function PopoverContent(props: PopoverContentProps) {
  return <TamaguiPopover.Content {...props} />;
}

function PopoverClose(props: PopoverCloseProps) {
  return <TamaguiPopover.Close {...props} />;
}

export const Popover = Object.assign(PopoverRoot, {
  Anchor: PopoverAnchor,
  Arrow: PopoverArrow,
  Trigger: PopoverTrigger,
  Content: PopoverContent,
  Close: PopoverClose,
});
