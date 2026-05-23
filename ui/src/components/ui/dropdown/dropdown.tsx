import clsx from "clsx";
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
  accessibilityLabel,
  children,
  className,
  contentClassName,
  isDefaultOpen,
  isDisabled,
  isOpen,
  itemClassName,
  items,
  onAction,
  onOpenChange,
  trigger,
  triggerClassName,
}: DropdownProps) {
  const content = children ?? (
    <>
      <DropdownTrigger className={triggerClassName} isDisabled={isDisabled}>
        {trigger}
      </DropdownTrigger>
      <DropdownPopover>
        <DropdownMenu accessibilityLabel={accessibilityLabel} className={contentClassName}>
          {(items ?? []).map((item) => (
            <DropdownItem
              className={clsx(itemClassName, item.className)}
              isDisabled={item.isDisabled}
              key={item.key}
              onPress={onAction ? () => onAction(item.key) : undefined}
            >
              {item.label}
            </DropdownItem>
          ))}
        </DropdownMenu>
      </DropdownPopover>
    </>
  );

  return (
    <HeroUIMenu
      className={className}
      isDefaultOpen={isDefaultOpen}
      isOpen={isOpen}
      onOpenChange={onOpenChange}
    >
      {content}
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

export function DropdownPopover({ children, className }: DropdownPopoverProps) {
  void className;

  return (
    <HeroUIMenu.Portal>
      <HeroUIMenu.Overlay />
      {children}
    </HeroUIMenu.Portal>
  );
}

export function DropdownMenu({ accessibilityLabel, children, className }: DropdownMenuProps) {
  return (
    <HeroUIMenu.Content
      accessibilityLabel={accessibilityLabel}
      className={className}
      presentation="popover"
    >
      {children}
    </HeroUIMenu.Content>
  );
}

export function DropdownSection({ children, className }: DropdownSectionProps) {
  return <HeroUIMenu.Group className={className}>{children}</HeroUIMenu.Group>;
}

export function DropdownItem({ children, className, isDisabled, onPress }: DropdownItemProps) {
  return (
    <HeroUIMenu.Item className={className} isDisabled={isDisabled} onPress={onPress}>
      {children}
    </HeroUIMenu.Item>
  );
}

export function DropdownItemIndicator({ className }: DropdownItemIndicatorProps) {
  return <HeroUIMenu.ItemIndicator className={className} />;
}
