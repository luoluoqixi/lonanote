import {
  NativeListItem,
  NativeListSection,
  NativeListSelectItem,
  NativeListSwitchItem,
  type SelectOption,
} from "rn-ui-kit";

import type { GlobalSettings } from "@/api/commands/settings";
import { useGlobalSettings, useUiPreferences } from "@/hooks/settings";

import type { SettingsPageProps } from "../settings_config";
import { SettingsList } from "../settings_list";

/* eslint-disable quote-props */

const AUTO_SAVE_INTERVAL_OPTIONS: SelectOption[] = [
  { label: "0.5 秒", value: "0.5" },
  { label: "1 秒（默认）", value: "1" },
  { label: "2 秒", value: "2" },
  { label: "5 秒", value: "5" },
  { label: "10 秒", value: "10" },
  { label: "30 秒", value: "30" },
];

function runSettingsAction(scope: string, action: Promise<unknown>) {
  void action.catch((error) => {
    console.error(`[settings] ${scope} failed`, error);
  });
}

function updateSettingsSection<K extends keyof GlobalSettings>(
  currentSettings: GlobalSettings,
  sectionKey: K,
  nextSectionValue: GlobalSettings[K],
): GlobalSettings {
  return {
    ...currentSettings,
    [sectionKey]: nextSectionValue,
  };
}

export function GlobalSettingsPage({
  tracksNavigationBarScrollEdge = false,
}: SettingsPageProps = {}) {
  const {
    error: globalSettingsError,
    isLoading: isGlobalSettingsLoading,
    settings,
    updateAndSave,
  } = useGlobalSettings();
  const uiPreferences = useUiPreferences();
  const error = globalSettingsError ?? uiPreferences.error;
  const isLoading = isGlobalSettingsLoading || uiPreferences.isLoading;

  return (
    <SettingsList style={{ flex: 1 }} tracksNavigationBarScrollEdge={tracksNavigationBarScrollEdge}>
      {isLoading || error ? (
        <NativeListSection title="状态">
          <NativeListItem
            title={error ? "设置加载失败" : "正在加载设置"}
            value={error ?? undefined}
          />
        </NativeListSection>
      ) : null}

      <NativeListSection title="应用行为">
        <NativeListSwitchItem
          switchProps={{
            checked: settings.app.autoCheckUpdate,
            onCheckedChange: (nextValue) => {
              runSettingsAction(
                "toggle auto check update",
                updateAndSave((currentSettings) =>
                  updateSettingsSection(currentSettings, "app", {
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
                  updateSettingsSection(currentSettings, "app", {
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

      <NativeListSection title="UI">
        <NativeListSwitchItem
          switchProps={{
            checked: uiPreferences.preferences.workspaceExplorer.foldersFirst,
            onCheckedChange: (nextValue) => {
              runSettingsAction(
                "toggle folders first",
                uiPreferences.updateAndSave((currentPreferences) => ({
                  ...currentPreferences,
                  workspaceExplorer: {
                    ...currentPreferences.workspaceExplorer,
                    foldersFirst: nextValue,
                  },
                })),
              );
            },
          }}
          title="文件夹置顶"
        />
        <NativeListSwitchItem
          switchProps={{
            checked: uiPreferences.preferences.workspaceExplorer.showFloatingToolbar,
            onCheckedChange: (nextValue) => {
              runSettingsAction(
                "toggle workspace explorer floating toolbar",
                uiPreferences.updateAndSave((currentPreferences) => ({
                  ...currentPreferences,
                  workspaceExplorer: {
                    ...currentPreferences.workspaceExplorer,
                    showFloatingToolbar: nextValue,
                  },
                })),
              );
            },
          }}
          title="显示悬浮工具栏"
        />
      </NativeListSection>

      <NativeListSection title="编辑器">
        <NativeListSwitchItem
          switchProps={{
            checked: settings.editorDefaults.autoSaveOnFocusChange,
            onCheckedChange: (nextValue) => {
              runSettingsAction(
                "toggle focus auto save",
                updateAndSave((currentSettings) =>
                  updateSettingsSection(currentSettings, "editorDefaults", {
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
                  updateSettingsSection(currentSettings, "editorDefaults", {
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
                  updateSettingsSection(currentSettings, "editorDefaults", {
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
                  updateSettingsSection(currentSettings, "editorDefaults", {
                    ...currentSettings.editorDefaults,
                    sourceMode: nextValue,
                  }),
                ),
              );
            },
          }}
          title="源码模式"
        />
        <NativeListSwitchItem
          switchProps={{
            checked: settings.editorDefaults.autoSave,
            onCheckedChange: (nextValue) => {
              runSettingsAction(
                "toggle auto save",
                updateAndSave((currentSettings) =>
                  updateSettingsSection(currentSettings, "editorDefaults", {
                    ...currentSettings.editorDefaults,
                    autoSave: nextValue,
                  }),
                ),
              );
            },
          }}
          title="自动保存"
        />
        <NativeListSelectItem
          selectProps={{
            "aria-label": "自动保存间隔",
            onValueChange: (nextValue) => {
              if (nextValue == null) return;

              const nextIntervalSeconds = Number(nextValue);
              if (!Number.isFinite(nextIntervalSeconds) || nextIntervalSeconds <= 0) return;

              runSettingsAction(
                "set auto save interval",
                updateAndSave((currentSettings) =>
                  updateSettingsSection(currentSettings, "editorDefaults", {
                    ...currentSettings.editorDefaults,
                    autoSaveIntervalSeconds: nextIntervalSeconds,
                  }),
                ),
              );
            },
            options: AUTO_SAVE_INTERVAL_OPTIONS,
            placeholder: "选择自动保存间隔",
            value: String(settings.editorDefaults.autoSaveIntervalSeconds),
          }}
          title="自动保存间隔"
        />
      </NativeListSection>
    </SettingsList>
  );
}
