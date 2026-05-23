import { Popover as HeroUIPopover } from "heroui-native";

import type {
  PopoverArrowProps,
  PopoverContentProps,
  PopoverProps,
  PopoverTitleProps,
  PopoverTriggerProps,
} from "./types";

function PopoverRoot({ children, nativeProps, webProps }: PopoverProps) {
  void webProps;
  return <HeroUIPopover {...(nativeProps as any)}>{children}</HeroUIPopover>;
}

function PopoverTrigger({ children, className, nativeProps, webProps }: PopoverTriggerProps) {
  void webProps;
  return (
    <HeroUIPopover.Trigger className={className} {...(nativeProps as any)}>
      {children}
    </HeroUIPopover.Trigger>
  );
}

function PopoverContent({
  accessibilityLabel,
  children,
  className,
  nativeProps,
  webProps,
}: PopoverContentProps) {
  void webProps;
  return (
    <HeroUIPopover.Portal>
      <HeroUIPopover.Overlay />
      <HeroUIPopover.Content
        accessibilityLabel={accessibilityLabel}
        className={className}
        presentation="popover"
        {...(nativeProps as any)}
      >
        {children}
      </HeroUIPopover.Content>
    </HeroUIPopover.Portal>
  );
}

function PopoverArrow({ children, className, nativeProps, webProps }: PopoverArrowProps) {
  void webProps;
  return (
    <HeroUIPopover.Arrow className={className} {...(nativeProps as any)}>
      {children}
    </HeroUIPopover.Arrow>
  );
}

function PopoverTitle({ children, className, nativeProps, webProps }: PopoverTitleProps) {
  void webProps;
  return (
    <HeroUIPopover.Title className={className} {...(nativeProps as any)}>
      {children}
    </HeroUIPopover.Title>
  );
}

export const Popover = Object.assign(PopoverRoot, {
  Root: PopoverRoot,
  Trigger: PopoverTrigger,
  Content: PopoverContent,
  Arrow: PopoverArrow,
  Title: PopoverTitle,
});
