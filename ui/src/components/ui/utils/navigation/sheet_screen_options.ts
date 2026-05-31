import type { NativeStackNavigationOptions } from "@react-navigation/native-stack";

import { isMobile, os } from "@/api/common/platform";

import { nativeStackSheetStatusBarOptions } from "./status_bar";

export type SheetPreset = "card" | "bottom" | "full";

type SheetScreenOptionsInput = NativeStackNavigationOptions & {
  /** 0–1，仅 mobile `formSheet`；Android 最多 3 档 */
  detents?: number[];
};

const DEFAULT_BOTTOM_DETENTS: number[] = [0.5, 1];

function mobileDetents(detents: number[]): number[] {
  return os() === "android" ? detents.slice(0, 3) : detents;
}

function presetBase(preset: SheetPreset): NativeStackNavigationOptions {
  if (!isMobile()) {
    return {
      animation: "fade_from_bottom",
      presentation: "modal",
    };
  }

  const statusBar = nativeStackSheetStatusBarOptions();

  switch (preset) {
    case "card":
      return os() === "ios"
        ? {
            ...statusBar,
            presentation: "pageSheet",
            sheetAllowedDetents: [1],
            sheetGrabberVisible: true,
          }
        : {
            presentation: "formSheet",
            sheetAllowedDetents: [1],
            sheetElevation: 24,
          };

    case "bottom":
      return {
        ...statusBar,
        presentation: "formSheet",
        sheetAllowedDetents: mobileDetents(DEFAULT_BOTTOM_DETENTS),
        sheetGrabberVisible: true,
        sheetInitialDetentIndex: 0,
      };

    case "full":
      return {
        ...statusBar,
        presentation: "fullScreenModal",
      };
  }
}

export function sheetScreenOptions(
  preset: SheetPreset,
  overrides?: SheetScreenOptionsInput,
): NativeStackNavigationOptions {
  const { detents, ...rest } = overrides ?? {};
  const base = presetBase(preset);

  if (detents?.length && base.presentation === "formSheet") {
    return {
      ...base,
      sheetAllowedDetents: mobileDetents(detents),
      ...rest,
    };
  }

  return { ...base, ...rest };
}
