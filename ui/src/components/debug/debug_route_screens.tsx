import { useRouter } from "expo-router";
import type { ReactNode } from "react";
import { ScrollView, StyleSheet, View } from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";

import { isDesktop, isWeb } from "@/api/common";

import { TitleBar } from "../titlebar";
import { Button, Text } from "../ui";
import {
  DEBUG_PANEL_ROUTE_DEFINITIONS,
  type DebugTabKey,
  getDebugPanelRouteDefinition,
} from "./debug_panel_routes";

const DEBUG_SCREEN_MAX_WIDTH = 960;

function DebugScreenLayout({
  children,
  description,
  title,
}: {
  children: ReactNode;
  description?: string;
  title: string;
}) {
  const desktop = isDesktop();
  const usesNativeHeader = !isWeb();

  return (
    <View
      // edges={usesNativeHeader ? ["left", "right"] : ["top"]}
      style={styles.safeArea}
    >
      {desktop ? <TitleBar /> : null}
      <View style={styles.page}>
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
      </View>
    </View>
  );
}

export function DebugHomeScreen() {
  const router = useRouter();

  return (
    <DebugScreenLayout description="小屏设备下通过独立页面查看各调试分区。" title="调试面板">
      <View style={styles.sectionList}>
        {DEBUG_PANEL_ROUTE_DEFINITIONS.map((definition) => (
          <View key={definition.key} style={styles.sectionCard}>
            <View style={styles.sectionCardText}>
              <Text fontSize="$5" fontWeight="600">
                {definition.label}
              </Text>
              <Text color="$color10" fontSize="$3">
                {definition.description}
              </Text>
            </View>
            <Button onPress={() => router.push(definition.href)}>打开{definition.label}</Button>
          </View>
        ))}
      </View>
    </DebugScreenLayout>
  );
}

export function DebugSectionScreen({ sectionKey }: { sectionKey: DebugTabKey }) {
  const definition = getDebugPanelRouteDefinition(sectionKey);
  const SectionComponent = definition.Component;

  return (
    <DebugScreenLayout description={definition.description} title={definition.label}>
      <View style={styles.panelHost}>
        <ScrollView
          contentContainerStyle={styles.panelScrollContent}
          showsVerticalScrollIndicator
          style={styles.panelScrollView}
        >
          <SectionComponent />
        </ScrollView>
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
  },
  panelScrollContent: {
    paddingBottom: 20,
  },
  panelScrollView: {
    flex: 1,
    minHeight: 0,
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
