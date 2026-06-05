import { type ReactNode, useEffect, useState } from "react";
import { ScrollView, StyleSheet, View } from "react-native";

import { isDesktop } from "@/api/common";

import { TitleBar } from "../titlebar";
import { Button, Slider, Switch, Text } from "../ui";
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

const DEBUG_SCREEN_MAX_WIDTH = 960;

type DebugScreenLayoutHost = "screen" | "trueSheet";

function DebugScreenLayout({
  children,
  description,
  hideInlineHeader = false,
  layoutHost = "screen",
  scrollable = false,
  title,
}: {
  children: ReactNode;
  description?: string;
  /** Stack 已展示原生标题栏时隐藏自绘页头，避免重复 */
  hideInlineHeader?: boolean;
  /** True Sheet 内勿用 flex:1 全屏壳，否则 Card/按钮会错位且无法点击 */
  layoutHost?: DebugScreenLayoutHost;
  scrollable?: boolean;
  title: string;
}) {
  if (layoutHost === "trueSheet") {
    return <View style={styles.trueSheetBody}>{children}</View>;
  }

  const desktop = isDesktop();
  const pageBody = (
    <View style={scrollable ? styles.pagePaddingInScroll : styles.pagePadding}>
      <View style={scrollable ? styles.pageContainerInScroll : styles.pageContainer}>
        {!hideInlineHeader ? (
          <View style={styles.header}>
            <View style={styles.headerText}>
              <Text fontSize="$8" fontWeight="700">
                {title}
              </Text>
              {description ? (
                <Text color="$color10" fontSize="$3">
                  {description}
                </Text>
              ) : null}
            </View>
          </View>
        ) : null}
        <View style={scrollable ? styles.contentInScroll : styles.content}>{children}</View>
      </View>
    </View>
  );

  return (
    <View style={styles.safeArea}>
      {desktop ? <TitleBar /> : null}
      <View style={styles.page}>
        {scrollable ? (
          <View style={styles.pageScrollHost}>
            <ScrollView
              contentContainerStyle={styles.pageScrollContent}
              nestedScrollEnabled
              showsVerticalScrollIndicator
              style={styles.pageScrollView}
            >
              {pageBody}
            </ScrollView>
          </View>
        ) : (
          pageBody
        )}
      </View>
    </View>
  );
}

export function DebugHomeScreen({
  onOpenFullPage,
  onOpenPanel,
  onSwitchToFullPage,
  onSwitchToTrueSheet,
}: {
  /** True Sheet 内打开分区 */
  onOpenPanel?: (key: DebugTabKey) => void;
  /** 全屏 Stack 打开分区（已在路由栈时无需再关 Sheet） */
  onOpenFullPage?: (key: DebugTabKey) => void;
  /** 立即关闭 Sheet 并进入 `/debug` */
  onSwitchToFullPage?: () => void;
  /** 返回并打开 True Sheet 调试面板 */
  onSwitchToTrueSheet?: () => void;
}) {
  const nestedSectionSheetsFromStore = useDebugSectionsAsNestedSheets();
  const [nestedSectionSheets, setNestedSectionSheets] = useState(nestedSectionSheetsFromStore);
  const [dismissVersion, setDismissVersion] = useState(getDebugSectionSheetDismissVersion);
  const nestedSectionDetentLevel = useDebugNestedSectionDetentLevel();
  const inTrueSheet = onOpenPanel != null;
  const inFullPageRoute = onOpenFullPage != null && onOpenPanel == null;
  const layoutHost: DebugScreenLayoutHost = inTrueSheet ? "trueSheet" : "screen";

  // 同步局部状态与全局偏好，避免 Android 上原生 modal present 时 useSyncExternalStore 时序竞态
  useEffect(() => {
    setNestedSectionSheets(nestedSectionSheetsFromStore);
  }, [nestedSectionSheetsFromStore]);

  // 监听分区 Sheet 关闭版本号，驱动 Switch key 强制 remount（解决 Android 原生 widget 视觉残留）
  useEffect(() => {
    const unsubscribe = subscribeDebugSectionSheetDismiss(() => {
      setDismissVersion(getDebugSectionSheetDismissVersion());
    });
    return unsubscribe;
  }, []);

  const handleNestedSheetsChange = (enabled: boolean) => {
    setNestedSectionSheets(enabled);
    setDebugSectionsAsNestedSheets(enabled);
  };

  const sectionCards: ReactNode[] = [];

  const openSection = async (key: DebugTabKey) => {
    if (await openDebugSection(key)) {
      return;
    }

    if (inTrueSheet) {
      onOpenPanel?.(key);
      return;
    }

    onOpenFullPage?.(key);
  };

  for (const definition of DEBUG_PANEL_ROUTE_DEFINITIONS) {
    sectionCards.push(
      <View key={definition.key} style={styles.sectionCard}>
        <View style={styles.sectionCardText}>
          <Text fontSize="$5" fontWeight="600">
            {definition.label}
          </Text>
          <Text color="$color10" fontSize="$3">
            {definition.description}
          </Text>
        </View>
        <Button
          disabled={
            nestedSectionSheets ? false : inTrueSheet ? onOpenPanel == null : onOpenFullPage == null
          }
          onPress={() => {
            void openSection(definition.key);
          }}
        >
          打开{definition.label}
        </Button>
      </View>,
    );
  }

  sectionCards.push(
    <View key="nested-section-sheets-toggle" style={styles.sectionCard}>
      <View style={styles.sectionCardText}>
        <Text fontSize="$5" fontWeight="600">
          分区嵌套 True Sheet
        </Text>
        <Text color="$color10" fontSize="$3">
          开启后，工作区 / 路径 / 组件总览均以独立 True Sheet 打开；在主页 Sheet 上可再叠一层嵌套
          Sheet，全屏页面模式下也会弹出 Sheet 而非路由跳转。
        </Text>
      </View>
      <Switch
        checked={nestedSectionSheets}
        key={`nested-sheets-switch-${dismissVersion}`}
        label="启用嵌套 Sheet"
        labelPosition="end"
        onCheckedChange={handleNestedSheetsChange}
      />
    </View>,
  );

  if (nestedSectionSheets) {
    sectionCards.push(
      <View key="nested-section-detent-slider" style={styles.sectionCard}>
        <View style={styles.sectionCardText}>
          <Text fontSize="$5" fontWeight="600">
            嵌套 Sheet 高度
          </Text>
          <Text color="$color10" fontSize="$3">
            三档 detent：偏低、中等、全屏。拖动滑条会实时 resize 已打开的分区 Sheet。
          </Text>
        </View>
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
      </View>,
    );
  }

  if (onSwitchToFullPage != null) {
    sectionCards.push(
      <View key="presentation-mode-toggle" style={styles.sectionCard}>
        <View style={styles.sectionCardText}>
          <Text fontSize="$5" fontWeight="600">
            普通页面模式
          </Text>
          <Text color="$color10" fontSize="$3">
            关闭当前 Sheet，在全屏 Stack 中继续调试。
          </Text>
        </View>
        <Button onPress={onSwitchToFullPage} variant="outlined">
          切换为普通页面
        </Button>
      </View>,
    );
  }

  if (onSwitchToTrueSheet != null) {
    sectionCards.push(
      <View key="presentation-mode-toggle" style={styles.sectionCard}>
        <View style={styles.sectionCardText}>
          <Text fontSize="$5" fontWeight="600">
            True Sheet 模式
          </Text>
          <Text color="$color10" fontSize="$3">
            返回并打开 True Sheet 调试面板。
          </Text>
        </View>
        <Button onPress={onSwitchToTrueSheet} variant="outlined">
          切换为 True Sheet
        </Button>
      </View>,
    );
  }

  return (
    <DebugScreenLayout
      description={
        inTrueSheet
          ? "在 True Sheet 中查看各调试分区，或切换为全屏 Stack。"
          : inFullPageRoute
            ? "在全屏 Stack 中查看各调试分区，或切换回 True Sheet。"
            : "小屏设备下调试入口。"
      }
      hideInlineHeader={inFullPageRoute}
      layoutHost={layoutHost}
      scrollable={layoutHost !== "trueSheet"}
      title="调试面板"
    >
      <View style={styles.sectionList}>{sectionCards}</View>
    </DebugScreenLayout>
  );
}

