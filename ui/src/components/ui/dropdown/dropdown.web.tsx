import { Dropdown as HeroUIDropdown } from "@heroui/react";

import type {
  DropdownItemIndicatorProps,
  DropdownItemProps,
  DropdownMenuProps,
  DropdownPopoverProps,
  DropdownProps,
  DropdownSectionProps,
  DropdownTriggerProps,
} from "./types";

export function Dropdown({
  children,
  className,
  isDefaultOpen,
  isOpen,
  onOpenChange,
}: DropdownProps) {
  return (
    <HeroUIDropdown
      className={className}
      defaultOpen={isDefaultOpen}
      isOpen={isOpen}
      onOpenChange={onOpenChange}
    >
      {children}
    </HeroUIDropdown>
  );
}

export function DropdownTrigger({ children, className, isDisabled }: DropdownTriggerProps) {
  return (
    <HeroUIDropdown.Trigger className={className} isDisabled={isDisabled}>
      {children}
    </HeroUIDropdown.Trigger>
  );
}

export function DropdownPopover({ children, className }: DropdownPopoverProps) {
  return <HeroUIDropdown.Popover className={className}>{children}</HeroUIDropdown.Popover>;
}

export function DropdownMenu({ children, className }: DropdownMenuProps) {
  return <HeroUIDropdown.Menu className={className}>{children}</HeroUIDropdown.Menu>;
}

export function DropdownSection({ children, className }: DropdownSectionProps) {
  return <HeroUIDropdown.Section className={className}>{children}</HeroUIDropdown.Section>;
}

export function DropdownItem({ children, className, isDisabled }: DropdownItemProps) {
  return (
    <HeroUIDropdown.Item className={className} isDisabled={isDisabled}>
      {children}
    </HeroUIDropdown.Item>
  );
}

export function DropdownItemIndicator(props: DropdownItemIndicatorProps) {
  return <HeroUIDropdown.ItemIndicator {...props} />;
}
