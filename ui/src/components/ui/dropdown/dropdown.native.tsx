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
  nativeProps,
  onAction,
  onOpenChange,
  trigger,
  triggerClassName,
  webProps,
}: DropdownProps) {
  void webProps;

  const content = children ?? (
    <>
      <DropdownTrigger className={triggerClassName} isDisabled={isDisabled}>
        {trigger}
      </DropdownTrigger>
      <DropdownPopover>
        <DropdownMenu
          accessibilityLabel={accessibilityLabel}
          className={contentClassName}
          onAction={onAction}
        >
          {(items ?? []).map((item) => (
            <DropdownItem
              key={item.key}
              className={clsx(itemClassName, item.className)}
              isDisabled={item.isDisabled}
              nativeProps={item.nativeProps}
              webProps={item.webProps}
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
      {...(nativeProps as any)}
    >
      {content}
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

export function DropdownMenu({
  accessibilityLabel,
  children,
  className,
  nativeProps,
  onAction,
  webProps,
}: DropdownMenuProps) {
  void webProps;
  return (
    <HeroUIMenu.Content
      accessibilityLabel={accessibilityLabel}
      className={className}
      onAction={(key: string | number) => onAction?.(String(key))}
      presentation="popover"
      {...(nativeProps as any)}
    >
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
  textValue,
  webProps,
}: DropdownItemProps) {
  void textValue;
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
