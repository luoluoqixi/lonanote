import clsx from "clsx";
import { Select as HeroUINativeSelect } from "heroui-native";

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
  const selectedOption = value ? options.find((option) => option.value === value) : undefined;

  void webProps;

  return (
    <HeroUINativeSelect
      accessibilityLabel={accessibilityLabel}
      isDisabled={isDisabled}
      onValueChange={(nextOption) => {
        if (nextOption) {
          onValueChange?.(nextOption.value);
        }
      }}
      value={
        selectedOption ? { label: selectedOption.label, value: selectedOption.value } : undefined
      }
      {...(nativeProps as any)}
    >
      <HeroUINativeSelect.Trigger className={clsx(className)}>
        <HeroUINativeSelect.Value placeholder={placeholder} />
        <HeroUINativeSelect.TriggerIndicator />
      </HeroUINativeSelect.Trigger>

      <HeroUINativeSelect.Portal>
        <HeroUINativeSelect.Overlay />
        <HeroUINativeSelect.Content className={clsx(contentClassName)} presentation="popover">
          {options.map((option) => (
            <HeroUINativeSelect.Item
              key={option.value}
              disabled={option.isDisabled}
              label={option.label}
              value={option.value}
            />
          ))}
        </HeroUINativeSelect.Content>
      </HeroUINativeSelect.Portal>
    </HeroUINativeSelect>
  );
}
