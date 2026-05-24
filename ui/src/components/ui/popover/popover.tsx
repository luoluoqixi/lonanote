import { Popover as TamaguiPopover } from "tamagui";

import type {
  PopoverAnchorProps,
  PopoverArrowProps,
  PopoverCloseProps,
  PopoverContentProps,
  PopoverProps,
  PopoverTriggerProps,
} from "./types";

const DEFAULT_POPOVER_ENTER_STYLE = { opacity: 0, scale: 0.96, y: -8 };
const DEFAULT_POPOVER_EXIT_STYLE = { opacity: 0, scale: 0.96, y: -8 };

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
  return (
    <TamaguiPopover.Arrow
      {...props}
      background={props.background ?? "$background"}
      borderColor={props.borderColor ?? "$borderColor"}
    />
  );
}

function PopoverTrigger(props: PopoverTriggerProps) {
  return <TamaguiPopover.Trigger {...props} />;
}

function PopoverContent(props: PopoverContentProps) {
  const {
    background,
    borderColor,
    borderWidth,
    boxShadow,
    enterStyle,
    exitStyle,
    size,
    style,
    transition,
    ...contentProps
  } = props;

  return (
    <TamaguiPopover.Content
      {...contentProps}
      background={background ?? "$background"}
      borderColor={borderColor ?? "$borderColor"}
      borderWidth={borderWidth ?? 1}
      boxShadow={boxShadow ?? "0 8px 24px $shadowColor"}
      enterStyle={enterStyle ?? DEFAULT_POPOVER_ENTER_STYLE}
      exitStyle={exitStyle ?? DEFAULT_POPOVER_EXIT_STYLE}
      size={size ?? "$4"}
      style={style}
      transition={transition ?? "100ms"}
    />
  );
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
