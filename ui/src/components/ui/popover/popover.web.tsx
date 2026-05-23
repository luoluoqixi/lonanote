import { Popover as HeroUIPopover } from "@heroui/react";

import type {
  PopoverArrowProps,
  PopoverContentProps,
  PopoverProps,
  PopoverTitleProps,
  PopoverTriggerProps,
} from "./types";

function PopoverRoot({ children, nativeProps, webProps }: PopoverProps) {
  void nativeProps;
  return <HeroUIPopover {...(webProps as any)}>{children}</HeroUIPopover>;
}

function PopoverTrigger({ children, className, nativeProps, webProps }: PopoverTriggerProps) {
  void nativeProps;
  return (
    <HeroUIPopover.Trigger className={className} {...(webProps as any)}>
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
  void nativeProps;
  return (
    <HeroUIPopover.Content className={className} {...(webProps as any)}>
      <HeroUIPopover.Dialog aria-label={accessibilityLabel}>{children}</HeroUIPopover.Dialog>
    </HeroUIPopover.Content>
  );
}

function PopoverArrow({ children, className, nativeProps, webProps }: PopoverArrowProps) {
  void nativeProps;
  return (
    <HeroUIPopover.Arrow className={className} {...(webProps as any)}>
      {children}
    </HeroUIPopover.Arrow>
  );
}

function PopoverTitle({ children, className, nativeProps, webProps }: PopoverTitleProps) {
  void nativeProps;
  return (
    <HeroUIPopover.Heading className={className} {...(webProps as any)}>
      {children}
    </HeroUIPopover.Heading>
  );
}

export const Popover = Object.assign(PopoverRoot, {
  Root: PopoverRoot,
  Trigger: PopoverTrigger,
  Content: PopoverContent,
  Arrow: PopoverArrow,
  Title: PopoverTitle,
});
