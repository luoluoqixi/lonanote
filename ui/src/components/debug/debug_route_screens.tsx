import { useRouter } from "expo-router";
import type { ReactNode } from "react";
import { ScrollView, StyleSheet, View } from "react-native";

import { isDesktop, isWeb, os } from "@/api/common";

import { TitleBar } from "../titlebar";
import { Button, FormSheetScrollView, Text } from "../ui";
import {
  DEBUG_PANEL_ROUTE_DEFINITIONS,
  type DebugRouteMode,
  type DebugTabKey,
  getDebugHomeHref,
  getDebugPanelHref,
  getDebugPanelRouteDefinition,
} from "./debug_panel_routes";

const DEBUG_SCREEN_MAX_WIDTH = 960;

type DebugScreenLayoutHost = "screen" | "trueSheet";

function DebugScreenLayout({
  children,
  description,
  layoutHost = "screen",
  presentationMode = "sheet",
  scrollable = false,
  title,
}: {
  children: ReactNode;
  description?: string;
  /** True Sheet 内勿用 flex:1 全屏壳，否则 Card/按钮会错位且无法点击 */
  layoutHost?: DebugScreenLayoutHost;
  presentationMode?: DebugRouteMode;
  scrollable?: boolean;
  title: string;
}) {
  /** 滚动由 TrueSheet `scrollable` 托管，此处仅渲染内容，避免双层 ScrollView 导致嵌套滚动失效 */
  if (layoutHost === "trueSheet") {
    return <View style={styles.trueSheetBody}>{children}</View>;
  }

  const desktop = isDesktop();
  const usesNativeHeader = !isWeb();
  /** 仅 Android formSheet 根页：整屏 ScrollView 承接 Card 间隙等透明区域手势。 */
  const usesFormSheetScroll = os() === "android" && !desktop && presentationMode === "sheet";
  const inSheetScroll = usesFormSheetScroll || scrollable;
  const pageBody = (
    <View style={inSheetScroll ? styles.pagePaddingInScroll : styles.pagePadding}>
      <View style={inSheetScroll ? styles.pageContainerInScroll : styles.pageContainer}>
        {!usesNativeHeader ? (
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
        <View style={inSheetScroll ? styles.contentInScroll : styles.content}>{children}</View>
      </View>
    </View>
  );

  return (
    <View
      // edges={usesNativeHeader ? ["left", "right"] : ["top"]}
      style={styles.safeArea}
    >
      {desktop ? <TitleBar /> : null}
      <View style={styles.page}>
        {usesFormSheetScroll || scrollable ? (
          <View style={styles.pageScrollHost}>
            <FormSheetScrollView
              contentContainerStyle={usesFormSheetScroll ? undefined : styles.pageScrollContent}
              nestedScrollEnabled={usesFormSheetScroll ? false : undefined}
              showsVerticalScrollIndicator
              style={styles.pageScrollView}
            >
              {pageBody}
            </FormSheetScrollView>
          </View>
        ) : (
          pageBody
        )}
      </View>
    </View>
  );
}

export function DebugHomeScreen({
  onOpenPanel,
  presentationMode = "sheet",
}: {
  /** True Sheet 等容器内导航：不走 Expo Router push */
  onOpenPanel?: (key: DebugTabKey) => void;
  presentationMode?: DebugRouteMode;
}) {
  const router = useRouter();
  const inTrueSheet = onOpenPanel != null;
  const layoutHost: DebugScreenLayoutHost = inTrueSheet ? "trueSheet" : "screen";
  const targetPresentationMode = presentationMode === "sheet" ? "page" : "sheet";
  const sectionCards: ReactNode[] = [];

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
          onPress={() => {
            if (onOpenPanel) {
              onOpenPanel(definition.key);
              return;
            }

            router.push(getDebugPanelHref(definition.key, presentationMode));
          }}
        >
          打开{definition.label}
        </Button>
      </View>,
    );

    if (definition.key === "components" && !inTrueSheet) {
      sectionCards.push(
        <View key="presentation-mode-toggle" style={styles.sectionCard}>
          <View style={styles.sectionCardText}>
            <Text fontSize="$5" fontWeight="600">
              {presentationMode === "sheet" ? "普通页面模式" : "Sheet 页面模式"}
            </Text>
            <Text color="$color10" fontSize="$3">
              切换当前调试面板的展示方式，便于对比不同呈现形式下的交互表现。
            </Text>
          </View>
          <Button onPress={() => router.replace(getDebugHomeHref(targetPresentationMode))}>
            {presentationMode === "sheet" ? "切换为普通页面" : "切换为 Sheet 页面"}
          </Button>
        </View>,
      );
    }
  }

  return (
    <DebugScreenLayout
      description="小屏设备下通过独立页面查看各调试分区。"
      layoutHost={layoutHost}
      presentationMode={presentationMode}
      title="调试面板"
    >
      <View style={styles.sectionList}>{sectionCards}</View>
    </DebugScreenLayout>
  );
}

export function DebugSectionScreen({
  layoutHost = "screen",
  presentationMode = "sheet",
  sectionKey,
}: {
  layoutHost?: DebugScreenLayoutHost;
  presentationMode?: DebugRouteMode;
  sectionKey: DebugTabKey;
}) {
  const definition = getDebugPanelRouteDefinition(sectionKey);
  const SectionComponent = definition.Component;

  return (
    <DebugScreenLayout
      description={definition.description}
      layoutHost={layoutHost}
      presentationMode={presentationMode}
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
  pageScrollContent: {
    flexGrow: 1,
  },
  pagePaddingInScroll: {
    paddingBottom: 0,
    paddingLeft: 20,
    paddingRight: 20,
    paddingTop: 0,
  },
  pageContainerInScroll: {
    alignSelf: "center",
    maxWidth: DEBUG_SCREEN_MAX_WIDTH,
    width: "100%",
  },
  contentInScroll: {
    minHeight: 0,
  },
  pageScrollHost: {
    flex: 1,
    minHeight: 0,
  },
  pageScrollView: {
    flex: 1,
    minHeight: 0,
  },
  pageContainer: {
    alignSelf: "center",
    flex: 1,
    maxWidth: DEBUG_SCREEN_MAX_WIDTH,
    width: "100%",
  },
  pagePadding: {
    flex: 1,
    paddingLeft: 20,
    paddingRight: 20,
    paddingTop: 0,
    paddingBottom: 0,
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
