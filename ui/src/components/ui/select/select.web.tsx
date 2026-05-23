import { Select as HeroUISelect, ListBox } from "@heroui/react";
import clsx from "clsx";

import type { SelectProps } from "./types";

export function Select({
  accessibilityLabel,
  className,
  contentClassName,
  isDisabled,
  nativeProps,
  onValueChange,
  options,
  placeholder,
  value,
  webProps,
}: SelectProps) {
  void nativeProps;

  return (
    <HeroUISelect
      aria-label={accessibilityLabel}
      isDisabled={isDisabled}
      onChange={(nextValue) => onValueChange?.(nextValue as string)}
      value={value}
      placeholder={placeholder}
      {...(webProps as any)}
    >
      <HeroUISelect.Trigger className={clsx(className)}>
        <HeroUISelect.Value />
        <HeroUISelect.Indicator />
      </HeroUISelect.Trigger>
      <HeroUISelect.Popover>
        <ListBox className={clsx(contentClassName)}>
          {options.map((option, index) => (
            <ListBox.Item key={index} id={option.value} textValue={option.label}>
              {option.label}
              <ListBox.ItemIndicator />
            </ListBox.Item>
          ))}
        </ListBox>
      </HeroUISelect.Popover>
    </HeroUISelect>
  );
}
