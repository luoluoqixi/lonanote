import { Slider as HeroUISlider } from "@heroui/react";

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
      aria-label={accessibilityLabel}
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
