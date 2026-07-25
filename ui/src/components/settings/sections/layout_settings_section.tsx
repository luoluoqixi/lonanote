/* eslint-disable quote-props */
import { NativeListSection, NativeListSelectItem, type SelectOption } from "rn-ui-kit";

import { useLayoutMode } from "@/hooks/layout";
import type { AppLayoutMode } from "@/stores/ui";

import { runSettingsAction } from "./settings_actions";

type LayoutModeSettingsSectionProps = {
  onLayoutModeChange?: (layoutMode: AppLayoutMode) => void;
};

const layoutModeOptions: SelectOption[] = [
  {
    label: "桌面",
    value: "wide",
  },
  {
    label: "移动",
    value: "compact",
  },
];

export function LayoutModeSettingsSection({
  onLayoutModeChange,
}: LayoutModeSettingsSectionProps = {}) {
  const { layoutMode, setLayoutMode } = useLayoutMode();

  return (
    <NativeListSection title="界面布局">
      <NativeListSelectItem
        selectProps={{
          "aria-label": "界面布局",
          onValueChange: (nextValue: string | null) => {
            if (nextValue !== "wide" && nextValue !== "compact") return;

            const nextLayoutMode = nextValue as AppLayoutMode;
            runSettingsAction(
              "set layout mode",
              setLayoutMode(nextLayoutMode).then(() => {
                onLayoutModeChange?.(nextLayoutMode);
              }),
            );
          },
          options: layoutModeOptions,
          placeholder: "选择界面布局",
          value: layoutMode,
        }}
        title="布局模式"
      />
    </NativeListSection>
  );
}
