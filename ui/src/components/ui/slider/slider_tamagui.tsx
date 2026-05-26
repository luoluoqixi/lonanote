import { Slider as TamaguiSliderPrimitive } from "@tamagui/slider";
import React from "react";

import type {
  SliderProps,
  SliderThumbProps,
  SliderTrackActiveProps,
  SliderTrackProps,
} from "./types";

function TamaguiSliderRoot(props: SliderProps) {
  const {
    children,
    thumbCount,
    thumbProps,
    trackActiveProps,
    trackProps,
    orientation = "horizontal",
    size = "$4",
    ...rootProps
  } = props;
  const resolvedThumbCount =
    thumbCount ?? rootProps.value?.length ?? rootProps.defaultValue?.length ?? 1;

  return (
    <TamaguiSliderPrimitive {...rootProps} orientation={orientation} size={size}>
      {children ?? (
        <>
          <TamaguiSliderPrimitive.Track {...trackProps}>
            <TamaguiSliderPrimitive.TrackActive {...trackActiveProps} />
          </TamaguiSliderPrimitive.Track>
          {Array.from({ length: resolvedThumbCount }).map((_, index) => (
            <TamaguiSliderPrimitive.Thumb
              size={30}
              {...thumbProps}
              circular={thumbProps?.circular ?? true}
              index={index}
              key={index}
            />
          ))}
        </>
      )}
    </TamaguiSliderPrimitive>
  );
}

function TamaguiSliderTrackWrapper(props: SliderTrackProps) {
  return <TamaguiSliderPrimitive.Track {...props} />;
}

function TamaguiSliderTrackActiveWrapper(props: SliderTrackActiveProps) {
  return <TamaguiSliderPrimitive.TrackActive {...props} />;
}

function TamaguiSliderThumbWrapper(props: SliderThumbProps) {
  return <TamaguiSliderPrimitive.Thumb {...props} />;
}

export const TamaguiSlider = Object.assign(TamaguiSliderRoot, {
  Track: TamaguiSliderTrackWrapper,
  TrackActive: TamaguiSliderTrackActiveWrapper,
  Thumb: TamaguiSliderThumbWrapper,
});
