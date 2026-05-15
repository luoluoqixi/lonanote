import * as SelectPrimitive from "@rn-primitives/select";
import clsx from "clsx";
import { Text, View } from "react-native";

import { useWebLayerPortalContainer } from "../provider/web_layer_portal_context";
import type { SelectProps } from "./types";

function SelectScrollUpButton() {
  return (
    <SelectPrimitive.ScrollUpButton className="flex items-center justify-center py-1 web:cursor-default">
      <Text className="text-xs text-foreground/60">^</Text>
    </SelectPrimitive.ScrollUpButton>
  );
}

function SelectScrollDownButton() {
  return (
    <SelectPrimitive.ScrollDownButton className="flex items-center justify-center py-1 web:cursor-default">
      <Text className="text-xs text-foreground/60">v</Text>
    </SelectPrimitive.ScrollDownButton>
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
  const portalContainer = useWebLayerPortalContainer();

  return (
    <SelectPrimitive.Root
      accessibilityLabel={accessibilityLabel}
      className="z-10"
      disabled={isDisabled}
      onValueChange={(nextOption) => {
        if (nextOption) {
          onValueChange?.(nextOption.value as T);
        }
      }}
      value={
        selectedOption ? { label: selectedOption.label, value: selectedOption.value } : undefined
      }
    >
      <SelectPrimitive.Trigger
        className={clsx(
          "flex h-10 flex-row items-center justify-between rounded-xl border border-foreground/10 bg-background px-3 py-2 text-foreground web:outline-none web:focus-visible:ring-2 web:focus-visible:ring-accent/40 web:focus-visible:ring-offset-2 web:focus-visible:ring-offset-background [&>span]:line-clamp-1",
          isDisabled && "opacity-50 web:cursor-not-allowed",
          className,
        )}
      >
        <>
          <View className="min-w-0 flex-1 flex-row items-center gap-2">
            {selectedOption?.startContent}
            <SelectPrimitive.Value
              className={clsx(
                "flex-1 text-sm",
                selectedOption ? "text-foreground" : "text-foreground/55",
              )}
              placeholder={placeholder}
            />
          </View>
          <Text className="ml-2 text-xs text-foreground/60">▾</Text>
        </>
      </SelectPrimitive.Trigger>

      <SelectPrimitive.Portal container={portalContainer ?? undefined}>
        <SelectPrimitive.Overlay className="fixed inset-0 z-60 bg-black/10">
          <SelectPrimitive.Content
            className={clsx(
              "relative z-70 max-h-80 min-w-40 rounded-2xl border border-foreground/10 bg-overlay px-1 py-2 shadow-overlay data-[side=bottom]:translate-y-1 data-[side=left]:-translate-x-1 data-[side=right]:translate-x-1 data-[side=top]:-translate-y-1 web:outline-none",
              contentClassName,
            )}
            position="popper"
            sideOffset={6}
          >
            <SelectScrollUpButton />
            <SelectPrimitive.Viewport
              className="p-1"
              style={{
                minWidth: "var(--radix-select-trigger-width)",
                width: "100%",
              }}
            >
              {options.map((option) => (
                <SelectPrimitive.Item
                  key={option.value}
                  className={clsx(
                    "relative flex w-full flex-row items-center rounded-xl py-2 pl-3 pr-9 web:cursor-default web:select-none web:outline-none web:focus:bg-accent/10 web:hover:bg-accent/10",
                    option.isDisabled && "opacity-50 web:pointer-events-none",
                  )}
                  disabled={option.isDisabled}
                  label={option.label}
                  value={option.value}
                >
                  <View className="min-w-0 flex-1 flex-row items-center gap-2">
                    {option.startContent}
                    <View className="min-w-0 flex-1">
                      <SelectPrimitive.ItemText className="text-sm text-foreground" />
                      {option.description ? (
                        <Text className="text-xs text-foreground/60">{option.description}</Text>
                      ) : null}
                    </View>
                  </View>

                  <View className="absolute right-3 top-0 bottom-0 items-center justify-center">
                    <SelectPrimitive.ItemIndicator>
                      <Text className="text-xs text-accent">✓</Text>
                    </SelectPrimitive.ItemIndicator>
                  </View>
                </SelectPrimitive.Item>
              ))}
            </SelectPrimitive.Viewport>
            <SelectScrollDownButton />
          </SelectPrimitive.Content>
        </SelectPrimitive.Overlay>
      </SelectPrimitive.Portal>
    </SelectPrimitive.Root>
  );
}
