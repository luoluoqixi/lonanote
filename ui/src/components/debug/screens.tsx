import { useEffect, useState } from "react";
import { StyleSheet, View, type ViewStyle } from "react-native";

import { NativeList, NativeListSection, NativeListItem, NativeListNavigationItem, NativeListSwitchItem, Select, Slider, Switch, Text } from "../ui";
import {
  DEBUG_PANEL_ROUTE_DEFINITIONS,
  type DebugTabKey,
  getDebugPanelRouteDefinition,
} from "./routes";
import {
  getDebugNestedSectionDetentLabel,
  getDebugSectionSheetDismissVersion,
  openDebugSection,
  resizeDebugSectionSheets,
  setDebugNestedSectionDetentLevel,
  setDebugSectionsAsNestedSheets,
  subscribeDebugSectionSheetDismiss,
} from "./true_sheet/api";
import {
  DEBUG_NESTED_SECTION_DETENT_LEVEL_MAX,
  DEBUG_NESTED_SECTION_DETENT_LEVEL_MIN,
} from "./true_sheet/nested_section_sheet_layout";
import {
  useDebugNestedSectionDetentLevel,
  useDebugSectionsAsNestedSheets,
} from "./true_sheet/nested_sections_preferences";

type DebugScreenLayoutHost = "screen" | "trueSheet";

function DebugScreenLayout({
  children,
  layoutHost = "screen",
  trueSheetBodyStyle,
}: {
  children: React.ReactNode;
  layoutHost?: DebugScreenLayoutHost;
  trueSheetBodyStyle?: ViewStyle;
}) {
  if (layoutHost === "trueSheet") {
    return <View style={[styles.trueSheetBody, trueSheetBodyStyle]}>{children}</View>;
  }
  return <>{children}</>;
}

