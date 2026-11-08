/* eslint-disable quote-props */
import { ChevronsUpDown } from "lucide-react-native";
import { useState } from "react";
import {
  BrightnessSlider,
  HueSlider,
  NativeListColorPickerItem,
  NativeListItem,
  NativeListSection,
  NativeListSelectItem,
  NativeListSwitchItem,
  Panel1,
  Preview,
  type SelectOption,
  Swatches,
  useUiTheme,
} from "rn-ui-kit";

import { fontSelectionName } from "@/fonts/font_selection";
import { useLayoutMode } from "@/hooks/layout";
import { useColorSchemeSettings, useUiPreferences } from "@/hooks/settings";
import { useFontSettings } from "@/hooks/settings/use_font_settings";
import type { AccentColorSetting, AppLayoutMode, ColorSchemeSetting } from "@/stores/ui";
import {
  accentThemeNames,
  accentThemeSeeds,
  getAccentThemePreset,
  isCustomAccentColor,
} from "@/theme/accent_themes";

import { FontPicker } from "../font_picker";
import type { SettingsPageProps } from "../settings_config";
import { SettingsList } from "../settings_list";
import { useSettingsPresentation } from "../use_settings_presentation";

function runSettingsAction(scope: string, action: Promise<unknown>) {
  void action.catch((error) => {
    console.error(`[settings] ${scope} failed`, error);
  });
}

function supportSwitchUIMode() {
  return false;
}

export function AppearanceSettingsPage({
  onLayoutModeChange,
  tracksNavigationBarScrollEdge = false,
}: SettingsPageProps = {}) {
  const presentation = useSettingsPresentation();
  const theme = useUiTheme();
  const fonts = useFontSettings();
  const [fontPicker, setFontPicker] = useState<"ui" | "editor" | null>(null);
  const colorSchemeSettings = useColorSchemeSettings();
  const { layoutMode, setLayoutMode } = useLayoutMode();
  const uiPreferences = useUiPreferences();
  const error = colorSchemeSettings.error ?? uiPreferences.error;
  const isLoading = colorSchemeSettings.isLoading || uiPreferences.isLoading;
  const currentAccentColor = uiPreferences.preferences.appearance.accentColor;
  const customAccentColor = isCustomAccentColor(currentAccentColor)
    ? currentAccentColor
    : accentThemeSeeds.lavender;

  const accentColorOptions: SelectOption[] = [
    ...accentThemeNames.map((option) => {
      const preset = getAccentThemePreset(option);

      return {
        label: preset.label,
        swatchColor: accentThemeSeeds[option],
        value: option,
      };
    }),
    { label: "自定义颜色", swatchColor: customAccentColor, value: customAccentColor },
  ];
  const presetThemeColors = accentThemeNames.map((name) => accentThemeSeeds[name]);
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
        <NativeListSection {...presentation.section} title="状态">
          <NativeListItem
            {...presentation.item}
            title={error ? "外观设置加载失败" : "正在加载外观设置"}
            value={error ?? undefined}
          />
        </NativeListSection>
      ) : null}

      <NativeListSection {...presentation.section} title="字体">
        <NativeListItem
          {...presentation.item}
          title="编辑器字体"
          value={fontSelectionName(fonts.editor.selection)}
          valueColor={theme.primary}
          trailing={<ChevronsUpDown color={theme.primary} size={16} />}
          onPress={() => setFontPicker("editor")}
        />
        <NativeListItem
          {...presentation.item}
          title="UI 界面字体"
          value={fontSelectionName(fonts.ui.selection)}
          valueColor={theme.primary}
          trailing={<ChevronsUpDown color={theme.primary} size={16} />}
          onPress={() => setFontPicker("ui")}
        />
      </NativeListSection>
      {fontPicker ? (
        <FontPicker
          consumer={fontPicker}
          open
          onOpenChange={(open) => {
            if (!open) setFontPicker(null);
          }}
        />
      ) : null}
      <NativeListSection {...presentation.section} title="主题">
        <NativeListSelectItem
          {...presentation.item}
          selectProps={{
            ...presentation.select,
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
            value: currentAccentColor,
          }}
          title="主题"
        />
        {isCustomAccentColor(currentAccentColor) ? (
          <NativeListColorPickerItem
            {...presentation.item}
            color={customAccentColor}
            colorPickerProps={{
              adaptSpectrum: true,
              thumbShape: "circle",
              children: (
                <>
                  <Preview style={{ height: 44, width: "100%" }} />
                  <Panel1 style={{ height: 240, width: "100%" }} />
                  <HueSlider />
                  <BrightnessSlider />
                  <Swatches
                    colors={presetThemeColors}
                    swatchStyle={{
                      height: 26,
                      marginBottom: 0,
                      marginHorizontal: 2,
                      width: 26,
                    }}
                  />
                </>
              ),
            }}
            onColorChange={(color) =>
              runSettingsAction(
                "set custom accent color",
                uiPreferences.updateAndSave((currentPreferences) => ({
                  ...currentPreferences,
                  appearance: {
                    ...currentPreferences.appearance,
                    accentColor: color,
                  },
                })),
              )
            }
            title="自定义主题颜色"
          />
        ) : null}
        <NativeListSelectItem
          {...presentation.item}
          selectProps={{
            ...presentation.select,
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
          {...presentation.item}
          switchProps={{
            ...presentation.switch,
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

      {supportSwitchUIMode() && (
        <NativeListSection {...presentation.section} title="界面布局">
          <NativeListSelectItem
            {...presentation.item}
            selectProps={{
              ...presentation.select,
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
      )}
    </SettingsList>
  );
}
