import { Slider as HeroUISlider } from "heroui-native";

import type { SliderProps } from "./types";

export function Slider({
  accessibilityLabel,
  className,
  defaultValue,
  isDisabled,
  maxValue,
  minValue,
  onValueChange,
  onValueChangeEnd,
  orientation,
  step,
  value,
}: SliderProps) {
  return (
    <HeroUISlider
      accessibilityLabel={accessibilityLabel}
      className={className}
      defaultValue={defaultValue}
      isDisabled={isDisabled}
      maxValue={maxValue}
      minValue={minValue}
      onChange={onValueChange}
      onChangeEnd={onValueChangeEnd}
      orientation={orientation}
      step={step}
      value={value}
    />
  );
}
