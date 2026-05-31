import { useRouter } from "expo-router";
import type { ReactNode } from "react";
import { ScrollView, StyleSheet, View } from "react-native";

import { isDesktop, isWeb } from "@/api/common";

import { TitleBar } from "../titlebar";
import { Button, Text } from "../ui";
import {
  DEBUG_PANEL_ROUTE_DEFINITIONS,
  type DebugRouteMode,
  type DebugTabKey,
  getDebugHomeHref,
  getDebugPanelHref,
  getDebugPanelRouteDefinition,
} from "./debug_panel_routes";

const DEBUG_SCREEN_MAX_WIDTH = 960;

function DebugScreenLayout({
  children,
  description,
  scrollable = false,
  title,
}: {
  children: ReactNode;
  description?: string;
  scrollable?: boolean;
  title: string;
}) {
  const desktop = isDesktop();
  const usesNativeHeader = !isWeb();
  const pageBody = (
    <View style={styles.pagePadding}>
      <View style={styles.pageContainer}>
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
        <View style={styles.content}>{children}</View>
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
  presentationMode = "sheet",
}: {
  presentationMode?: DebugRouteMode;
}) {
  const router = useRouter();
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
        <Button onPress={() => router.push(getDebugPanelHref(definition.key, presentationMode))}>
          打开{definition.label}
        </Button>
      </View>,
    );

    if (definition.key === "components") {
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
      title="调试面板"
    >
      <View style={styles.sectionList}>{sectionCards}</View>
    </DebugScreenLayout>
  );
}

export function DebugSectionScreen({
  presentationMode = "sheet",
  sectionKey,
}: {
  presentationMode?: DebugRouteMode;
  sectionKey: DebugTabKey;
}) {
  const definition = getDebugPanelRouteDefinition(sectionKey);
  const SectionComponent = definition.Component;

  return (
    <DebugScreenLayout
      description={definition.description}
      scrollable
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
    flex: 1,
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
});
