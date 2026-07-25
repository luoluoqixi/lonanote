import {
  NativeList,
  NativeListItem,
  NativeListNavigationItem,
  NativeListSection,
  NativeListSwitchItem,
} from "rn-ui-kit";

import type { GlobalSettings } from "@/api/commands/settings";
import { useGlobalSettings } from "@/hooks/settings";

import type { SettingsPageProps } from "../settings_config";

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
  const { error, isLoading, settings, updateAndSave } = useGlobalSettings();

  return (
    <NativeList
      automaticallyAdjustsScrollIndicatorInsets={tracksNavigationBarScrollEdge ? true : undefined}
      contentInsetAdjustmentBehavior={tracksNavigationBarScrollEdge ? "automatic" : undefined}
      style={{ flex: 1 }}
      tracksNavigationBarScrollEdge={tracksNavigationBarScrollEdge}
    >
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

      <NativeListSection title="编辑器默认值">
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
      </NativeListSection>

      <NativeListSection>
        <NativeListNavigationItem
          onPress={() => {
            console.log("TODO");
          }}
          title="自动保存间隔"
          value={`${settings.editorDefaults.autoSaveIntervalSeconds.toFixed(1)} 秒`}
        />
      </NativeListSection>
    </NativeList>
  );
}
