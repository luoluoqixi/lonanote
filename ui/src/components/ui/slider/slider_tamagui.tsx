import { Slider as TamaguiSliderPrimitive } from "@tamagui/slider";
import React from "react";

import {
  getSliderHapticsBuckets,
  triggerSliderNativeHaptics,
  useResolvedNativeHaptics,
} from "@/components/ui/utils";

import type {
  SliderProps,
  SliderThumbProps,
  SliderTrackActiveProps,
  SliderTrackProps,
} from "./types";

function TamaguiSliderRoot(props: SliderProps) {
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
  const resolvedNativeHaptics = useResolvedNativeHaptics(nativeHaptics);
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

    triggerSliderNativeHaptics(resolvedNativeHaptics);
  };

  return (
    <TamaguiSliderPrimitive
      {...rootProps}
      onValueChange={handleValueChange}
      orientation={orientation}
      size={size}
    >
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
