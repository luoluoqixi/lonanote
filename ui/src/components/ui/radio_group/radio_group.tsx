import { useId, useState } from "react";
import { Label as TamaguiLabel, RadioGroup as TamaguiRadioGroup, XStack, YStack } from "tamagui";

import { os } from "@/api/common/platform";
import { resolveAriaLabel, triggerNativeHaptics } from "@/components/ui/utils";

import type { RadioGroupIndicatorProps, RadioGroupItemProps, RadioGroupProps } from "./types";

function RadioGroupRoot(props: RadioGroupProps) {
  const generatedGroupId = useId();
  const {
    children,
    defaultValue,
    indicatorProps,
    itemProps,
    items,
    labelProps,
    nativeHaptics,
    onValueChange,
    value: valueProp,
    ...rootProps
  } = props;
  const { htmlFor: _labelHtmlFor, ...resolvedLabelProps } = labelProps ?? {};
  const groupId = rootProps.id ?? generatedGroupId;
  const shouldHandleLabelPress = os() === "ios";
  const [uncontrolledValue, setUncontrolledValue] = useState(defaultValue ?? "");
  const value = valueProp ?? uncontrolledValue;

  const handleValueChange = (nextValue: string) => {
    if (valueProp === undefined) {
      setUncontrolledValue(nextValue);
    }

    onValueChange?.(nextValue);
    triggerNativeHaptics(nativeHaptics);
  };

  return (
    <TamaguiRadioGroup {...rootProps} onValueChange={handleValueChange} value={value}>
      {children ??
        (items == null ? null : (
          <YStack gap="$2">
            {items.map((item, index) => {
              const itemId = item.id ?? itemProps?.id ?? `${groupId}-item-${index}`;
              const isDisabled = item.disabled ?? itemProps?.disabled ?? rootProps.disabled;

              const labelElement = shouldHandleLabelPress ? (
                <XStack
                  onPress={(event) => {
                    labelProps?.onPress?.(event);

                    if (isDisabled || event.defaultPrevented) {
                      return;
                    }

                    handleValueChange(item.value);
                  }}
                >
                  <TamaguiLabel {...resolvedLabelProps} pointerEvents="none">
                    {item.label}
                  </TamaguiLabel>
                </XStack>
              ) : (
                <TamaguiLabel {...resolvedLabelProps} htmlFor={itemId}>
                  {item.label}
                </TamaguiLabel>
              );

              return (
                <XStack gap="$2" key={item.value} style={{ alignItems: "center" }}>
                  <RadioGroupItem
                    {...itemProps}
                    aria-label={resolveAriaLabel(
                      item["aria-label"] ?? itemProps?.["aria-label"],
                      item.label,
                    )}
                    disabled={isDisabled}
                    id={itemId}
                    value={item.value}
                  >
                    <RadioGroupIndicator {...indicatorProps} />
                  </RadioGroupItem>
                  {labelElement}
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
