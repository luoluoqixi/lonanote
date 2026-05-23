import { Dropdown as HeroUIDropdown } from "@heroui/react";
import clsx from "clsx";

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
  void nativeProps;

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
              textValue={
                item.textValue ??
                (typeof item.label === "string" || typeof item.label === "number"
                  ? String(item.label)
                  : undefined)
              }
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
    <HeroUIDropdown
      className={className}
      defaultOpen={isDefaultOpen}
      isOpen={isOpen}
      onOpenChange={onOpenChange}
      {...(webProps as any)}
    >
      {content}
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

export function DropdownMenu({
  accessibilityLabel,
  children,
  className,
  nativeProps,
  onAction,
  webProps,
}: DropdownMenuProps) {
  void nativeProps;
  return (
    <HeroUIDropdown.Menu
      aria-label={accessibilityLabel}
      className={className}
      onAction={(key: string | number) => onAction?.(String(key))}
      {...(webProps as any)}
    >
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
  textValue,
  webProps,
}: DropdownItemProps) {
  void nativeProps;
  return (
    <HeroUIDropdown.Item
      className={className}
      isDisabled={isDisabled}
      textValue={textValue}
      {...(webProps as any)}
    >
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
