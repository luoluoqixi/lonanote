import * as Haptics from "expo-haptics";
import {
  Children,
  type ReactNode,
  createContext,
  createElement,
  isValidElement,
  useContext,
} from "react";
import { type DimensionValue } from "react-native";

import { isWeb, os } from "@/api/common/platform";

export type NativeHapticsLevel = "light" | "medium" | "heavy";
export type NativeHapticsSetting = boolean | NativeHapticsLevel;

type NativeHapticsDefaultsContextValue = {
  enabledByDefault: boolean;
};

type NativeHapticsProviderProps = {
  children: ReactNode;
  enabledByDefault?: boolean;
};

type ResolveNativeHapticsOptions = {
  defaultEnabled?: boolean;
};

type TriggerNativeHapticsOptions = {
  androidType?: Haptics.AndroidHaptics;
};

const NativeHapticsDefaultsContext = createContext<NativeHapticsDefaultsContextValue>({
  enabledByDefault: false,
});

const HAPTICS_STYLE_MAP: Record<NativeHapticsLevel, Haptics.ImpactFeedbackStyle> = {
  light: Haptics.ImpactFeedbackStyle.Light,
  medium: Haptics.ImpactFeedbackStyle.Medium,
  heavy: Haptics.ImpactFeedbackStyle.Heavy,
};

const ANDROID_HAPTICS_TYPE_MAP: Record<NativeHapticsLevel, Haptics.AndroidHaptics> = {
  light: Haptics.AndroidHaptics.Keyboard_Tap,
  medium: Haptics.AndroidHaptics.Context_Click,
  heavy: Haptics.AndroidHaptics.Long_Press,
};

export function NativeHapticsProvider({
  children,
  enabledByDefault = false,
}: NativeHapticsProviderProps) {
  return createElement(
    NativeHapticsDefaultsContext.Provider,
    { value: { enabledByDefault } },
    children,
  );
}

export function useResolvedNativeHaptics(
  setting: NativeHapticsSetting | undefined,
  options?: ResolveNativeHapticsOptions,
) {
  const { enabledByDefault } = useContext(NativeHapticsDefaultsContext);

  if (setting !== undefined) {
    return setting;
  }

  if (options?.defaultEnabled) {
    return true;
  }

  return enabledByDefault ? true : undefined;
}

export function resolveAriaLabel(
  explicitLabel?: string,
  fallbackNode?: ReactNode,
): string | undefined {
  if (explicitLabel != null && explicitLabel.trim().length > 0) {
    return explicitLabel;
  }

  const derivedLabel = Children.toArray(fallbackNode)
    .map((child) => {
      if (typeof child === "string" || typeof child === "number") {
        return String(child);
      }

      if (isValidElement<{ children?: ReactNode }>(child)) {
        return resolveAriaLabel(undefined, child.props.children) ?? "";
      }

      return "";
    })
    .join("")
    .trim();

  return derivedLabel.length > 0 ? derivedLabel : undefined;
}

export function resolvePercentageValue(
  value: DimensionValue | undefined,
  availableSize: number,
): DimensionValue | undefined {
  if (typeof value !== "string") {
    return value;
  }

  const trimmedValue = value.trim();

  if (!trimmedValue.endsWith("%")) {
    return value;
  }

  const parsedPercentage = Number.parseFloat(trimmedValue.slice(0, -1));

  if (!Number.isFinite(parsedPercentage)) {
    return value;
  }

  return (availableSize * parsedPercentage) / 100;
}

export function triggerNativeHaptics(
  setting: NativeHapticsSetting | undefined,
  options?: TriggerNativeHapticsOptions,
) {
  if (setting == null || setting === false || isWeb()) {
    return;
  }
  const level = setting === true ? "light" : setting;

  if (os() === "android") {
    void Haptics.performAndroidHapticsAsync(
      options?.androidType ?? ANDROID_HAPTICS_TYPE_MAP[level],
    );
    return;
  }

  void Haptics.impactAsync(HAPTICS_STYLE_MAP[level]);
}

export function triggerSliderNativeHaptics(setting: NativeHapticsSetting | undefined) {
  triggerNativeHaptics(setting, {
    androidType: Haptics.AndroidHaptics.Segment_Frequent_Tick,
  });
}

export function resolveSliderHapticsInterval(options: {
  interval?: number;
  min?: number;
  max?: number;
  step?: number;
}) {
  const { interval, min = 0, max = 100, step = 1 } = options;

  if (typeof interval === "number" && Number.isFinite(interval) && interval > 0) {
    return interval;
  }

  const resolvedStep = Number.isFinite(step) && step > 0 ? step : 1;
  const range = Math.abs(max - min);

  if (!Number.isFinite(range) || range <= 0) {
    return resolvedStep;
  }

  if (range < 1) {
    return resolvedStep;
  }

  return Math.max(1, resolvedStep);
}

export function getSliderHapticsBuckets(
  values: number[] | undefined,
  options: {
    interval?: number;
    min?: number;
    max?: number;
    step?: number;
  },
) {
  const { min = 0, max = 100 } = options;
  const lowerBound = Math.min(min, max);
  const upperBound = Math.max(min, max);
  const interval = resolveSliderHapticsInterval(options);

  return (values ?? [lowerBound]).map((value) => {
    const clampedValue = Math.min(Math.max(value, lowerBound), upperBound);
    return Math.floor((clampedValue - lowerBound) / interval);
  });
}

export * from "./navigation";
