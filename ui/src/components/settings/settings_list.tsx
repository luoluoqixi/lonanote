import { NativeList, type NativeListRootProps, useUiTheme } from "rn-ui-kit";

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
  const usesNativeIosScrollEdgeHeader = os() === "ios" && tracksNavigationBarScrollEdge;
  const { desktop } = useSettingsPresentation();
  const theme = useUiTheme();

  return (
    <NativeList
      backgroundColor={desktop ? theme.background : undefined}
      listStyleOptions={
        desktop
          ? {
              rowBackgroundColor: theme.muted,
              showBorder: false,
              borderColor: theme.border,
              sectionShadow: false,
              borderRadius: 6,
            }
          : undefined
      }
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
