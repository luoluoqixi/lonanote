/* eslint-disable quote-props */
import {
  NativeListSection,
  NativeListSelectItem,
  NativeListSwitchItem,
  type SelectOption,
} from "rn-ui-kit";

import { useColorSchemeSettings, useUiPreferences } from "@/hooks/settings";
import type { AccentColorSetting, ColorSchemeSetting } from "@/stores/ui";
import { accentThemeNames, getAccentThemePreset } from "@/theme/accent_themes";

import { runSettingsAction } from "./settings_actions";
import { type SettingsPanelProps, SettingsSectionList } from "./settings_section_list";

export function AppearanceSettingsPanel({
  tracksNavigationBarScrollEdge = false,
}: SettingsPanelProps = {}) {
  const { preferredColorScheme, setPreferredColorSchemeAndSave } = useColorSchemeSettings();
  const { preferences, updateAndSave } = useUiPreferences();

  const accentColorOptions: SelectOption[] = accentThemeNames.map((option) => ({
    label: getAccentThemePreset(option).label,
    value: option,
  }));

  const colorSchemeOptions: SelectOption[] = [
    { label: "浅色", value: "light" },
    { label: "深色", value: "dark" },
    { label: "跟随系统", value: "system" },
  ];

  return (
    <SettingsSectionList tracksNavigationBarScrollEdge={tracksNavigationBarScrollEdge}>
      <NativeListSection title="主题">
        <NativeListSelectItem
          selectProps={{
            "aria-label": "主题",
            onValueChange: (nextValue: string | null) => {
              if (nextValue == null) return;
              runSettingsAction(
                "set accent theme",
                updateAndSave((currentPreferences) => ({
                  ...currentPreferences,
                  appearance: {
                    ...currentPreferences.appearance,
                    accentColor: nextValue as AccentColorSetting,
                  },
                })),
              );
            },
            options: accentColorOptions,
            placeholder: "选择主题",
            value: preferences.appearance.accentColor,
          }}
          title="主题"
        />
        <NativeListSelectItem
          selectProps={{
            "aria-label": "主题模式",
            onValueChange: (nextValue: string | null) => {
              if (nextValue == null) return;
              runSettingsAction(
                "set preferred color scheme",
                setPreferredColorSchemeAndSave(nextValue as ColorSchemeSetting),
              );
            },
            options: colorSchemeOptions,
            placeholder: "选择主题模式",
            value: preferredColorScheme,
          }}
          title="主题模式"
        />
        <NativeListSwitchItem
          switchProps={{
            checked: preferences.appearance.backgroundFollowsTheme,
            onCheckedChange: (nextValue) => {
              runSettingsAction(
                "toggle background follows theme",
                updateAndSave((currentPreferences) => ({
                  ...currentPreferences,
                  appearance: {
                    ...currentPreferences.appearance,
                    backgroundFollowsTheme: nextValue,
                  },
                })),
              );
            },
          }}
          title="背景跟随主题"
        />
      </NativeListSection>
    </SettingsSectionList>
  );
}
