import { useEffect, useState } from "react";
import { StyleSheet, View } from "react-native";
import {
  Button,
  NativeListCustomItem,
  NativeListSection,
  NativeListSwitchItem,
  Slider,
  Text,
} from "rn-ui-kit";

import { isDesktop, isTauri } from "@/api/common/platform";
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
  const supportsNativeDialogs = isDesktop() && isTauri();
  const [zoomDraft, setZoomDraft] = useState(view.zoom);
  useEffect(() => setZoomDraft(view.zoom), [view.zoom]);

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
                  {Math.round(zoomDraft * 100)}%
                </Text>
                <Slider
                  accessibilityLabel="界面缩放"
                  maxValue={3}
                  minValue={0.25}
                  native
                  onValueChange={(nextValue) => setZoomDraft(nextValue[0] ?? view.zoom)}
                  onValueChangeFinished={(nextValue) => {
                    const nextZoom = nextValue[0] ?? view.zoom;
                    setZoomDraft(nextZoom);
                    runSettingsAction(
                      "调整界面缩放",
                      updateAndSave((currentPreferences) => ({
                        ...currentPreferences,
                        appearance: {
                          ...currentPreferences.appearance,
                          zoomFactor: nextZoom,
                        },
                      })),
                    );
                  }}
                  step={0.015}
                  style={styles.zoomSlider}
                  value={[zoomDraft]}
                />
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
                  variant="ghost"
                  textClassName="text-accent"
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
              isSelected: view.fullscreen,
              isDisabled: !view.fullscreenReady,
              onSelectedChange: (next) => runSettingsAction("切换全屏", view.setFullscreen(next)),
            }}
          />
        </NativeListSection>
      ) : null}
      <NativeListSection {...presentation.section} title="启动行为">
        <NativeListSwitchItem
          {...presentation.item}
          switchProps={{
            ...presentation.switch,
            isSelected: preferences.window.rememberSize,
            onSelectedChange: (nextValue) => {
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
      {supportsNativeDialogs ? (
        <NativeListSection {...presentation.section} title="窗口交互">
          <NativeListSwitchItem
            {...presentation.item}
            title="原生弹窗"
            switchProps={{
              ...presentation.switch,
              isSelected: preferences.window.nativeDialogs,
              onSelectedChange: (nextValue) => {
                runSettingsAction(
                  "切换原生弹窗",
                  updateAndSave((currentPreferences) => ({
                    ...currentPreferences,
                    window: {
                      ...currentPreferences.window,
                      nativeDialogs: nextValue,
                    },
                  })),
                );
              },
            }}
          />
        </NativeListSection>
      ) : null}

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
              variant="ghost"
              textClassName="text-accent"
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
  zoomSlider: { width: 140 },
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
