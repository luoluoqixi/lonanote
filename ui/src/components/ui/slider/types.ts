import type { ComponentProps, ReactNode } from "react";

import type { Slider as ReplicaSlider } from "./slider/Slider";
import type { SliderProps as ReplicaSliderProps } from "./slider/types";

export type Direction = "ltr" | "rtl";

export interface SliderProps extends ReplicaSliderProps {
  children?: ReactNode;
  thumbCount?: number;
  thumbProps?: Partial<SliderThumbProps>;
  trackProps?: Partial<SliderTrackProps>;
  trackActiveProps?: Partial<SliderTrackActiveProps>;
}

export type SliderTrackProps = ComponentProps<(typeof ReplicaSlider)["Track"]>;
export type SliderTrackActiveProps = ComponentProps<(typeof ReplicaSlider)["TrackActive"]>;
export type SliderThumbProps = ComponentProps<(typeof ReplicaSlider)["Thumb"]>;
