import {
  Tooltip as TamaguiTooltip,
  TooltipGroup as TamaguiTooltipGroup,
  Text,
  closeOpenTooltips,
} from "tamagui";

import type {
  TooltipAnchorProps,
  TooltipArrowProps,
  TooltipContentProps,
  TooltipGroupProps,
  TooltipProps,
  TooltipRootProps,
  TooltipTriggerProps,
} from "./types";

const DEFAULT_TOOLTIP_ENTER_STYLE = { opacity: 0, scale: 0.96, y: -4 };
const DEFAULT_TOOLTIP_EXIT_STYLE = { opacity: 0, scale: 0.98, y: -2 };

function TooltipSimple(props: TooltipProps) {
  const {
    anchor,
    anchorProps,
    arrow,
    arrowProps,
    children,
    content,
    contentProps,
    triggerProps,
    ...rootProps
  } = props;

  return (
    <TooltipRoot {...rootProps}>
      {anchor != null ? <TooltipAnchor {...anchorProps}>{anchor}</TooltipAnchor> : null}
      <TooltipTrigger {...triggerProps}>{children}</TooltipTrigger>
      <TooltipContent {...contentProps}>
        {arrow ? <TooltipArrow {...arrowProps} /> : null}
        {typeof content === "string" ? <Text>{content}</Text> : content}
      </TooltipContent>
    </TooltipRoot>
  );
}

function TooltipRootBase(props: TooltipRootProps) {
  return <TamaguiTooltip {...props} />;
}

function TooltipAnchor(props: TooltipAnchorProps) {
  return <TamaguiTooltip.Anchor {...props} />;
}

function TooltipArrow(props: TooltipArrowProps) {
  return (
    <TamaguiTooltip.Arrow
      {...props}
      background={props.background ?? "$background"}
      borderColor={props.borderColor ?? "$borderColor"}
    />
  );
}

function TooltipTrigger(props: TooltipTriggerProps) {
  return <TamaguiTooltip.Trigger asChild={props.asChild ?? true} {...props} />;
}

function TooltipContent(props: TooltipContentProps) {
  const {
    background,
    borderColor,
    borderWidth,
    boxShadow,
    enterStyle,
    exitStyle,
    size,
    transition,
    ...contentProps
  } = props;

  return (
    <TamaguiTooltip.Content
      {...contentProps}
      background={background ?? "$background"}
      borderColor={borderColor ?? "$borderColor"}
      borderWidth={borderWidth ?? 1}
      boxShadow={boxShadow ?? "0 8px 24px $shadowColor"}
      enterStyle={enterStyle ?? DEFAULT_TOOLTIP_ENTER_STYLE}
      exitStyle={exitStyle ?? DEFAULT_TOOLTIP_EXIT_STYLE}
      size={size ?? "$3"}
      transition={transition ?? "100ms"}
    />
  );
}

function TooltipGroup(props: TooltipGroupProps) {
  return <TamaguiTooltipGroup {...props} />;
}

const TooltipRoot = Object.assign(TooltipRootBase, {
  Anchor: TooltipAnchor,
  Arrow: TooltipArrow,
  Trigger: TooltipTrigger,
  Content: TooltipContent,
  Group: TooltipGroup,
});

export const Tooltip = Object.assign(TooltipSimple, {
  Root: TooltipRoot,
});

export { closeOpenTooltips, TooltipGroup, TooltipRoot };
