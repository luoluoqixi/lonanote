import { Slider as HeroUISlider } from "@heroui/react";

import type { SliderProps } from "./types";

export function Slider({
  accessibilityLabel,
  className,
  defaultValue,
  isDisabled,
  maxValue,
  minValue,
  nativeProps,
  onValueChange,
  onValueChangeEnd,
  orientation,
  step,
  value,
  webProps,
}: SliderProps) {
  void nativeProps;

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
      {...(webProps as any)}
    />
  );
}
