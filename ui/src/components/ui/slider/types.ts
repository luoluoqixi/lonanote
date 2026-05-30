import type { ComponentProps, ReactNode } from "react";

import type { NativeHapticsSetting } from "../utils";
import type { Slider as ReplicaSlider } from "./slider/Slider";
import type { SliderProps as ReplicaSliderProps } from "./slider/types";

export type Direction = "ltr" | "rtl";

export interface SliderProps extends ReplicaSliderProps {
  children?: ReactNode;
  nativeHaptics?: NativeHapticsSetting;
  nativeHapticsInterval?: number;
  thumbCount?: number;
  thumbProps?: Partial<SliderThumbProps>;
  trackProps?: Partial<SliderTrackProps>;
  trackActiveProps?: Partial<SliderTrackActiveProps>;
}

export type SliderTrackProps = ComponentProps<(typeof ReplicaSlider)["Track"]>;
export type SliderTrackActiveProps = ComponentProps<(typeof ReplicaSlider)["TrackActive"]>;
export type SliderThumbProps = ComponentProps<(typeof ReplicaSlider)["Thumb"]>;
