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
    Haptics.performAndroidHapticsAsync(
      options?.androidType ?? ANDROID_HAPTICS_TYPE_MAP[level],
    ).catch((err: unknown) => {
      console.error("[Haptics] performAndroidHapticsAsync 失败:", err);
    });
    return;
  }

  Haptics.impactAsync(HAPTICS_STYLE_MAP[level]).catch((err: unknown) => {
    console.error("[Haptics] impactAsync 失败:", err);
  });
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

/** HSL → RGB 辅助函数 */
function hueToRGB(p: number, q: number, t: number) {
  if (t < 0) t += 1;
  if (t > 1) t -= 1;
  if (t < 1 / 6) return p + (q - p) * 6 * t;
  if (t < 1 / 2) return q;
  if (t < 2 / 3) return p + (q - p) * (2 / 3 - t) * 6;
  return p;
}

/** 将 CSS 色值转为 Android ARGB 有符号整数。
 *  支持：hex(#RGB/#RRGGBB/#RRGGBBAA)、rgb/rgba、hsl/hsla。 */
export function toARGB(val: unknown): number | undefined {
  if (typeof val === "number") return val | 0;
  if (typeof val !== "string") return undefined;

  const s = val.trim();

  // ── hex ──────────────────────────────────────────────
  if (s.startsWith("#")) {
    const hex = s.replace("#", "");
    let int: number;
    if (hex.length === 3) {
      const r = parseInt(hex[0] + hex[0], 16);
      const g = parseInt(hex[1] + hex[1], 16);
      const b = parseInt(hex[2] + hex[2], 16);
      int = (0xff << 24) | (r << 16) | (g << 8) | b;
    } else if (hex.length === 6) {
      int = (0xff << 24) | parseInt(hex, 16);
    } else if (hex.length === 8) {
      int = parseInt(hex, 16);
    } else {
      return undefined;
    }
    return int | 0;
  }

  // ── hsl / hsla ───────────────────────────────────────
  const hslMatch = s.match(
    /^hsla?\s*\(\s*(\d+)\s*,\s*(\d+(?:\.\d+)?)%\s*,\s*(\d+(?:\.\d+)?)%\s*(?:,\s*([\d.]+))?\s*\)$/i,
  );
  if (hslMatch) {
    const h = Number.parseFloat(hslMatch[1]) / 360;
    const sPct = Number.parseFloat(hslMatch[2]) / 100;
    const l = Number.parseFloat(hslMatch[3]) / 100;
    const a = hslMatch[4] !== undefined ? Number.parseFloat(hslMatch[4]) : 1;

    let r: number, g: number, b: number;
    if (sPct === 0) {
      r = g = b = l;
    } else {
      const q = l < 0.5 ? l * (1 + sPct) : l + sPct - l * sPct;
      const p = 2 * l - q;
      r = hueToRGB(p, q, h + 1 / 3);
      g = hueToRGB(p, q, h);
      b = hueToRGB(p, q, h - 1 / 3);
    }
    const alpha = Math.round(a * 255);
    const int =
      (alpha << 24) |
      (Math.round(r * 255) << 16) |
      (Math.round(g * 255) << 8) |
      Math.round(b * 255);
    return int | 0;
  }

  // ── rgb / rgba ───────────────────────────────────────
  const rgbMatch = s.match(
    /^rgba?\s*\(\s*(\d+(?:\.\d+)?)%?\s*,\s*(\d+(?:\.\d+)?)%?\s*,\s*(\d+(?:\.\d+)?)%?\s*(?:,\s*([\d.]+))?\s*\)$/i,
  );
  if (rgbMatch) {
    const pct = s.includes("%");
    const r = pct
      ? Math.round((Number.parseFloat(rgbMatch[1]) / 100) * 255)
      : Number.parseFloat(rgbMatch[1]);
    const g = pct
      ? Math.round((Number.parseFloat(rgbMatch[2]) / 100) * 255)
      : Number.parseFloat(rgbMatch[2]);
    const b = pct
      ? Math.round((Number.parseFloat(rgbMatch[3]) / 100) * 255)
      : Number.parseFloat(rgbMatch[3]);
    const a = rgbMatch[4] !== undefined ? Math.round(Number.parseFloat(rgbMatch[4]) * 255) : 0xff;
    const int = (a << 24) | (Math.min(r, 255) << 16) | (Math.min(g, 255) << 8) | Math.min(b, 255);
    return int | 0;
  }

  return undefined;
}

export * from "./navigation";
export * from "./page_sheet_gesture_lock";
export * from "./screen_overlay_portal";
