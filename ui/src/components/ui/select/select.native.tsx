import clsx from "clsx";
import { Select as HeroUINativeSelect } from "heroui-native";
import { Text, View } from "react-native";

import type { SelectOption, SelectProps } from "./types";

function renderItemContent<T extends string>(option: SelectOption<T>) {
  return (
    <View className="flex-row items-center gap-2">
      {option.startContent}
      <View className="min-w-0 flex-1">
        <HeroUINativeSelect.ItemLabel />
        {option.description ? (
          <Text className="text-xs text-foreground/60">{option.description}</Text>
        ) : null}
      </View>
    </View>
  );
}

export function Select<T extends string>({
  accessibilityLabel,
  className,
  contentClassName,
  isDisabled,
  onValueChange,
  options,
  placeholder,
  value,
}: SelectProps<T>) {
  const selectedOption = value ? options.find((option) => option.value === value) : undefined;

  return (
    <HeroUINativeSelect
      accessibilityLabel={accessibilityLabel}
      isDisabled={isDisabled}
      onValueChange={(nextOption) => {
        if (nextOption) {
          onValueChange?.(nextOption.value as T);
        }
      }}
      value={
        selectedOption ? { label: selectedOption.label, value: selectedOption.value } : undefined
      }
    >
      <HeroUINativeSelect.Trigger
        className={clsx(
          "min-h-10 w-full rounded-xl border border-foreground/10 bg-background px-3 py-2",
          className,
        )}
      >
        <View className="min-w-0 flex-1 flex-row items-center gap-2">
          {selectedOption?.startContent}
          <HeroUINativeSelect.Value
            className="flex-1 text-sm text-foreground"
            placeholder={placeholder}
          />
        </View>
        <HeroUINativeSelect.TriggerIndicator />
      </HeroUINativeSelect.Trigger>

      <HeroUINativeSelect.Portal>
        <HeroUINativeSelect.Overlay className="bg-black/10" />
        <HeroUINativeSelect.Content
          className={clsx("rounded-2xl border border-foreground/10 bg-overlay", contentClassName)}
          presentation="dialog"
        >
          {options.map((option) => (
            <HeroUINativeSelect.Item
              key={option.value}
              disabled={option.isDisabled}
              label={option.label}
              value={option.value}
            >
              {renderItemContent(option)}
              <HeroUINativeSelect.ItemIndicator />
            </HeroUINativeSelect.Item>
          ))}
        </HeroUINativeSelect.Content>
      </HeroUINativeSelect.Portal>
    </HeroUINativeSelect>
  );
}
