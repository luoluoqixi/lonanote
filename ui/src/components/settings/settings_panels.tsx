/* eslint-disable quote-props */
import { StyleSheet, View } from "react-native";

import type { GlobalSettings } from "@/api/commands/settings";
import {
  Button,
  NativeList,
  NativeListItem,
  NativeListSection,
  NativeListSelectItem,
  NativeListSwitchItem,
  type SelectOption,
  Text,
} from "@/components/ui";
import {
  clampZoomFactor,
  getAccentColorPreset,
  useColorSchemeSettings,
  useGlobalSettings,
  useUiPreferences,
} from "@/hooks/settings";
import type { AccentColorSetting, ColorSchemeSetting } from "@/stores/ui";

export type SettingsTabKey = "appearance" | "global" | "window";

export const settingsTabs: Array<{ key: SettingsTabKey; label: string }> = [
  { key: "global", label: "全局设置" },
  { key: "appearance", label: "外观" },
  { key: "window", label: "窗口" },
];

function reportAsyncError(scope: string, error: unknown) {
  console.error(`[settings] ${scope} failed`, error);
}

function runSettingsAction(scope: string, action: Promise<unknown>) {
  void action.catch((error) => {
    reportAsyncError(scope, error);
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

function clampAutoSaveInterval(nextValue: number) {
  return Math.min(30, Math.max(0.5, Number(nextValue.toFixed(1))));
}

function formatZoomFactor(zoomFactor: number) {
  return `${Math.round(zoomFactor * 100)}%`;
}

function formatWindowStateSummary(
  windowState: {
    height: number;
    isFullscreen: boolean;
    isMaximized: boolean;
    width: number;
    x: number;
    y: number;
  } | null,
): string {
  if (!windowState) {
    return "暂无记录";
  }

  const flags = [
    windowState.isFullscreen ? "全屏" : null,
    windowState.isMaximized ? "最大化" : null,
  ]
    .filter(Boolean)
    .join(" / ");

  const size = `${windowState.width}x${windowState.height}`;
  const position = `${windowState.x}, ${windowState.y}`;

  return flags ? `${size} @ ${position} (${flags})` : `${size} @ ${position}`;
}

type StatusBadgeProps = {
  children: string;
  tone: "error" | "loading" | "neutral";
};

export function SettingsStatusBadge({ children, tone }: StatusBadgeProps) {
  return (
    <View style={[styles.badge, tone === "error" ? styles.badgeError : styles.badgeNeutral]}>
      <Text color={tone === "error" ? "$red10" : "$color10"} fontSize="$2" fontWeight="600">
        {children}
      </Text>
    </View>
  );
}

type StepperRowProps = {
  decreaseLabel?: string;
  increaseLabel?: string;
  label: string;
  onDecrease: () => void;
  onIncrease: () => void;
  valueLabel: string;
};

function SettingsStepperRowContent({
  decreaseLabel = "-0.5s",
  increaseLabel = "+0.5s",
  label,
  onDecrease,
  onIncrease,
  valueLabel,
}: StepperRowProps) {
  return (
    <View style={styles.customRow}>
      <View style={styles.customRowText}>
        <Text fontSize="$5" fontWeight="500">
          {label}
        </Text>
        <Text color="$color10" fontSize="$3">
          {valueLabel}
        </Text>
      </View>
      <View style={styles.buttonRow}>
        <Button aria-label={`${label}${decreaseLabel}`} onPress={onDecrease} variant="outlined">
          -
        </Button>
        <Button aria-label={`${label}${increaseLabel}`} onPress={onIncrease} variant="outlined">
          +
        </Button>
      </View>
    </View>
  );
}

type SummaryActionRowProps = {
  actionLabel: string;
  description: string;
  onPress: () => void;
  title: string;
};

function SettingsSummaryActionRow({
  actionLabel,
  description,
  onPress,
  title,
}: SummaryActionRowProps) {
  return (
    <View style={styles.customRow}>
      <View style={styles.customRowText}>
        <Text fontSize="$5" fontWeight="500">
          {title}
        </Text>
        <Text color="$color10" fontSize="$3">
          {description}
        </Text>
      </View>
      <Button onPress={onPress} variant="outlined">
        {actionLabel}
      </Button>
    </View>
  );
}

type PanelHeaderProps = {
  error: string | null;
  isLoading: boolean;
};

export function SettingsSyncState({ error, isLoading }: PanelHeaderProps) {
  if (!isLoading && !error) {
    return null;
  }

  return (
    <View style={styles.syncState}>
      {isLoading ? <SettingsStatusBadge tone="loading">正在同步设置</SettingsStatusBadge> : null}
      {error ? <SettingsStatusBadge tone="error">{error}</SettingsStatusBadge> : null}
    </View>
  );
}

export function GlobalSettingsPanel() {
  const { settings, updateAndSave } = useGlobalSettings();

  return (
    <View style={styles.inlineSectionList}>
      <NativeList>
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
          <NativeListItem>
            <SettingsStepperRowContent
              label="自动保存间隔"
              onDecrease={() => {
                runSettingsAction(
                  "decrease auto save interval",
                  updateAndSave((currentSettings) =>
                    updateSettingsSection(currentSettings, "editorDefaults", {
                      ...currentSettings.editorDefaults,
                      autoSaveIntervalSeconds: clampAutoSaveInterval(
                        currentSettings.editorDefaults.autoSaveIntervalSeconds - 0.5,
                      ),
                    }),
                  ),
                );
              }}
              onIncrease={() => {
                runSettingsAction(
                  "increase auto save interval",
                  updateAndSave((currentSettings) =>
                    updateSettingsSection(currentSettings, "editorDefaults", {
                      ...currentSettings.editorDefaults,
                      autoSaveIntervalSeconds: clampAutoSaveInterval(
                        currentSettings.editorDefaults.autoSaveIntervalSeconds + 0.5,
                      ),
                    }),
                  ),
                );
              }}
              valueLabel={`${settings.editorDefaults.autoSaveIntervalSeconds.toFixed(1)} 秒`}
            />
          </NativeListItem>
        </NativeListSection>
      </NativeList>
    </View>
  );
}

export function AppearanceSettingsPanel() {
  const { preferredColorScheme, setPreferredColorSchemeAndSave } = useColorSchemeSettings();
  const { preferences, updateAndSave } = useUiPreferences();

  const accentColorOptions: SelectOption[] = (
    ["blue", "emerald", "orange", "rose"] as AccentColorSetting[]
  ).map((option) => ({
    label: getAccentColorPreset(option).label,
    value: option,
  }));

  const colorSchemeOptions: SelectOption[] = [
    { label: "浅色", value: "light" },
    { label: "深色", value: "dark" },
    { label: "跟随系统", value: "system" },
  ];

  return (
    <View style={styles.inlineSectionList}>
      <NativeList>
        <NativeListSection title="主题">
          <NativeListSelectItem
            selectProps={{
              "aria-label": "主题色",
              onValueChange: (nextValue: string | null) => {
                if (nextValue == null) return;
                runSettingsAction(
                  "set accent color",
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
              placeholder: "选择主题色",
              value: preferences.appearance.accentColor,
            }}
            title="主题色"
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
        </NativeListSection>

        <NativeListSection title="桌面缩放">
          <NativeListItem>
            <SettingsStepperRowContent
              decreaseLabel="-10%"
              increaseLabel="+10%"
              label="界面缩放"
              onDecrease={() => {
                runSettingsAction(
                  "decrease desktop zoom factor",
                  updateAndSave((currentPreferences) => ({
                    ...currentPreferences,
                    appearance: {
                      ...currentPreferences.appearance,
                      zoomFactor: clampZoomFactor(currentPreferences.appearance.zoomFactor - 0.1),
                    },
                  })),
                );
              }}
              onIncrease={() => {
                runSettingsAction(
                  "increase desktop zoom factor",
                  updateAndSave((currentPreferences) => ({
                    ...currentPreferences,
                    appearance: {
                      ...currentPreferences.appearance,
                      zoomFactor: clampZoomFactor(currentPreferences.appearance.zoomFactor + 0.1),
                    },
                  })),
                );
              }}
              valueLabel={formatZoomFactor(preferences.appearance.zoomFactor)}
            />
          </NativeListItem>
        </NativeListSection>

        <NativeListSection>
          <NativeListItem>
            <SettingsSummaryActionRow
              actionLabel="重置"
              description={`${formatZoomFactor(preferences.appearance.zoomFactor)}，仅桌面 Tauri 生效`}
              onPress={() => {
                runSettingsAction(
                  "reset desktop zoom factor",
                  updateAndSave((currentPreferences) => ({
                    ...currentPreferences,
                    appearance: {
                      ...currentPreferences.appearance,
                      zoomFactor: 1,
                    },
                  })),
                );
              }}
              title="当前桌面缩放"
            />
          </NativeListItem>
        </NativeListSection>
      </NativeList>
    </View>
  );
}

export function WindowSettingsPanel() {
  const { preferences, updateAndSave } = useUiPreferences();

  return (
    <View style={styles.inlineSectionList}>
      <NativeList>
        <NativeListSection title="启动行为">
          <NativeListSwitchItem
            switchProps={{
              checked: preferences.window.restoreWindowState,
              onCheckedChange: (nextValue) => {
                runSettingsAction(
                  "toggle restore window state",
                  updateAndSave((currentPreferences) => ({
                    ...currentPreferences,
                    window: {
                      ...currentPreferences.window,
                      restoreWindowState: nextValue,
                    },
                  })),
                );
              },
            }}
            title="恢复上次窗口状态"
          />
        </NativeListSection>

        <NativeListSection>
          <NativeListItem>
            <SettingsSummaryActionRow
              actionLabel="清除"
              description={formatWindowStateSummary(preferences.window.lastWindowState)}
              onPress={() => {
                runSettingsAction(
                  "clear saved window state",
                  updateAndSave((currentPreferences) => ({
                    ...currentPreferences,
                    window: {
                      ...currentPreferences.window,
                      lastWindowState: null,
                    },
                  })),
                );
              }}
              title="最近保存的窗口状态"
            />
          </NativeListItem>
        </NativeListSection>
      </NativeList>
    </View>
  );
}

const styles = StyleSheet.create({
  badge: {
    alignSelf: "flex-start",
    borderRadius: 999,
    borderWidth: 1,
    paddingHorizontal: 12,
    paddingVertical: 4,
  },
  badgeError: {
    backgroundColor: "rgba(239, 68, 68, 0.08)",
    borderColor: "rgba(239, 68, 68, 0.25)",
  },
  badgeNeutral: {
    backgroundColor: "rgba(128, 128, 128, 0.08)",
    borderColor: "rgba(128, 128, 128, 0.24)",
  },
  buttonRow: {
    flexDirection: "row",
    gap: 8,
  },
  customRow: {
    alignItems: "center",
    flexDirection: "row",
    gap: 12,
    justifyContent: "space-between",
    width: "100%",
  },
  customRowText: {
    flex: 1,
    gap: 4,
    minWidth: 0,
  },
  syncState: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: 8,
    marginBottom: 16,
  },
  inlineSectionList: {
    flex: 1,
    gap: 16,
    minHeight: 0,
  },
});
