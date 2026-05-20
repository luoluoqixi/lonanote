import { Slider as WebSlider } from "@heroui/react";
import { Slider as NativeSlider } from "heroui-native";
import type { ComponentProps } from "react";

export type SliderOrientation = "horizontal" | "vertical";
export type SliderValue = number | number[];

type SliderPlatformProps = {
  nativeProps?: Omit<
    ComponentProps<typeof NativeSlider>,
    | "accessibilityLabel"
    | "className"
    | "defaultValue"
    | "isDisabled"
    | "maxValue"
    | "minValue"
    | "onChange"
    | "onChangeEnd"
    | "orientation"
    | "step"
    | "value"
  >;
  webProps?: Omit<
    ComponentProps<typeof WebSlider>,
    | "aria-label"
    | "className"
    | "defaultValue"
    | "isDisabled"
    | "maxValue"
    | "minValue"
    | "onChange"
    | "onChangeEnd"
    | "orientation"
    | "step"
    | "value"
  >;
};

export interface SliderProps extends SliderPlatformProps {
  accessibilityLabel?: string;
  className?: string;
  defaultValue?: SliderValue;
  isDisabled?: boolean;
  maxValue?: number;
  minValue?: number;
  onValueChange?: (nextValue: SliderValue) => void;
  onValueChangeEnd?: (nextValue: SliderValue) => void;
  orientation?: SliderOrientation;
  step?: number;
  value?: SliderValue;
}
