import * as Haptics from "expo-haptics";
import {
  Children,
  type ReactNode,
  createContext,
  createElement,
  isValidElement,
  useContext,
} from "react";
import { type DimensionValue, Vibration } from "react-native";

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

const NativeHapticsDefaultsContext = createContext<NativeHapticsDefaultsContextValue>({
  enabledByDefault: false,
});

const NATIVE_HAPTICS_DURATION_MAP: Record<NativeHapticsLevel, number> = {
  light: 10,
  medium: 20,
  heavy: 35,
};

const IOS_HAPTICS_STYLE_MAP: Record<NativeHapticsLevel, Haptics.ImpactFeedbackStyle> = {
  light: Haptics.ImpactFeedbackStyle.Light,
  medium: Haptics.ImpactFeedbackStyle.Medium,
  heavy: Haptics.ImpactFeedbackStyle.Heavy,
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

export function triggerNativeHaptics(setting: NativeHapticsSetting | undefined) {
  if (setting == null || setting === false || isWeb()) {
    return;
  }

  const level = setting === true ? "light" : setting;

  if (os() === "ios") {
    void Haptics.impactAsync(IOS_HAPTICS_STYLE_MAP[level]);
    return;
  }

  Vibration.vibrate(NATIVE_HAPTICS_DURATION_MAP[level]);
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

  const targetSegments = 10;
  const intervalSteps = Math.max(1, Math.round(range / resolvedStep / targetSegments));

  return intervalSteps * resolvedStep;
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
