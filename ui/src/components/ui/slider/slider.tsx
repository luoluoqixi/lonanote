import React from "react";

import { Slider as ReplicaSlider } from "./slider/Slider";
import type {
  SliderProps,
  SliderThumbProps,
  SliderTrackActiveProps,
  SliderTrackProps,
} from "./types";

function SliderRoot(props: SliderProps) {
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
    <ReplicaSlider {...rootProps} orientation={orientation} size={size}>
      {children ?? (
        <>
          <ReplicaSlider.Track {...trackProps}>
            <ReplicaSlider.TrackActive {...trackActiveProps} />
          </ReplicaSlider.Track>
          {Array.from({ length: resolvedThumbCount }).map((_, index) => (
            <ReplicaSlider.Thumb
              size={30}
              {...thumbProps}
              circular={thumbProps?.circular ?? true}
              index={index}
              key={index}
            />
          ))}
        </>
      )}
    </ReplicaSlider>
  );
}

function SliderTrackWrapper(props: SliderTrackProps) {
  return <ReplicaSlider.Track {...props} />;
}

function SliderTrackActiveWrapper(props: SliderTrackActiveProps) {
  return <ReplicaSlider.TrackActive {...props} />;
}

function SliderThumbWrapper(props: SliderThumbProps) {
  return <ReplicaSlider.Thumb {...props} />;
}

export const Slider = Object.assign(SliderRoot, {
  Track: SliderTrackWrapper,
  TrackActive: SliderTrackActiveWrapper,
  Thumb: SliderThumbWrapper,
});
