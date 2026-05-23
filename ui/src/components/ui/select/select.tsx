import clsx from "clsx";
import { Select as HeroUISelect } from "heroui-native";

import type { SelectProps } from "./types";

export function Select({
  accessibilityLabel,
  className,
  contentClassName,
  isDisabled,
  onValueChange,
  options,
  placeholder,
  value,
}: SelectProps) {
  const selectedOption = value ? options.find((option) => option.value === value) : undefined;

  return (
    <HeroUISelect
      accessibilityLabel={accessibilityLabel}
      isDisabled={isDisabled}
      onValueChange={(nextOption) => {
        if (Array.isArray(nextOption)) {
          onValueChange?.(nextOption[0]?.value ?? null);
          return;
        }

        onValueChange?.(nextOption?.value ?? null);
      }}
      value={
        selectedOption ? { label: selectedOption.label, value: selectedOption.value } : undefined
      }
    >
      <HeroUISelect.Trigger className={clsx(className)}>
        <HeroUISelect.Value placeholder={placeholder} />
        <HeroUISelect.TriggerIndicator />
      </HeroUISelect.Trigger>

      <HeroUISelect.Portal>
        <HeroUISelect.Overlay />
        <HeroUISelect.Content className={clsx(contentClassName)} presentation="popover">
          {options.map((option) => (
            <HeroUISelect.Item
              disabled={option.isDisabled}
              key={option.value}
              label={option.label}
              value={option.value}
            >
              {option.startContent}
              <HeroUISelect.ItemLabel />
              {option.description ? (
                <HeroUISelect.ItemDescription>{option.description}</HeroUISelect.ItemDescription>
              ) : null}
              <HeroUISelect.ItemIndicator />
            </HeroUISelect.Item>
          ))}
        </HeroUISelect.Content>
      </HeroUISelect.Portal>
    </HeroUISelect>
  );
}
