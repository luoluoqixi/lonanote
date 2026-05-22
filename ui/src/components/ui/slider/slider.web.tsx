import { Slider as HeroUISlider } from "@heroui/react";

import type { SliderProps } from "./types";

function getThumbCount(value?: SliderProps["value"], defaultValue?: SliderProps["defaultValue"]) {
  if (Array.isArray(value)) {
    return value.length;
  }

  if (Array.isArray(defaultValue)) {
    return defaultValue.length;
  }

  return 1;
}

export function Slider({
  accessibilityLabel,
  children,
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

  const thumbCount = getThumbCount(value, defaultValue);

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
    >
      {children ?? (
        <HeroUISlider.Track>
          <HeroUISlider.Fill />
          {Array.from({ length: thumbCount }, (_, index) => (
            <HeroUISlider.Thumb key={index} />
          ))}
        </HeroUISlider.Track>
      )}
    </HeroUISlider>
  );
}
