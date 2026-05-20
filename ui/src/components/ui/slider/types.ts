export type SliderOrientation = "horizontal" | "vertical";
export type SliderValue = number | number[];

export interface SliderProps {
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
