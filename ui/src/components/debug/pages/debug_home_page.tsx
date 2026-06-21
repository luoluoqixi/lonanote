import { Maximize2, Minimize2 } from "@tamagui/lucide-icons-2";
import { useEffect, useState } from "react";
import { StyleSheet, View } from "react-native";

import {
  NativeList,
  NativeListItem,
  NativeListNavigationItem,
  NativeListSection,
  NativeListSelectItem,
  NativeListSwitchItem,
  Slider,
} from "@/components/ui";

import {
  DEBUG_NESTED_SECTION_DETENT_LEVEL_MAX,
  DEBUG_NESTED_SECTION_DETENT_LEVEL_MIN,
  getDebugSectionSheetDismissVersion,
  openDebugSection,
  resizeDebugSectionSheets,
  setDebugNestedSectionDetentLevel,
  setDebugSectionsAsNestedSheets,
  subscribeDebugSectionSheetDismiss,
  useDebugNestedSectionDetentLevel,
  useDebugSectionsAsNestedSheets,
} from "../debug_panel_sheet_state";
import { DEBUG_PANEL_ROUTE_DEFINITIONS, type DebugTabKey } from "../routes";

export function DebugHomePage({
  currentSheetMode,
  onOpenFullPage,
  onOpenPanel,
  onSheetModeChange,
}: {
  currentSheetMode?: "fullPage" | "trueSheet";
  onOpenFullPage?: (key: DebugTabKey) => void;
  onOpenPanel?: (key: DebugTabKey) => void;
  onSheetModeChange?: (mode: "fullPage" | "trueSheet") => void;
}) {
  const nestedSectionSheetsFromStore = useDebugSectionsAsNestedSheets();
  const [nestedSectionSheets, setNestedSectionSheets] = useState(nestedSectionSheetsFromStore);
  const [dismissVersion, setDismissVersion] = useState(getDebugSectionSheetDismissVersion);
  const nestedSectionDetentLevel = useDebugNestedSectionDetentLevel();
  const [useNativeList, setUseNativeList] = useState(true);
  const inTrueSheet = onOpenPanel != null;

  useEffect(() => {
    setNestedSectionSheets(nestedSectionSheetsFromStore);
  }, [nestedSectionSheetsFromStore]);

  useEffect(() => {
    const unsubscribe = subscribeDebugSectionSheetDismiss(() =>
      setDismissVersion(getDebugSectionSheetDismissVersion()),
    );

    return unsubscribe;
  }, []);

  const handleNestedSheetsChange = (enabled: boolean) => {
    setNestedSectionSheets(enabled);
    setDebugSectionsAsNestedSheets(enabled);
  };

  const handleOpenSection = async (key: DebugTabKey) => {
    if (await openDebugSection(key)) {
      return;
    }

    if (inTrueSheet) {
      onOpenPanel?.(key);
      return;
    }

    onOpenFullPage?.(key);
  };

  return (
    <NativeList native={useNativeList} scrollable={!inTrueSheet || useNativeList}>
      <NativeListSection title="调试分区">
        {DEBUG_PANEL_ROUTE_DEFINITIONS.map((definition) => (
          <NativeListNavigationItem
            key={definition.key}
            disabled={
              nestedSectionSheets
                ? false
                : inTrueSheet
                  ? onOpenPanel == null
                  : onOpenFullPage == null
            }
            onPress={() => void handleOpenSection(definition.key)}
            subtitle={definition.description}
            title={definition.label}
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
          title="分区嵌套 True Sheet"
        />
        {nestedSectionSheets ? (
          <NativeListItem>
            <View style={styles.detentSliderRow}>
              <Minimize2 color="$color10" size={18} />
              <View style={styles.detentSliderControl}>
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
              </View>
              <Maximize2 color="$color10" size={18} />
            </View>
          </NativeListItem>
        ) : null}
      </NativeListSection>

      {onSheetModeChange != null ? (
        <NativeListSection title="展示模式">
          <NativeListSelectItem
            selectProps={{
              items: [
                { label: "普通页面", value: "fullPage" },
                { label: "TrueSheet", value: "trueSheet" },
              ],
              onValueChange: (value) => {
                if (value === "fullPage" && currentSheetMode !== "fullPage") {
                  onSheetModeChange("fullPage");
                } else if (value !== currentSheetMode) {
                  onSheetModeChange(value as "trueSheet" | "fullPage");
                }
              },
              placeholder: "选择模式",
              value: currentSheetMode ?? "trueSheet",
            }}
            title="调试面板模式"
          />
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
  );
}

const styles = StyleSheet.create({
  detentSliderControl: {
    flex: 1,
    minWidth: 0,
  },
  detentSliderRow: {
    alignItems: "center",
    flexDirection: "row",
    gap: 12,
    width: "100%",
  },
});
