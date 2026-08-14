/* eslint-disable quote-props */
import {
  NativeListItem,
  NativeListSection,
  NativeListSelectItem,
  NativeListSwitchItem,
  type SelectOption,
} from "rn-ui-kit";

import { useLayoutMode } from "@/hooks/layout";
import { useColorSchemeSettings, useUiPreferences } from "@/hooks/settings";
import type { AccentColorSetting, AppLayoutMode, ColorSchemeSetting } from "@/stores/ui";
import { accentThemeNames, getAccentThemePreset } from "@/theme/accent_themes";

import type { SettingsPageProps } from "../settings_config";
import { SettingsList } from "../settings_list";

function runSettingsAction(scope: string, action: Promise<unknown>) {
  void action.catch((error) => {
    console.error(`[settings] ${scope} failed`, error);
  });
}

export function AppearanceSettingsPage({
  onLayoutModeChange,
  tracksNavigationBarScrollEdge = false,
}: SettingsPageProps = {}) {
  const colorSchemeSettings = useColorSchemeSettings();
  const { layoutMode, setLayoutMode } = useLayoutMode();
  const uiPreferences = useUiPreferences();
  const error = colorSchemeSettings.error ?? uiPreferences.error;
  const isLoading = colorSchemeSettings.isLoading || uiPreferences.isLoading;

  const accentColorOptions: SelectOption[] = accentThemeNames.map((option) => {
    const preset = getAccentThemePreset(option);

    return {
      label: preset.label,
      swatchColor: preset.accent,
      value: option,
    };
  });
  const colorSchemeOptions: SelectOption[] = [
    { label: "浅色", value: "light" },
    { label: "深色", value: "dark" },
    { label: "跟随系统", value: "system" },
  ];
  const layoutModeOptions: SelectOption[] = [
    { label: "桌面", value: "desktop" },
    { label: "移动", value: "mobile" },
  ];

  return (
    <SettingsList style={{ flex: 1 }} tracksNavigationBarScrollEdge={tracksNavigationBarScrollEdge}>
      {isLoading || error ? (
        <NativeListSection title="状态">
          <NativeListItem
            title={error ? "外观设置加载失败" : "正在加载外观设置"}
            value={error ?? undefined}
          />
        </NativeListSection>
      ) : null}

      <NativeListSection title="主题">
        <NativeListSelectItem
          selectProps={{
            "aria-label": "主题",
            onValueChange: (nextValue: string | null) => {
              if (nextValue == null) return;
              runSettingsAction(
                "set accent theme",
                uiPreferences.updateAndSave((currentPreferences) => ({
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
            value: uiPreferences.preferences.appearance.accentColor,
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
                colorSchemeSettings.setPreferredColorSchemeAndSave(nextValue as ColorSchemeSetting),
              );
            },
            options: colorSchemeOptions,
            placeholder: "选择主题模式",
            value: colorSchemeSettings.preferredColorScheme,
          }}
          title="主题模式"
        />
        <NativeListSwitchItem
          switchProps={{
            checked: uiPreferences.preferences.appearance.backgroundFollowsTheme,
            onCheckedChange: (nextValue) => {
              runSettingsAction(
                "toggle background follows theme",
                uiPreferences.updateAndSave((currentPreferences) => ({
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

      <NativeListSection title="界面布局">
        <NativeListSelectItem
          selectProps={{
            "aria-label": "界面布局",
            onValueChange: (nextValue: string | null) => {
              if (nextValue !== "desktop" && nextValue !== "mobile") return;

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
    </SettingsList>
  );
}
