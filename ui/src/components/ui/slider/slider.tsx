import React from "react";

import { getSliderHapticsBuckets, triggerNativeHaptics } from "@/components/ui/utils";

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
    nativeHaptics,
    nativeHapticsInterval,
    onValueChange,
    thumbCount,
    thumbProps,
    trackActiveProps,
    trackProps,
    orientation = "horizontal",
    size = "$4",
    ...rootProps
  } = props;
  const lastHapticsBucketsRef = React.useRef(
    getSliderHapticsBuckets(rootProps.value ?? rootProps.defaultValue, {
      interval: nativeHapticsInterval,
      max: rootProps.max,
      min: rootProps.min,
      step: rootProps.step,
    }),
  );

  React.useEffect(() => {
    if (rootProps.value == null) {
      return;
    }

    lastHapticsBucketsRef.current = getSliderHapticsBuckets(rootProps.value, {
      interval: nativeHapticsInterval,
      max: rootProps.max,
      min: rootProps.min,
      step: rootProps.step,
    });
  }, [nativeHapticsInterval, rootProps.max, rootProps.min, rootProps.step, rootProps.value]);

  const resolvedThumbCount =
    thumbCount ?? rootProps.value?.length ?? rootProps.defaultValue?.length ?? 1;
  const handleValueChange: NonNullable<SliderProps["onValueChange"]> = (nextValue) => {
    onValueChange?.(nextValue);

    const nextBuckets = getSliderHapticsBuckets(nextValue, {
      interval: nativeHapticsInterval,
      max: rootProps.max,
      min: rootProps.min,
      step: rootProps.step,
    });
    const previousBuckets = lastHapticsBucketsRef.current;
    const hasBucketChanged =
      previousBuckets.length !== nextBuckets.length ||
      nextBuckets.some((bucket, index) => bucket !== previousBuckets[index]);

    lastHapticsBucketsRef.current = nextBuckets;

    if (!hasBucketChanged) {
      return;
    }

    triggerNativeHaptics(nativeHaptics);
  };

  return (
    <ReplicaSlider
      {...rootProps}
      onValueChange={handleValueChange}
      orientation={orientation}
      size={size}
    >
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
