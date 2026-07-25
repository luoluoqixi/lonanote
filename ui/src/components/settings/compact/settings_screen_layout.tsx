import type { ReactNode } from "react";
import { StyleSheet, View } from "react-native";
import { type Edge, SafeAreaView } from "react-native-safe-area-context";
import { ScrollView, Text } from "rn-ui-kit";

import { isWeb, os } from "@/api/common";

import { SettingsSyncState } from "../sections";

const SCREEN_MAX_WIDTH = 960;

type SettingsScreenLayoutProps = {
  children: ReactNode;
  error: string | null;
  isLoading: boolean;
  title: string;
};

export function SettingsScreenLayout({
  children,
  error,
  isLoading,
  title,
}: SettingsScreenLayoutProps) {
  const usesNativeHeader = !isWeb();
  const usesNativeSettingsList = os() === "ios";
  const showMeta = error != null || isLoading;
  const safeAreaEdges: Edge[] = usesNativeSettingsList
    ? ["left", "right", "bottom"]
    : usesNativeHeader
      ? ["left", "right"]
      : ["top"];

  return (
    <SafeAreaView edges={safeAreaEdges} style={styles.safeArea}>
      <View style={styles.page}>
        <View style={usesNativeSettingsList ? styles.nativePagePadding : styles.pagePadding}>
          <View style={styles.pageContainer}>
            {!usesNativeHeader ? (
              <View style={styles.header}>
                <Text fontSize="$8" fontWeight="700">
                  {title}
                </Text>
                <View style={styles.syncState}>
                  <SettingsSyncState error={error} isLoading={isLoading} />
                </View>
              </View>
            ) : null}

            {usesNativeHeader && showMeta ? (
              <View style={styles.metaPanel}>
                <View style={styles.syncState}>
                  <SettingsSyncState error={error} isLoading={isLoading} />
                </View>
              </View>
            ) : null}

            {usesNativeSettingsList ? (
              <View style={[styles.content, styles.nativeContent]}>{children}</View>
            ) : (
              <ScrollView
                contentContainerStyle={styles.scrollContent}
                showsVerticalScrollIndicator
                style={styles.content}
                tracksNavigationBarScrollEdge={usesNativeHeader}
              >
                {children}
              </ScrollView>
            )}
          </View>
        </View>
      </View>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  content: { flex: 1, minHeight: 0 },
  header: {
    borderColor: "rgba(128, 128, 128, 0.22)",
    borderRadius: 20,
    borderWidth: 1,
    gap: 16,
    marginBottom: 20,
    padding: 20,
  },
  metaPanel: { gap: 12, marginBottom: 16 },
  nativeContent: { flex: 1, width: "100%" },
  nativePagePadding: { flex: 1, paddingHorizontal: 0, paddingTop: 0 },
  page: { flex: 1 },
  pageContainer: { alignSelf: "center", flex: 1, maxWidth: SCREEN_MAX_WIDTH, width: "100%" },
  pagePadding: { flex: 1, paddingHorizontal: 0, paddingTop: 0 },
  safeArea: { flex: 1 },
  scrollContent: {},
  syncState: { minHeight: 0 },
});
