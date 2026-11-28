import type {
  NativeListItemBaseProps,
  NativeListSectionProps,
  SelectProps,
  SwitchProps,
} from "rn-ui-kit";

import { useLayoutMode } from "@/hooks/layout";

/** 保留库默认卡片外观，仅为桌面设置提供与表单一致的紧凑字号。 */
export function useSettingsPresentation() {
  const { layoutMode } = useLayoutMode();
  const compact = layoutMode === "desktop";
  return {
    desktop: layoutMode === "desktop",
    compact,
    item: compact
      ? ({
          titleFontSize: 13,
          valueFontSize: 13,
          subtitleFontSize: 12,
        } satisfies Partial<NativeListItemBaseProps>)
      : {},
    section: compact ? ({ titleFontSize: 12 } satisfies Partial<NativeListSectionProps>) : {},
    switch: compact ? ({ size: "sm" } satisfies Partial<SwitchProps>) : {},
    select: compact
      ? ({
          contentSize: "sm",
          nativeTriggerProps: { size: "sm" },
        } satisfies Partial<SelectProps>)
      : {},
  };
}
