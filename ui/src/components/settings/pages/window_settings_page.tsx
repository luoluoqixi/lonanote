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

import type { SettingsPageProps } from "../settings_config";
import { SettingsList } from "../settings_list";

function runSettingsAction(scope: string, action: Promise<unknown>) {
  void action.catch((error) => {
    console.error(`[settings] ${scope} failed`, error);
  });
}

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
  const summary = `${windowState.width}x${windowState.height} @ ${windowState.x}, ${windowState.y}`;

  return flags ? `${summary} (${flags})` : summary;
}

export function WindowSettingsPage({
  tracksNavigationBarScrollEdge = false,
}: SettingsPageProps = {}) {
  const { preferences, updateAndSave } = useUiPreferences();

  return (
    <SettingsList
      style={{ flex: 1 }}
      tracksNavigationBarScrollEdge={tracksNavigationBarScrollEdge}
    >
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
          <View style={styles.row}>
            <View style={styles.rowText}>
              <Text fontSize="$5" fontWeight="500">
                最近保存的窗口状态
              </Text>
              <Text color="$color" opacity={0.6} fontSize="$3" style={{ userSelect: "text" }}>
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
        </NativeListCustomItem>
      </NativeListSection>
    </SettingsList>
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
