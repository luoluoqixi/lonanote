import { NativeListNavigationItem, NativeListSection, NativeListSwitchItem } from "rn-ui-kit";

import { useGlobalSettings } from "@/hooks/settings";

import { LayoutModeSettingsSection } from "./layout_settings_section";
import { runSettingsAction, updateGlobalSettingsSection } from "./settings_actions";
import { type SettingsPanelProps, SettingsSectionList } from "./settings_section_list";

export function GlobalSettingsPanel({
  onLayoutModeChange,
  tracksNavigationBarScrollEdge = false,
}: SettingsPanelProps = {}) {
  const { settings, updateAndSave } = useGlobalSettings();

  return (
    <SettingsSectionList tracksNavigationBarScrollEdge={tracksNavigationBarScrollEdge}>
      <NativeListSection title="应用行为">
        <NativeListSwitchItem
          switchProps={{
            checked: settings.app.autoCheckUpdate,
            onCheckedChange: (nextValue) => {
              runSettingsAction(
                "toggle auto check update",
                updateAndSave((currentSettings) =>
                  updateGlobalSettingsSection(currentSettings, "app", {
                    ...currentSettings.app,
                    autoCheckUpdate: nextValue,
                  }),
                ),
              );
            },
          }}
          title="自动检查更新"
        />
        <NativeListSwitchItem
          switchProps={{
            checked: settings.app.autoOpenLastWorkspace,
            onCheckedChange: (nextValue) => {
              runSettingsAction(
                "toggle auto open last workspace",
                updateAndSave((currentSettings) =>
                  updateGlobalSettingsSection(currentSettings, "app", {
                    ...currentSettings.app,
                    autoOpenLastWorkspace: nextValue,
                  }),
                ),
              );
            },
          }}
          title="自动打开上次工作区"
        />
      </NativeListSection>

      <NativeListSection title="编辑器默认值">
        <NativeListSwitchItem
          switchProps={{
            checked: settings.editorDefaults.autoSave,
            onCheckedChange: (nextValue) => {
              runSettingsAction(
                "toggle auto save",
                updateAndSave((currentSettings) =>
                  updateGlobalSettingsSection(currentSettings, "editorDefaults", {
                    ...currentSettings.editorDefaults,
                    autoSave: nextValue,
                  }),
                ),
              );
            },
          }}
          title="自动保存"
        />
        <NativeListSwitchItem
          switchProps={{
            checked: settings.editorDefaults.autoSaveOnFocusChange,
            onCheckedChange: (nextValue) => {
              runSettingsAction(
                "toggle focus auto save",
                updateAndSave((currentSettings) =>
                  updateGlobalSettingsSection(currentSettings, "editorDefaults", {
                    ...currentSettings.editorDefaults,
                    autoSaveOnFocusChange: nextValue,
                  }),
                ),
              );
            },
          }}
          title="失焦时自动保存"
        />
        <NativeListSwitchItem
          switchProps={{
            checked: settings.editorDefaults.showLineNumber,
            onCheckedChange: (nextValue) => {
              runSettingsAction(
                "toggle show line number",
                updateAndSave((currentSettings) =>
                  updateGlobalSettingsSection(currentSettings, "editorDefaults", {
                    ...currentSettings.editorDefaults,
                    showLineNumber: nextValue,
                  }),
                ),
              );
            },
          }}
          title="显示行号"
        />
        <NativeListSwitchItem
          switchProps={{
            checked: settings.editorDefaults.disableLineWrap,
            onCheckedChange: (nextValue) => {
              runSettingsAction(
                "toggle line wrap",
                updateAndSave((currentSettings) =>
                  updateGlobalSettingsSection(currentSettings, "editorDefaults", {
                    ...currentSettings.editorDefaults,
                    disableLineWrap: nextValue,
                  }),
                ),
              );
            },
          }}
          title="禁用自动换行"
        />
        <NativeListSwitchItem
          switchProps={{
            checked: settings.editorDefaults.sourceMode,
            onCheckedChange: (nextValue) => {
              runSettingsAction(
                "toggle source mode",
                updateAndSave((currentSettings) =>
                  updateGlobalSettingsSection(currentSettings, "editorDefaults", {
                    ...currentSettings.editorDefaults,
                    sourceMode: nextValue,
                  }),
                ),
              );
            },
          }}
          title="源码模式"
        />
      </NativeListSection>

      <NativeListSection>
        <NativeListNavigationItem
          title="自动保存间隔"
          value={`${settings.editorDefaults.autoSaveIntervalSeconds.toFixed(1)} 秒`}
          onPress={() => {
            console.log("TODO");
          }}
        />
      </NativeListSection>

      <LayoutModeSettingsSection onLayoutModeChange={onLayoutModeChange} />
    </SettingsSectionList>
  );
}
