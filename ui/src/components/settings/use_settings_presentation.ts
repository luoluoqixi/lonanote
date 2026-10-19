import type {
  NativeListItemBaseProps,
  NativeListSectionProps,
  SelectProps,
  SwitchProps,
} from "rn-ui-kit";

import { isWeb } from "@/api/common";
import { useLayoutMode } from "@/hooks/layout";

/** 桌面设置使用紧凑排版；Native 保持系统控件和触控尺寸。 */
export function useSettingsPresentation() {
  const { layoutMode } = useLayoutMode();
  const compact = isWeb() && layoutMode === "desktop";
  return {
    desktop: layoutMode === "desktop",
    compact,
    item: compact
      ? ({
          titleFontSize: 13,
          subtitleFontSize: 12,
          valueFontSize: 13,
          paddingVertical: 8,
        } satisfies NativeListItemBaseProps)
      : {},
    section: compact ? ({ titleFontSize: 12 } satisfies Partial<NativeListSectionProps>) : {},
    switch: compact ? ({ size: "sm" } satisfies Partial<SwitchProps>) : {},
    select: compact
      ? ({
          contentSize: "sm",
          nativeTriggerProps: { size: "sm" },
          nativeTriggerLabelProps: { fontSize: 13 },
        } satisfies Partial<SelectProps>)
      : {},
  };
}
