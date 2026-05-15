import { Pressable, Text, View } from "react-native";

import type { GlobalSettings } from "@/api/commands/settings";
import {
  clampZoomFactor,
  getAccentColorPreset,
  useColorSchemeSettings,
  useGlobalSettings,
  useUiPreferences,
} from "@/hooks/settings";
import type { AccentColorSetting, ColorSchemeSetting } from "@/stores/ui";

import { Button, IconButton, Select, type SelectOption, Switch } from "../ui";

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
  const className =
    tone === "error"
      ? "border-red-500/20 bg-red-500/10 text-red-600"
      : tone === "loading"
        ? "border-accent/20 bg-accent/10 text-accent"
        : "border-foreground/10 bg-background text-foreground/70";

  return (
    <View className={`rounded-full border px-3 py-1 ${className}`}>
      <Text className="text-xs font-medium">{children}</Text>
    </View>
  );
}

type SectionProps = {
  children: React.ReactNode;
  title: string;
};

function SettingsSection({ children, title }: SectionProps) {
  return (
    <View className="rounded-3xl border border-foreground/10 bg-background px-4 py-4">
      <View className="mb-3 px-1">
        <Text className="text-lg font-semibold text-foreground">{title}</Text>
      </View>
      <View className="gap-3">{children}</View>
    </View>
  );
}

type LinkCardProps = {
  onPress: () => void;
  summary: string;
  title: string;
};

function SettingsLinkCard({ onPress, summary, title }: LinkCardProps) {
  return (
    <Pressable
      className="rounded-2xl border border-foreground/10 bg-background px-4 py-4 active:opacity-90"
      onPress={onPress}
    >
      <View className="flex-row items-center gap-3">
        <Text className="flex-1 text-base font-medium text-foreground">{title}</Text>
        <Text className="max-w-36 text-right text-sm text-foreground/70">{summary}</Text>
      </View>
    </Pressable>
  );
}

type ToggleRowProps = {
  label: string;
  onChange: (nextValue: boolean) => void;
  value: boolean;
};

function SettingsToggleRow({ label, onChange, value }: ToggleRowProps) {
  return (
    <View className="rounded-2xl border border-foreground/10 bg-background px-4 py-4">
      <View className="flex-row items-center gap-4">
        <Text className="flex-1 text-base font-medium text-foreground">{label}</Text>
        <View className="flex-row items-center gap-3">
          <Text
            className={value ? "text-sm font-medium text-accent" : "text-sm text-foreground/70"}
          >
            {value ? "已开启" : "已关闭"}
          </Text>
          <Switch accessibilityLabel={label} onValueChange={onChange} value={value} />
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
    <View className="rounded-2xl border border-foreground/10 bg-background px-4 py-4">
      <View className="flex-row items-center justify-between gap-3">
        <View className="gap-1">
          <Text className="text-base font-medium text-foreground">{label}</Text>
          <Text className="text-sm text-foreground/65">{valueLabel}</Text>
        </View>
        <View className="flex-row gap-2">
          <IconButton
            accessibilityLabel={`${label}${decreaseLabel}`}
            onPress={onDecrease}
            size="sm"
            variant="outline"
          >
            <Text className="text-base font-semibold text-foreground">-</Text>
          </IconButton>
          <IconButton
            accessibilityLabel={`${label}${increaseLabel}`}
            onPress={onIncrease}
            size="sm"
            variant="outline"
          >
            <Text className="text-base font-semibold text-foreground">+</Text>
          </IconButton>
        </View>
      </View>
    </View>
  );
}

type OptionGroupProps = {
  onSelect: (value: ColorSchemeSetting) => void;
  selectedValue: ColorSchemeSetting;
};

type SettingsSelectRowProps<T extends string> = {
  label: string;
  onSelect: (value: T) => void;
  options: SelectOption<T>[];
  placeholder: string;
  selectedValue: T;
};

