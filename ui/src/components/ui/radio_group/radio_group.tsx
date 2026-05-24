import { useId } from "react";
import { Label as TamaguiLabel, RadioGroup as TamaguiRadioGroup, XStack, YStack } from "tamagui";

import { resolveAriaLabel } from "@/components/ui/utils";

import type { RadioGroupIndicatorProps, RadioGroupItemProps, RadioGroupProps } from "./types";

function RadioGroupRoot(props: RadioGroupProps) {
  const generatedGroupId = useId();
  const { children, indicatorProps, itemProps, items, labelProps, ...rootProps } = props;
  const { htmlFor: _labelHtmlFor, ...resolvedLabelProps } = labelProps ?? {};
  const groupId = rootProps.id ?? generatedGroupId;

  return (
    <TamaguiRadioGroup {...rootProps}>
      {children ??
        (items == null ? null : (
          <YStack gap="$2">
            {items.map((item, index) => {
              const itemId = item.id ?? itemProps?.id ?? `${groupId}-item-${index}`;

              return (
                <XStack gap="$2" key={item.value} style={{ alignItems: "center" }}>
                  <RadioGroupItem
                    {...itemProps}
                    aria-label={resolveAriaLabel(
                      item["aria-label"] ?? itemProps?.["aria-label"],
                      item.label,
                    )}
                    disabled={item.disabled ?? itemProps?.disabled}
                    id={itemId}
                    value={item.value}
                  >
                    <RadioGroupIndicator {...indicatorProps} />
                  </RadioGroupItem>
                  <TamaguiLabel {...resolvedLabelProps} htmlFor={itemId}>
                    {item.label}
                  </TamaguiLabel>
                </XStack>
              );
            })}
          </YStack>
        ))}
    </TamaguiRadioGroup>
  );
}

function RadioGroupItem(props: RadioGroupItemProps) {
  return <TamaguiRadioGroup.Item {...props} />;
}

function RadioGroupIndicator(props: RadioGroupIndicatorProps) {
  return (
    <TamaguiRadioGroup.Indicator
      {...props}
      unstyled={props.unstyled ?? true}
      width={props.width ?? "33%"}
      height={props.height ?? "33%"}
      borderRadius={props.borderRadius ?? 999}
      backgroundColor={props.backgroundColor ?? "$color"}
    />
  );
}

export const RadioGroup = Object.assign(RadioGroupRoot, {
  Item: RadioGroupItem,
  Indicator: RadioGroupIndicator,
});
