// iOS 原生 Slider：使用 @expo/ui/swift-ui 的 SwiftUI Slider
import { Slider as ExpoSlider, Host } from "@expo/ui/swift-ui";
import React from "react";
import { View } from "react-native";

import { supportsImpactHaptics } from "@/api/common/platform";
import { triggerSliderNativeHaptics, useResolvedNativeHaptics } from "@/components/ui/utils";

import type { SliderProps } from "./types";

export function NativeSlider(props: SliderProps) {
  const { value, onValueChange, min, max, step: stepProp, nativeHaptics } = props;

  const safeMin = min ?? 0;
  const safeMax = max ?? 100;
  const safeStep = stepProp ?? 1;

  const currentValue = value?.[0] ?? safeMin;

  // 触感反馈
  const resolvedNativeHaptics = useResolvedNativeHaptics(nativeHaptics);
  const hasNativeSystemEdgeHaptics = supportsImpactHaptics();
  const lastHapticsValueRef = React.useRef(currentValue);

  React.useEffect(() => {
    lastHapticsValueRef.current = currentValue;
  }, [currentValue]);

  const handleValueChange = (nextValue: number) => {
    // 四舍五入到最近的 step，避免浮点数
    const stepped = Math.min(
      safeMax,
      Math.max(safeMin, Math.round((nextValue - safeMin) / safeStep) * safeStep + safeMin),
    );
    onValueChange?.([stepped]);

    if (stepped === lastHapticsValueRef.current) {
      return;
    }

    lastHapticsValueRef.current = stepped;

    if (hasNativeSystemEdgeHaptics && (stepped === safeMin || stepped === safeMax)) {
      return;
    }

    triggerSliderNativeHaptics(resolvedNativeHaptics);
  };

  return (
    <View style={{ height: 48, width: "100%" }}>
      <Host style={{ flex: 1, width: "100%" }}>
        <ExpoSlider
          value={currentValue}
          onValueChange={handleValueChange}
          min={safeMin}
          max={safeMax}
          step={safeStep}
        />
      </Host>
    </View>
  );
}
