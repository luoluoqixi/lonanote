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
  onOpenChange,
}: DropdownProps) {
  return (
    <HeroUIMenu
      className={className}
      isDefaultOpen={isDefaultOpen}
      isOpen={isOpen}
      onOpenChange={onOpenChange}
    >
      {children}
    </HeroUIMenu>
  );
}

export function DropdownTrigger({ children, className, isDisabled }: DropdownTriggerProps) {
  return (
    <HeroUIMenu.Trigger className={className} isDisabled={isDisabled}>
      {children}
    </HeroUIMenu.Trigger>
  );
}

export function DropdownPopover({ children }: DropdownPopoverProps) {
  return (
    <HeroUIMenu.Portal>
      <HeroUIMenu.Overlay />
      {children}
    </HeroUIMenu.Portal>
  );
}

export function DropdownMenu({ children, className }: DropdownMenuProps) {
  return (
    <HeroUIMenu.Content className={className} presentation="popover">
      {children}
    </HeroUIMenu.Content>
  );
}

export function DropdownSection({ children, className }: DropdownSectionProps) {
  return <HeroUIMenu.Group className={className}>{children}</HeroUIMenu.Group>;
}

export function DropdownItem({ children, className, isDisabled }: DropdownItemProps) {
  return (
    <HeroUIMenu.Item className={className} isDisabled={isDisabled}>
      {children}
    </HeroUIMenu.Item>
  );
}

export function DropdownItemIndicator(props: DropdownItemIndicatorProps) {
  return <HeroUIMenu.ItemIndicator {...props} />;
}
