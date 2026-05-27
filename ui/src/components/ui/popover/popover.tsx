import { usePopoverContext } from "@tamagui/popover";
import { useEffect } from "react";
import { BackHandler } from "react-native";
import { Popover as TamaguiPopover } from "tamagui";

import { os } from "@/api/common/platform";

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

type PopoverBackPressBehaviorProps = {
  dismissOnBackPress?: boolean;
  scope?: string;
};

function PopoverRoot(props: PopoverProps) {
  const scope = (props as { scope?: string }).scope;
  const {
    arrow,
    arrowProps,
    children,
    content,
    contentProps,
    dismissOnBackPress = true,
    trigger,
    triggerProps,
    ...rootProps
  } = props;
  const hasDefaultStructure = trigger != null || content != null || arrow != null;

  if (!hasDefaultStructure) {
    return (
      <TamaguiPopover {...rootProps}>
        <PopoverBackHandler dismissOnBackPress={dismissOnBackPress} scope={scope} />
        {children}
      </TamaguiPopover>
    );
  }

  return (
    <TamaguiPopover {...rootProps}>
      <PopoverBackHandler dismissOnBackPress={dismissOnBackPress} scope={scope} />
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

function PopoverBackHandler(props: PopoverBackPressBehaviorProps) {
  const { dismissOnBackPress = true, scope } = props;
  const context = usePopoverContext(scope);
  const { open, onOpenChange } = context;

  useEffect(() => {
    if (os() !== "android" || !dismissOnBackPress || !open) {
      return;
    }

    const subscription = BackHandler.addEventListener("hardwareBackPress", () => {
      onOpenChange(false, "press");
      return true;
    });

    return () => {
      subscription.remove();
    };
  }, [dismissOnBackPress, onOpenChange, open]);

  return null;
}

export const Popover = Object.assign(PopoverRoot, {
  Anchor: PopoverAnchor,
  Arrow: PopoverArrow,
  Trigger: PopoverTrigger,
  Content: PopoverContent,
  Close: PopoverClose,
});
