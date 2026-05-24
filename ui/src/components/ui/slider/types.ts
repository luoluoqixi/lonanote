import type { ComponentProps } from "react";
import type { Slider as TamaguiSlider } from "tamagui";

export interface SliderProps extends ComponentProps<typeof TamaguiSlider> {
  thumbCount?: number;
  thumbProps?: SliderThumbProps;
  trackActiveProps?: SliderTrackActiveProps;
  trackProps?: SliderTrackProps;
}
export type SliderTrackProps = ComponentProps<typeof TamaguiSlider.Track>;
export type SliderTrackActiveProps = ComponentProps<typeof TamaguiSlider.TrackActive>;
export type SliderThumbProps = ComponentProps<typeof TamaguiSlider.Thumb>;
