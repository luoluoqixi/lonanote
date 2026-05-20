import { Menu as HeroUIMenu } from "heroui-native";

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
  void webProps;
  return (
    <HeroUIMenu
      className={className}
      isDefaultOpen={isDefaultOpen}
      isOpen={isOpen}
      onOpenChange={onOpenChange}
      {...(nativeProps as any)}
    >
      {children}
    </HeroUIMenu>
  );
}

export function DropdownTrigger({
  children,
  className,
  isDisabled,
  nativeProps,
  webProps,
}: DropdownTriggerProps) {
  void webProps;
  return (
    <HeroUIMenu.Trigger className={className} isDisabled={isDisabled} {...(nativeProps as any)}>
      {children}
    </HeroUIMenu.Trigger>
  );
}

export function DropdownPopover({
  children,
  className,
  nativeProps,
  webProps,
}: DropdownPopoverProps) {
  void className;
  void webProps;
  return (
    <HeroUIMenu.Portal {...(nativeProps as any)}>
      <HeroUIMenu.Overlay />
      {children}
    </HeroUIMenu.Portal>
  );
}

export function DropdownMenu({ children, className, nativeProps, webProps }: DropdownMenuProps) {
  void webProps;
  return (
    <HeroUIMenu.Content className={className} presentation="popover" {...(nativeProps as any)}>
      {children}
    </HeroUIMenu.Content>
  );
}

export function DropdownSection({
  children,
  className,
  nativeProps,
  webProps,
}: DropdownSectionProps) {
  void webProps;
  return (
    <HeroUIMenu.Group className={className} {...(nativeProps as any)}>
      {children}
    </HeroUIMenu.Group>
  );
}

export function DropdownItem({
  children,
  className,
  isDisabled,
  nativeProps,
  webProps,
}: DropdownItemProps) {
  void webProps;
  return (
    <HeroUIMenu.Item className={className} isDisabled={isDisabled} {...(nativeProps as any)}>
      {children}
    </HeroUIMenu.Item>
  );
}

export function DropdownItemIndicator({
  className,
  nativeProps,
  webProps,
}: DropdownItemIndicatorProps) {
  void webProps;
  return <HeroUIMenu.ItemIndicator className={className} {...(nativeProps as any)} />;
}
