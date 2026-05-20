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
  nativeProps,
  onOpenChange,
  webProps,
}: DropdownProps) {
  void nativeProps;
  return (
    <HeroUIDropdown
      className={className}
      defaultOpen={isDefaultOpen}
      isOpen={isOpen}
      onOpenChange={onOpenChange}
      {...(webProps as any)}
    >
      {children}
    </HeroUIDropdown>
  );
}

export function DropdownTrigger({
  children,
  className,
  isDisabled,
  nativeProps,
  webProps,
}: DropdownTriggerProps) {
  void nativeProps;
  return (
    <HeroUIDropdown.Trigger className={className} isDisabled={isDisabled} {...(webProps as any)}>
      {children}
    </HeroUIDropdown.Trigger>
  );
}

export function DropdownPopover({
  children,
  className,
  nativeProps,
  webProps,
}: DropdownPopoverProps) {
  void nativeProps;
  return (
    <HeroUIDropdown.Popover className={className} {...(webProps as any)}>
      {children}
    </HeroUIDropdown.Popover>
  );
}

export function DropdownMenu({ children, className, nativeProps, webProps }: DropdownMenuProps) {
  void nativeProps;
  return (
    <HeroUIDropdown.Menu className={className} {...(webProps as any)}>
      {children}
    </HeroUIDropdown.Menu>
  );
}

export function DropdownSection({
  children,
  className,
  nativeProps,
  webProps,
}: DropdownSectionProps) {
  void nativeProps;
  return (
    <HeroUIDropdown.Section className={className} {...(webProps as any)}>
      {children}
    </HeroUIDropdown.Section>
  );
}

export function DropdownItem({
  children,
  className,
  isDisabled,
  nativeProps,
  webProps,
}: DropdownItemProps) {
  void nativeProps;
  return (
    <HeroUIDropdown.Item className={className} isDisabled={isDisabled} {...(webProps as any)}>
      {children}
    </HeroUIDropdown.Item>
  );
}

export function DropdownItemIndicator({
  className,
  nativeProps,
  webProps,
}: DropdownItemIndicatorProps) {
  void nativeProps;
  return <HeroUIDropdown.ItemIndicator className={className} {...(webProps as any)} />;
}
