import { NativeList, type NativeListRootProps } from "rn-ui-kit";

import { os } from "@/api/common";

const SETTINGS_LIST_CONTENT_MARGIN_BOTTOM = 24;

export function SettingsList({
  automaticallyAdjustsScrollIndicatorInsets,
  contentMarginBottom = SETTINGS_LIST_CONTENT_MARGIN_BOTTOM,
  contentInsetAdjustmentBehavior,
  tracksNavigationBarScrollEdge = false,
  ...props
}: NativeListRootProps) {
  const usesNativeIosScrollEdgeHeader = os() === "ios" && tracksNavigationBarScrollEdge;

  return (
    <NativeList
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
