import { NativeList, type NativeListRootProps } from "rn-ui-kit";

import { os } from "@/api/common";

import { useSettingsPresentation } from "./use_settings_presentation";

const SETTINGS_LIST_CONTENT_MARGIN_BOTTOM = 24;

export function SettingsList({
  automaticallyAdjustsScrollIndicatorInsets,
  contentMarginBottom = SETTINGS_LIST_CONTENT_MARGIN_BOTTOM,
  contentInsetAdjustmentBehavior,
  tracksNavigationBarScrollEdge = false,
  ...props
}: NativeListRootProps) {
  const { desktop } = useSettingsPresentation();
  const usesNativeIosScrollEdgeHeader = !desktop && os() === "ios" && tracksNavigationBarScrollEdge;

  return (
    <NativeList
      native={desktop ? false : undefined}
      automaticallyAdjustsScrollIndicatorInsets={
        automaticallyAdjustsScrollIndicatorInsets ??
        (usesNativeIosScrollEdgeHeader ? true : undefined)
      }
      contentInsetAdjustmentBehavior={
        contentInsetAdjustmentBehavior ?? (usesNativeIosScrollEdgeHeader ? "automatic" : undefined)
      }
      contentMarginBottom={contentMarginBottom}
      tracksNavigationBarScrollEdge={tracksNavigationBarScrollEdge}
      {...props}
    />
  );
}
