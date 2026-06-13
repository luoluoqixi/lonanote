import type { ComponentProps, ReactNode } from "react";
import type { ColorValue } from "react-native";

import type { NativeHapticsSetting } from "../utils";
import type { Slider as ReplicaSlider } from "./slider/Slider";
import type { SliderProps as ReplicaSliderProps } from "./slider/types";

export type Direction = "ltr" | "rtl";

/** Material3 Slider 颜色配置，仅 Android native 模式生效 */
export type SliderColors = {
  thumbColor?: ColorValue;
  activeTrackColor?: ColorValue;
  inactiveTrackColor?: ColorValue;
  activeTickColor?: ColorValue;
  inactiveTickColor?: ColorValue;
};

export interface SliderProps extends ReplicaSliderProps {
  children?: ReactNode;
  /** 使用 @expo/ui 原生平台的 Slider（iOS: SwiftUI, Android: Material3）。
   * web 端此参数无效，会退回非原生实现。 */
  native?: boolean;
  /** Android Material3 Slider 颜色（仅 native 模式生效）。不传则从 Tamagui 主题自动获取。 */
  colors?: SliderColors;
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