export function DebugHomeScreen({
  onOpenPanel,
  onOpenFullPage,
  currentSheetMode,
  onSheetModeChange,
}: {
  onOpenPanel?: (key: DebugTabKey) => void;
  onOpenFullPage?: (key: DebugTabKey) => void;
  currentSheetMode?: "fullPage" | "trueSheet";
  onSheetModeChange?: (mode: "fullPage" | "trueSheet") => void;
}) {
  const nestedSectionSheetsFromStore = useDebugSectionsAsNestedSheets();
  const [nestedSectionSheets, setNestedSectionSheets] = useState(nestedSectionSheetsFromStore);
  const [dismissVersion, setDismissVersion] = useState(getDebugSectionSheetDismissVersion);
  const nestedSectionDetentLevel = useDebugNestedSectionDetentLevel();
  const [useNativeList, setUseNativeList] = useState(true);
  const inTrueSheet = onOpenPanel != null;
  const inFullPageRoute = onOpenFullPage != null && onOpenPanel == null;
  const layoutHost: DebugScreenLayoutHost = inTrueSheet ? "trueSheet" : "screen";

  useEffect(() => { setNestedSectionSheets(nestedSectionSheetsFromStore); }, [nestedSectionSheetsFromStore]);
  useEffect(() => {
    const unsub = subscribeDebugSectionSheetDismiss(() => setDismissVersion(getDebugSectionSheetDismissVersion()));
    return unsub;
  }, []);

  const handleNestedSheetsChange = (enabled: boolean) => {
    setNestedSectionSheets(enabled);
    setDebugSectionsAsNestedSheets(enabled);
  };

  const openSection = async (key: DebugTabKey) => {
    if (await openDebugSection(key)) return;
    if (inTrueSheet) { onOpenPanel?.(key); return; }
    onOpenFullPage?.(key);
  };

  return (
    <DebugScreenLayout layoutHost={layoutHost}>
      <NativeList native={useNativeList}>
        <NativeListSection title="调试分区">
          {DEBUG_PANEL_ROUTE_DEFINITIONS.map((def) => (
            <NativeListNavigationItem
              key={def.key}
              disabled={nestedSectionSheets ? false : inTrueSheet ? onOpenPanel == null : onOpenFullPage == null}
              onPress={() => void openSection(def.key)}
              subtitle={def.description}
              title={def.label}
            />
          ))}
        </NativeListSection>

        <NativeListSection title="分区行为">
          <NativeListSwitchItem
            key={`nested-sheets-switch-${dismissVersion}`}
            switchProps={{
              checked: nestedSectionSheets,
              onCheckedChange: handleNestedSheetsChange,
            }}
            subtitle="开启后，工作区 / 路径 / 组件总览均以独立 True Sheet 打开"
            title="分区嵌套 True Sheet"
          />
        </NativeListSection>

        {nestedSectionSheets ? (
          <NativeListSection title="Sheet 高度">
            <NativeListItem>
              <Text fontSize="$5" fontWeight="600">嵌套 Sheet 高度</Text>
              <Text color="$color10" fontSize="$3">
                三档 detent：偏低、中等、全屏。拖动滑条会实时 resize 已打开的分区 Sheet。
              </Text>
              <Slider
                max={DEBUG_NESTED_SECTION_DETENT_LEVEL_MAX}
                min={DEBUG_NESTED_SECTION_DETENT_LEVEL_MIN}
                onValueChange={(nextValue: number[]) => {
                  const level = nextValue[0] ?? 0;
                  setDebugNestedSectionDetentLevel(level);
                  void resizeDebugSectionSheets(level);
                }}
                step={1}
                value={[nestedSectionDetentLevel]}
              />
              <Text color="$color10" fontSize="$3">
                当前：{getDebugNestedSectionDetentLabel(nestedSectionDetentLevel)}
              </Text>
            </NativeListItem>
          </NativeListSection>
        ) : null}

        {onSheetModeChange != null ? (
          <NativeListSection title="展示模式">
            <NativeListItem>
              <Text fontSize="$5" fontWeight="600">调试面板模式</Text>
              <Text color="$color10" fontSize="$3">切换调试面板的弹出方式。</Text>
              <Select
                items={[
                  { label: "普通页面", value: "fullPage" },
                  { label: "TrueSheet", value: "trueSheet" },
                ]}
                onValueChange={(value) => {
                  if (value === "fullPage" && currentSheetMode !== "fullPage") {
                    onSheetModeChange("fullPage");
                  } else if (value !== currentSheetMode) {
                    onSheetModeChange(value as "trueSheet" | "fullPage");
                  }
                }}
                placeholder="选择模式"
                value={currentSheetMode ?? "trueSheet"}
              />
            </NativeListItem>
          </NativeListSection>
        ) : null}

        <NativeListSection title="展示模式">
          <NativeListSwitchItem
            switchProps={{
              checked: useNativeList,
              onCheckedChange: setUseNativeList,
            }}
            subtitle="关闭后 iOS 使用 list_group 回退模式"
            title="使用原生列表"
          />
        </NativeListSection>
      </NativeList>
    </DebugScreenLayout>
  );
}

export function DebugSectionScreen({
  layoutHost = "screen",
  sectionKey,
  trueSheetCompact = false,
}: {
  layoutHost?: DebugScreenLayoutHost;
  sectionKey: DebugTabKey;
  trueSheetCompact?: boolean;
}) {
  const definition = getDebugPanelRouteDefinition(sectionKey);
  const SectionComponent = definition.Component;

  return (
    <DebugScreenLayout layoutHost={layoutHost} trueSheetBodyStyle={trueSheetCompact ? styles.trueSheetBodyCompact : undefined}>
      <SectionComponent />
    </DebugScreenLayout>
  );
}

const styles = StyleSheet.create({
  trueSheetBody: {
    flex: 1,
    alignSelf: "center",
    maxWidth: 960,
    paddingBottom: 24,
    paddingHorizontal: 20,
    paddingTop: 8,
    width: "100%",
  },
  trueSheetBodyCompact: {},
});
