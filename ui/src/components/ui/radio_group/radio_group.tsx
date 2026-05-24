import { Label as TamaguiLabel, RadioGroup as TamaguiRadioGroup, XStack, YStack } from "tamagui";

import type { RadioGroupIndicatorProps, RadioGroupItemProps, RadioGroupProps } from "./types";

function RadioGroupRoot(props: RadioGroupProps) {
  const { children, indicatorProps, itemProps, items, labelProps, ...rootProps } = props;

  return (
    <TamaguiRadioGroup {...rootProps}>
      {children ??
        (items == null ? null : (
          <YStack gap="$2">
            {items.map((item) => (
              <XStack gap="$2" key={item.value} style={{ alignItems: "center" }}>
                <RadioGroupItem
                  {...itemProps}
                  disabled={item.disabled ?? itemProps?.disabled}
                  id={item.id ?? itemProps?.id}
                  value={item.value}
                >
                  <RadioGroupIndicator {...indicatorProps} />
                </RadioGroupItem>
                <TamaguiLabel {...labelProps}>{item.label}</TamaguiLabel>
              </XStack>
            ))}
          </YStack>
        ))}
    </TamaguiRadioGroup>
  );
}

function RadioGroupItem(props: RadioGroupItemProps) {
  return <TamaguiRadioGroup.Item {...props} />;
}

function RadioGroupIndicator(props: RadioGroupIndicatorProps) {
  return <TamaguiRadioGroup.Indicator {...props} />;
}

export const RadioGroup = Object.assign(RadioGroupRoot, {
  Item: RadioGroupItem,
  Indicator: RadioGroupIndicator,
});
