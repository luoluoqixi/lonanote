import { StyleSheet, View } from "react-native";
import {
  Button,
  NativeListCustomItem,
  NativeListSection,
  NativeListSwitchItem,
  Text,
} from "rn-ui-kit";

import { useUiPreferences } from "@/hooks/settings";
import { useDesktopViewActions } from "@/hooks/settings/use_desktop_view_actions";
import type { DesktopWindowSize } from "@/stores/ui";

import type { SettingsPageProps } from "../settings_config";
import { SettingsList } from "../settings_list";
import { useSettingsPresentation } from "../use_settings_presentation";

function runSettingsAction(scope: string, action: Promise<unknown>) {
  void action.catch((error) => {
    console.error(`[settings] ${scope} failed`, error);
  });
}

function formatWindowStateSummary(windowState: DesktopWindowSize | null): string {
  if (!windowState) {
    return "暂无记录";
  }

  return `${Math.round(windowState.width)} × ${Math.round(windowState.height)}`;
}

export function WindowSettingsPage({
  tracksNavigationBarScrollEdge = false,
}: SettingsPageProps = {}) {
  const presentation = useSettingsPresentation();
  const { preferences, updateAndSave } = useUiPreferences();
  const view = useDesktopViewActions();

  return (
    <SettingsList style={{ flex: 1 }} tracksNavigationBarScrollEdge={tracksNavigationBarScrollEdge}>
      {view.supported ? (
        <NativeListSection {...presentation.section} title="窗口显示">
          <NativeListCustomItem {...presentation.item}>
            <View style={styles.row}>
              <View style={styles.rowText}>
                <Text className="font-medium" style={{ fontSize: presentation.compact ? 13 : 16 }}>
                  界面缩放等级
                </Text>
              </View>
              <View style={styles.zoomControls}>
                <Button
                  size="sm"
                  variant="ghost"
                  accessibilityLabel="缩小界面"
                  disabled={!view.canZoomOut}
                  onPress={() => runSettingsAction("缩小界面", view.zoomOut())}
                >
                  −
                </Button>
                <Text style={{ minWidth: 48, textAlign: "center" }}>
                  {Math.round(view.zoom * 100)}%
                </Text>
                <Button
                  size="sm"
                  variant="ghost"
                  accessibilityLabel="放大界面"
                  disabled={!view.canZoomIn}
                  onPress={() => runSettingsAction("放大界面", view.zoomIn())}
                >
                  +
                </Button>
                <Button
                  size="sm"
                  variant="link"
                  disabled={view.zoom === 1}
                  onPress={() => runSettingsAction("重置界面缩放", view.resetZoom())}
                >
                  重置
                </Button>
              </View>
            </View>
          </NativeListCustomItem>
          <NativeListSwitchItem
            {...presentation.item}
            title="全屏"
            switchProps={{
              ...presentation.switch,
              checked: view.fullscreen,
              disabled: !view.fullscreenReady,
              onCheckedChange: (next) => runSettingsAction("切换全屏", view.setFullscreen(next)),
            }}
          />
        </NativeListSection>
      ) : null}
      <NativeListSection {...presentation.section} title="启动行为">
        <NativeListSwitchItem
          {...presentation.item}
          switchProps={{
            ...presentation.switch,
            checked: preferences.window.rememberSize,
            onCheckedChange: (nextValue) => {
              runSettingsAction(
                "切换窗口尺寸记忆",
                updateAndSave((currentPreferences) => ({
                  ...currentPreferences,
                  window: {
                    ...currentPreferences.window,
                    rememberSize: nextValue,
                  },
                })),
              );
            },
          }}
          title="记住窗口尺寸"
        />
      </NativeListSection>

      <NativeListSection {...presentation.section}>
        <NativeListCustomItem {...presentation.item}>
          <View style={styles.row}>
            <View style={styles.rowText}>
              <Text className="font-medium" style={{ fontSize: presentation.compact ? 13 : 16 }}>
                最近保存的窗口尺寸
              </Text>
              <Text
                className="text-sm text-foreground/60"
                style={{ userSelect: "text", fontSize: presentation.compact ? 12 : 14 }}
              >
                {formatWindowStateSummary(preferences.window.lastSize)}
              </Text>
            </View>
            <Button
              size="sm"
              variant="link"
              onPress={() => {
                runSettingsAction(
                  "清除保存的窗口尺寸",
                  updateAndSave((currentPreferences) => ({
                    ...currentPreferences,
                    window: {
                      ...currentPreferences.window,
                      lastSize: null,
                    },
                  })),
                );
              }}
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
  zoomControls: { flexDirection: "row", alignItems: "center", gap: 8, flexWrap: "wrap" },
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
