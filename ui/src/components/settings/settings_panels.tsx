import { StyleSheet, View } from "react-native";

import type { GlobalSettings } from "@/api/commands/settings";
import { Button, Select, type SelectOption, Switch, Text } from "@/components/ui";
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

function formatAccentColor(accentColor: AccentColorSetting) {
  return getAccentColorPreset(accentColor).label;
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

type SectionProps = {
  children: React.ReactNode;
  title: string;
};

function SettingsSection({ children, title }: SectionProps) {
  return (
    <View style={styles.section}>
      <Text fontSize="$6" fontWeight="600">
        {title}
      </Text>
      <View style={styles.sectionBody}>{children}</View>
    </View>
  );
}

type ToggleRowProps = {
  label: string;
  onChange: (nextValue: boolean) => void;
  value: boolean;
};

function SettingsToggleRow({ label, onChange, value }: ToggleRowProps) {
  return (
    <View style={styles.rowCard}>
      <View style={styles.rowContent}>
        <Text fontSize="$5" fontWeight="600" style={styles.rowLabel}>
          {label}
        </Text>
        <View style={styles.inlineControls}>
          <Text color={value ? "$accentColor" : "$color10"} fontSize="$3">
            {value ? "已开启" : "已关闭"}
          </Text>
          <Switch checked={value} onCheckedChange={onChange} />
        </View>
      </View>
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

function SettingsStepperRow({
  decreaseLabel = "-0.5s",
  increaseLabel = "+0.5s",
  label,
  onDecrease,
  onIncrease,
  valueLabel,
}: StepperRowProps) {
  return (
    <View style={styles.rowCard}>
      <View style={styles.rowContent}>
        <View style={styles.rowTextGroup}>
          <Text fontSize="$5" fontWeight="600">
            {label}
          </Text>
          <Text color="$color10" fontSize="$3">
            {valueLabel}
          </Text>
        </View>
        <View style={styles.inlineControls}>
          <Button aria-label={`${label}${decreaseLabel}`} onPress={onDecrease} variant="outlined">
            -
          </Button>
          <Button aria-label={`${label}${increaseLabel}`} onPress={onIncrease} variant="outlined">
            +
          </Button>
        </View>
      </View>
    </View>
  );
}

type OptionGroupProps = {
  onSelect: (value: string | null) => void;
  selectedValue: ColorSchemeSetting;
};

type SettingsSelectRowProps = {
  label: string;
  onSelect: (value: string | null) => void;
  options: SelectOption[];
  placeholder: string;
  selectedValue: string;
};

function SettingsSelectRow({
  label,
  onSelect,
  options,
  placeholder,
  selectedValue,
}: SettingsSelectRowProps) {
  const selectedOption = options.find((option) => option.value === selectedValue);

  return (
    <View style={styles.rowCard}>
      <View style={styles.rowContent}>
        <Text fontSize="$5" fontWeight="600" style={styles.rowLabel}>
          {label}
        </Text>
        <View style={styles.selectBox}>
          <Select
            aria-label={label}
            onValueChange={onSelect}
            options={options}
            placeholder={placeholder}
            value={selectedOption?.value}
          />
        </View>
      </View>
    </View>
  );
}

function ColorSchemeOptionGroup({ onSelect, selectedValue }: OptionGroupProps) {
  const options: SelectOption[] = [
    { label: "浅色", value: "light" },
    { label: "深色", value: "dark" },
    { label: "跟随系统", value: "system" },
  ];

  return (
    <SettingsSelectRow
      label="主题模式"
      onSelect={onSelect}
      options={options}
      placeholder="选择主题模式"
      selectedValue={selectedValue}
    />
  );
}

type AccentColorOptionGroupProps = {
  onSelect: (value: string | null) => void;
  selectedValue: string;
};

function AccentColorOptionGroup({ onSelect, selectedValue }: AccentColorOptionGroupProps) {
  const options: SelectOption[] = (
    ["blue", "emerald", "orange", "rose"] as AccentColorSetting[]
  ).map((option) => {
    const preset = getAccentColorPreset(option);

    return {
      label: preset.label,
      startContent: <View style={[styles.colorSwatch, { backgroundColor: preset.accent }]} />,
      value: option,
    };
  });

  return (
    <SettingsSelectRow
      label="主题色"
      onSelect={onSelect}
      options={options}
      placeholder="选择主题色"
      selectedValue={selectedValue}
    />
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
    <View style={styles.panel}>
      <SettingsSection title="应用行为">
        <SettingsToggleRow
          label="自动检查更新"
          onChange={(nextValue) => {
            runSettingsAction(
              "toggle auto check update",
              updateAndSave((currentSettings) =>
                updateSettingsSection(currentSettings, "app", {
                  ...currentSettings.app,
                  autoCheckUpdate: nextValue,
                }),
              ),
            );
          }}
          value={settings.app.autoCheckUpdate}
        />
        <SettingsToggleRow
          label="自动打开上次工作区"
          onChange={(nextValue) => {
            runSettingsAction(
              "toggle auto open last workspace",
              updateAndSave((currentSettings) =>
                updateSettingsSection(currentSettings, "app", {
                  ...currentSettings.app,
                  autoOpenLastWorkspace: nextValue,
                }),
              ),
            );
          }}
          value={settings.app.autoOpenLastWorkspace}
        />
      </SettingsSection>

      <SettingsSection title="编辑器默认值">
        <SettingsToggleRow
          label="自动保存"
          onChange={(nextValue) => {
            runSettingsAction(
              "toggle auto save",
              updateAndSave((currentSettings) =>
                updateSettingsSection(currentSettings, "editorDefaults", {
                  ...currentSettings.editorDefaults,
                  autoSave: nextValue,
                }),
              ),
            );
          }}
          value={settings.editorDefaults.autoSave}
        />
        <SettingsStepperRow
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
        <SettingsToggleRow
          label="失焦时自动保存"
          onChange={(nextValue) => {
            runSettingsAction(
              "toggle focus auto save",
              updateAndSave((currentSettings) =>
                updateSettingsSection(currentSettings, "editorDefaults", {
                  ...currentSettings.editorDefaults,
                  autoSaveOnFocusChange: nextValue,
                }),
              ),
            );
          }}
          value={settings.editorDefaults.autoSaveOnFocusChange}
        />
        <SettingsToggleRow
          label="显示行号"
          onChange={(nextValue) => {
            runSettingsAction(
              "toggle show line number",
              updateAndSave((currentSettings) =>
                updateSettingsSection(currentSettings, "editorDefaults", {
                  ...currentSettings.editorDefaults,
                  showLineNumber: nextValue,
                }),
              ),
            );
          }}
          value={settings.editorDefaults.showLineNumber}
        />
        <SettingsToggleRow
          label="禁用自动换行"
          onChange={(nextValue) => {
            runSettingsAction(
              "toggle line wrap",
              updateAndSave((currentSettings) =>
                updateSettingsSection(currentSettings, "editorDefaults", {
                  ...currentSettings.editorDefaults,
                  disableLineWrap: nextValue,
                }),
              ),
            );
          }}
          value={settings.editorDefaults.disableLineWrap}
        />
        <SettingsToggleRow
          label="源码模式"
          onChange={(nextValue) => {
            runSettingsAction(
              "toggle source mode",
              updateAndSave((currentSettings) =>
                updateSettingsSection(currentSettings, "editorDefaults", {
                  ...currentSettings.editorDefaults,
                  sourceMode: nextValue,
                }),
              ),
            );
          }}
          value={settings.editorDefaults.sourceMode}
        />
      </SettingsSection>
    </View>
  );
}

export function AppearanceSettingsPanel() {
  const {
    preferredColorScheme,
    resolvedColorScheme,
    setPreferredColorSchemeAndSave,
    systemColorScheme,
  } = useColorSchemeSettings();
  const { preferences, updateAndSave } = useUiPreferences();

  return (
    <View style={styles.panel}>
      <SettingsSection title="主题">
        <AccentColorOptionGroup
          onSelect={(nextValue) => {
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
          }}
          selectedValue={preferences.appearance.accentColor}
        />
        <ColorSchemeOptionGroup
          onSelect={(nextValue) => {
            if (nextValue == null) return;
            runSettingsAction(
              "set preferred color scheme",
              setPreferredColorSchemeAndSave(nextValue as ColorSchemeSetting),
            );
          }}
          selectedValue={preferredColorScheme}
        />
        <View style={styles.rowCard}>
          <Text color="$color10" fontSize="$3">
            系统：{systemColorScheme} / 偏好：{preferredColorScheme} / 当前：{resolvedColorScheme} /
            主题色：{formatAccentColor(preferences.appearance.accentColor)}
          </Text>
        </View>
      </SettingsSection>

      <SettingsSection title="桌面缩放">
        <SettingsStepperRow
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
        <View style={styles.rowCard}>
          <View style={styles.rowContent}>
            <View style={styles.rowTextGroup}>
              <Text fontSize="$5" fontWeight="600">
                当前桌面缩放
              </Text>
              <Text color="$color10" fontSize="$3">
                {formatZoomFactor(preferences.appearance.zoomFactor)}，仅桌面 Tauri 生效
              </Text>
            </View>
            <Button
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
              variant="outlined"
            >
              重置
            </Button>
          </View>
        </View>
      </SettingsSection>
    </View>
  );
}

export function WindowSettingsPanel() {
  const { preferences, updateAndSave } = useUiPreferences();

  return (
    <View style={styles.panel}>
      <SettingsSection title="启动行为">
        <SettingsToggleRow
          label="恢复上次窗口状态"
          onChange={(nextValue) => {
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
          }}
          value={preferences.window.restoreWindowState}
        />
        <View style={styles.rowCard}>
          <View style={styles.rowContent}>
            <View style={styles.rowTextGroup}>
              <Text fontSize="$5" fontWeight="600">
                最近保存的窗口状态
              </Text>
              <Text color="$color10" fontSize="$3">
                {formatWindowStateSummary(preferences.window.lastWindowState)}
              </Text>
            </View>
            <Button
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
              variant="outlined"
            >
              清除
            </Button>
          </View>
        </View>
      </SettingsSection>
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
  colorSwatch: {
    borderRadius: 999,
    height: 12,
    width: 12,
  },
  inlineControls: {
    alignItems: "center",
    flexDirection: "row",
    flexWrap: "wrap",
    gap: 10,
  },
  panel: {
    gap: 16,
  },
  rowCard: {
    borderColor: "rgba(128, 128, 128, 0.22)",
    borderRadius: 16,
    borderWidth: 1,
    padding: 16,
  },
  rowContent: {
    alignItems: "center",
    flexDirection: "row",
    flexWrap: "wrap",
    gap: 12,
    justifyContent: "space-between",
  },
  rowLabel: {
    flex: 1,
    minWidth: 180,
  },
  rowTextGroup: {
    flex: 1,
    gap: 4,
    minWidth: 220,
  },
  section: {
    borderColor: "rgba(128, 128, 128, 0.22)",
    borderRadius: 20,
    borderWidth: 1,
    gap: 12,
    padding: 16,
  },
  sectionBody: {
    gap: 12,
  },
  selectBox: {
    maxWidth: 260,
    minWidth: 176,
    width: "45%",
  },
  syncState: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: 8,
    marginBottom: 16,
  },
});
