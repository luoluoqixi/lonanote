import { StyleSheet, View } from "react-native";
import {
  Button,
  NativeListCustomItem,
  NativeListSection,
  NativeListSwitchItem,
  Text,
} from "rn-ui-kit";

import { useUiPreferences } from "@/hooks/settings";
import type { DesktopWindowState } from "@/stores/ui";

import { runSettingsAction } from "./settings_actions";
import { SettingsSectionList } from "./settings_section_list";

function formatWindowStateSummary(windowState: DesktopWindowState | null): string {
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

type SettingsSummaryActionRowProps = {
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
}: SettingsSummaryActionRowProps) {
  return (
    <View style={styles.row}>
      <View style={styles.rowText}>
        <Text fontSize="$5" fontWeight="500">
          {title}
        </Text>
        <Text color="$color" opacity={0.6} fontSize="$3">
          {description}
        </Text>
      </View>
      <Button onPress={onPress} variant="outlined">
        {actionLabel}
      </Button>
    </View>
  );
}

export function WindowSettingsPanel() {
  const { preferences, updateAndSave } = useUiPreferences();

  return (
    <SettingsSectionList>
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
        <NativeListCustomItem>
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
        </NativeListCustomItem>
      </NativeListSection>
    </SettingsSectionList>
  );
}

const styles = StyleSheet.create({
  row: {
    alignItems: "center",
    flexDirection: "row",
    gap: 12,
    justifyContent: "space-between",
    width: "100%",
  },
  rowText: {
    flex: 1,
    gap: 4,
    minWidth: 0,
  },
});