export function DebugSectionScreen({
  hideInlineHeader = false,
  layoutHost = "screen",
  sectionKey,
}: {
  hideInlineHeader?: boolean;
  layoutHost?: DebugScreenLayoutHost;
  sectionKey: DebugTabKey;
}) {
  const definition = getDebugPanelRouteDefinition(sectionKey);
  const SectionComponent = definition.Component;

  return (
    <DebugScreenLayout
      description={definition.description}
      hideInlineHeader={hideInlineHeader}
      layoutHost={layoutHost}
      scrollable={layoutHost !== "trueSheet"}
      title={definition.label}
    >
      <View style={styles.panelHost}>
        <SectionComponent />
      </View>
    </DebugScreenLayout>
  );
}

const styles = StyleSheet.create({
  content: {
    flex: 1,
    minHeight: 0,
  },
  contentInScroll: {
    minHeight: 0,
  },
  header: {
    borderColor: "rgba(128, 128, 128, 0.22)",
    borderRadius: 20,
    borderWidth: 1,
    gap: 16,
    marginBottom: 20,
    padding: 20,
  },
  headerText: {
    gap: 6,
  },
  page: {
    flex: 1,
  },
  pageContainer: {
    alignSelf: "center",
    flex: 1,
    maxWidth: DEBUG_SCREEN_MAX_WIDTH,
    width: "100%",
  },
  pageContainerInScroll: {
    alignSelf: "center",
    maxWidth: DEBUG_SCREEN_MAX_WIDTH,
    width: "100%",
  },
  pagePadding: {
    flex: 1,
    paddingBottom: 0,
    paddingHorizontal: 20,
    paddingTop: 0,
  },
  pagePaddingInScroll: {
    paddingBottom: 0,
    paddingHorizontal: 20,
    paddingTop: 0,
  },
  pageScrollContent: {
    flexGrow: 1,
    paddingBottom: 24,
  },
  pageScrollHost: {
    flex: 1,
    minHeight: 0,
  },
  pageScrollView: {
    flex: 1,
    minHeight: 0,
  },
  panelHost: {
    minHeight: 0,
    paddingBottom: 20,
  },
  safeArea: {
    flex: 1,
  },
  sectionCard: {
    borderColor: "rgba(128, 128, 128, 0.22)",
    borderRadius: 16,
    borderWidth: 1,
    gap: 16,
    padding: 16,
  },
  sectionCardText: {
    gap: 6,
  },
  sectionList: {
    gap: 16,
  },
  trueSheetBody: {
    alignSelf: "center",
    gap: 16,
    maxWidth: DEBUG_SCREEN_MAX_WIDTH,
    paddingBottom: 24,
    paddingHorizontal: 20,
    paddingTop: 8,
    width: "100%",
  },
});