function SettingsSelectRow<T extends string>({
  label,
  onSelect,
  options,
  placeholder,
  selectedValue,
}: SettingsSelectRowProps<T>) {
  const selectedOption = options.find((option) => option.value === selectedValue);

  return (
    <View className="rounded-2xl border border-foreground/10 bg-background px-4 py-4">
      <View className="flex-row items-center justify-between gap-3">
        <Text className="text-base font-medium text-foreground">{label}</Text>
        <View className="w-44 max-w-[60%]">
          <Select
            accessibilityLabel={label}
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
  const options: SelectOption<ColorSchemeSetting>[] = [
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
  onSelect: (value: AccentColorSetting) => void;
  selectedValue: AccentColorSetting;
};

function AccentColorOptionGroup({ onSelect, selectedValue }: AccentColorOptionGroupProps) {
  const options: SelectOption<AccentColorSetting>[] = (
    ["blue", "emerald", "orange", "rose"] as AccentColorSetting[]
  ).map((option) => {
    const preset = getAccentColorPreset(option);

    return {
      label: preset.label,
      startContent: (
        <View className="h-3 w-3 rounded-full" style={{ backgroundColor: preset.accent }} />
      ),
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
    <View className="mb-4 flex-row flex-wrap gap-2">
      {isLoading ? <SettingsStatusBadge tone="loading">正在同步设置</SettingsStatusBadge> : null}
      {error ? <SettingsStatusBadge tone="error">{error}</SettingsStatusBadge> : null}
    </View>
  );
}

type GlobalSettingsPanelProps = {
  onSelectTab?: (tab: SettingsTabKey) => void;
  showNavigation?: boolean;
};

export function GlobalSettingsPanel({
  onSelectTab,
  showNavigation = false,
}: GlobalSettingsPanelProps) {
  const { settings, updateAndSave } = useGlobalSettings();
  const { preferences } = useUiPreferences();

  return (
    <View className="gap-4">
      {showNavigation ? (
        <SettingsSection title="分类">
          <SettingsLinkCard
            onPress={() => onSelectTab?.("appearance")}
            summary={`${preferences.appearance.themeMode} / ${formatAccentColor(preferences.appearance.accentColor)}`}
            title="外观"
          />
          <SettingsLinkCard
            onPress={() => onSelectTab?.("window")}
            summary={preferences.window.restoreWindowState ? "恢复上次状态" : "默认窗口状态"}
            title="窗口"
          />
        </SettingsSection>
      ) : null}

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
    <View className="gap-4">
      <SettingsSection title="主题">
        <AccentColorOptionGroup
          onSelect={(nextValue) => {
            runSettingsAction(
              "set accent color",
              updateAndSave((currentPreferences) => ({
                ...currentPreferences,
                appearance: {
                  ...currentPreferences.appearance,
                  accentColor: nextValue,
                },
              })),
            );
          }}
          selectedValue={preferences.appearance.accentColor}
        />
        <ColorSchemeOptionGroup
          onSelect={(nextValue) => {
            runSettingsAction(
              "set preferred color scheme",
              setPreferredColorSchemeAndSave(nextValue),
            );
          }}
          selectedValue={preferredColorScheme}
        />
        <View className="rounded-2xl border border-foreground/10 bg-background px-4 py-4">
          <Text className="text-sm text-foreground/65">
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
        <View className="rounded-2xl border border-foreground/10 bg-background px-4 py-4">
          <View className="flex-row items-center justify-between gap-3">
            <View className="flex-1 gap-1">
              <Text className="text-base font-medium text-foreground">当前桌面缩放</Text>
              <Text className="text-sm text-foreground/65">
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
              size="sm"
              variant="outline"
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
    <View className="gap-4">
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
        <View className="rounded-2xl border border-foreground/10 bg-background px-4 py-4">
          <View className="flex-row items-center justify-between gap-3">
            <View className="flex-1 gap-1">
              <Text className="text-base font-medium text-foreground">最近保存的窗口状态</Text>
              <Text className="text-sm text-foreground/65">
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
              size="sm"
              variant="outline"
            >
              清除
            </Button>
          </View>
        </View>
      </SettingsSection>
    </View>
  );
}
