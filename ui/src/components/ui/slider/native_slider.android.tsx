// Android 原生 Slider：使用 @expo/ui/jetpack-compose 的 Material3 Slider
import { Slider as ExpoSlider, Host } from "@expo/ui/jetpack-compose";
import { useTheme } from "@tamagui/core";
import React from "react";

import {
  getSliderHapticsBuckets,
  toARGB,
  triggerSliderNativeHaptics,
  useResolvedNativeHaptics,
} from "@/components/ui/utils";

import type { SliderProps } from "./types";

export function NativeSlider(props: SliderProps) {
  const {
    value,
    onValueChange,
    min,
    max,
    step: stepProp,
    colors: colorsProp,
    nativeHaptics,
    nativeHapticsInterval,
  } = props;
  const theme = useTheme();

  const safeMin = min ?? 0;
  const safeMax = max ?? 100;
  const safeStep = stepProp ?? 1;

  const currentValue = value?.[0] ?? safeMin;

  // 无用户颜色时从 Tamagui 主题获取默认色，所有值转 ARGB int
  const resolvedColors = colorsProp
    ? {
        thumbColor: toARGB(colorsProp.thumbColor),
        activeTrackColor: toARGB(colorsProp.activeTrackColor),
        inactiveTrackColor: toARGB(colorsProp.inactiveTrackColor),
        activeTickColor: toARGB(colorsProp.activeTickColor),
        inactiveTickColor: toARGB(colorsProp.inactiveTickColor),
      }
    : {
        thumbColor: toARGB(theme.borderColor?.val),
        activeTrackColor: toARGB(theme.color6?.val),
        inactiveTrackColor: toARGB(theme.color3?.val),
        activeTickColor: toARGB(theme.color6?.val),
        inactiveTickColor: toARGB(theme.color3?.val),
      };

  // 触感反馈
  const resolvedNativeHaptics = useResolvedNativeHaptics(nativeHaptics);
  const lastHapticsBucketsRef = React.useRef(
    getSliderHapticsBuckets([currentValue], {
      interval: nativeHapticsInterval,
      max: safeMax,
      min: safeMin,
      step: safeStep,
    }),
  );

  React.useEffect(() => {
    if (value == null) return;
    const v = value[0] ?? safeMin;
    lastHapticsBucketsRef.current = getSliderHapticsBuckets([v], {
      interval: nativeHapticsInterval,
      max: safeMax,
      min: safeMin,
      step: safeStep,
    });
  }, [nativeHapticsInterval, safeMax, safeMin, safeStep, value]);

  const resolvedSteps =
    safeStep > 0 ? Math.max(0, Math.round((safeMax - safeMin) / safeStep) - 1) : 0;

  const handleValueChange = (nextValue: number) => {
    const stepped = Math.round((nextValue - safeMin) / safeStep) * safeStep + safeMin;
    onValueChange?.([stepped]);

    // 触感反馈：Bucket 变化时才触发
    const nextBuckets = getSliderHapticsBuckets([stepped], {
      interval: nativeHapticsInterval,
      max: safeMax,
      min: safeMin,
      step: safeStep,
    });
    const previousBuckets = lastHapticsBucketsRef.current;
    const hasBucketChanged =
      previousBuckets.length !== nextBuckets.length ||
      nextBuckets.some((bucket, index) => bucket !== previousBuckets[index]);
    lastHapticsBucketsRef.current = nextBuckets;

    if (hasBucketChanged) {
      triggerSliderNativeHaptics(resolvedNativeHaptics);
    }
  };

  return (
    <Host style={{ height: 48, width: "100%", justifyContent: "center" }}>
      <ExpoSlider
        value={currentValue}
        onValueChange={handleValueChange}
        min={safeMin}
        max={safeMax}
        steps={resolvedSteps}
        colors={resolvedColors as any}
      />
    </Host>
  );
}
