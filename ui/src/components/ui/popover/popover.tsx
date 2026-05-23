import { Popover as HeroUIPopover } from "heroui-native";

import type {
  PopoverArrowProps,
  PopoverContentProps,
  PopoverProps,
  PopoverTitleProps,
  PopoverTriggerProps,
} from "./types";

function PopoverRoot({ children, isDefaultOpen, isOpen, onOpenChange }: PopoverProps) {
  return (
    <HeroUIPopover isDefaultOpen={isDefaultOpen} isOpen={isOpen} onOpenChange={onOpenChange}>
      {children}
    </HeroUIPopover>
  );
}

function PopoverTrigger({ children, className }: PopoverTriggerProps) {
  return <HeroUIPopover.Trigger className={className}>{children}</HeroUIPopover.Trigger>;
}

function PopoverContent({ accessibilityLabel, children, className }: PopoverContentProps) {
  return (
    <HeroUIPopover.Portal>
      <HeroUIPopover.Overlay />
      <HeroUIPopover.Content
        accessibilityLabel={accessibilityLabel}
        className={className}
        presentation="popover"
      >
        {children}
      </HeroUIPopover.Content>
    </HeroUIPopover.Portal>
  );
}

function PopoverArrow({ children, className }: PopoverArrowProps) {
  return <HeroUIPopover.Arrow className={className}>{children}</HeroUIPopover.Arrow>;
}

function PopoverTitle({ children, className }: PopoverTitleProps) {
  return <HeroUIPopover.Title className={className}>{children}</HeroUIPopover.Title>;
}

export const Popover = Object.assign(PopoverRoot, {
  Root: PopoverRoot,
  Trigger: PopoverTrigger,
  Content: PopoverContent,
  Arrow: PopoverArrow,
  Title: PopoverTitle,
});
