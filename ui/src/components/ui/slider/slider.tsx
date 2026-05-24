import { Slider as TamaguiSlider } from "tamagui";

import type {
  SliderProps,
  SliderThumbProps,
  SliderTrackActiveProps,
  SliderTrackProps,
} from "./types";

function SliderRoot(props: SliderProps) {
  const { children, thumbCount, thumbProps, trackActiveProps, trackProps, ...rootProps } = props;
  const resolvedThumbCount =
    thumbCount ?? rootProps.value?.length ?? rootProps.defaultValue?.length ?? 1;

  return (
    <TamaguiSlider {...rootProps}>
      {children ?? (
        <>
          <SliderTrack {...trackProps}>
            <SliderTrackActive {...trackActiveProps} />
          </SliderTrack>
          {Array.from({ length: resolvedThumbCount }).map((_, index) => (
            <SliderThumb
              size={30}
              {...thumbProps}
              circular={thumbProps?.circular ?? true}
              index={index}
              key={index}
            />
          ))}
        </>
      )}
    </TamaguiSlider>
  );
}

function SliderTrack(props: SliderTrackProps) {
  return <TamaguiSlider.Track {...props} />;
}

function SliderTrackActive(props: SliderTrackActiveProps) {
  return <TamaguiSlider.TrackActive {...props} />;
}

function SliderThumb(props: SliderThumbProps) {
  return <TamaguiSlider.Thumb {...props} />;
}

export const Slider = Object.assign(SliderRoot, {
  Track: SliderTrack,
  TrackActive: SliderTrackActive,
  Thumb: SliderThumb,
});
