import { TrueSheet } from "@lodev09/react-native-true-sheet";
import { useCallback, useState } from "react";
import { ScrollView, StyleSheet, View } from "react-native";
import { GestureHandlerRootView } from "react-native-gesture-handler";
import { isDesktop, isWeb } from "@/api/common";
import { Button, ScreenOverlayPortalProvider, Text } from "@/components/ui";

import { getDebugPanelRouteDefinition, type DebugTabKey } from "./debug_panel_routes";
import { DebugHomeScreen, DebugSectionScreen } from "./debug_route_screens";
import {
  dismissTrueSheetDebug,
  TRUE_SHEET_DEBUG_NAME,
  TRUE_SHEET_DEBUG_OVERLAY_PORTAL_HOST,
} from "./true_sheet_debug";

type TrueSheetDebugScreen = "home" | DebugTabKey;

function TrueSheetDebugHeader({
  onBack,
  onClose,
  subtitle,
  title,
}: {
  onBack?: () => void;
  onClose: () => void;
  subtitle?: string;
  title: string;
}) {
  return (
    <GestureHandlerRootView style={styles.headerRoot}>
      <View style={styles.header}>
        <View style={styles.headerText}>
          <Text fontSize="$6" fontWeight="700">
            {title}
          </Text>
          {subtitle ? (
            <Text color="$color10" fontSize="$2">
              {subtitle}
            </Text>
          ) : null}
        </View>
        <View style={styles.headerActions}>
          {onBack ? (
            <Button chromeless onPress={onBack} size="$3">
              返回
            </Button>
          ) : null}
          <Button onPress={onClose} size="$3" variant="outlined">
            关闭
          </Button>
        </View>
      </View>
    </GestureHandlerRootView>
  );
}

/**
 * True Sheet 调试宿主：用于对比 Native Stack formSheet/pageSheet 的滚动与关 sheet 行为。
 * 需 dev client + prebuild 后原生重装；不支持 Expo Go。
 *
 * @see https://sheet.lodev09.com/guides/scrolling — Android 须 `scrollable` 才正确协调列表与 sheet 拖拽
 */
export function TrueSheetDebugHost() {
  const [screen, setScreen] = useState<TrueSheetDebugScreen>("home");

  const resetScreen = useCallback(() => {
    setScreen("home");
  }, []);

  const handleClose = useCallback(() => {
    void dismissTrueSheetDebug();
  }, []);

  const handleOpenPanel = useCallback((key: DebugTabKey) => {
    setScreen(key);
  }, []);

  if (isWeb() || isDesktop()) {
    return null;
  }

  const isHome = screen === "home";
  const sectionDefinition = isHome ? null : getDebugPanelRouteDefinition(screen);

  return (
    <TrueSheet
      detents={[1]}
      dismissible
      grabber
      header={
        <TrueSheetDebugHeader
          onBack={isHome ? undefined : resetScreen}
          onClose={handleClose}
          subtitle={isHome ? "原生 True Sheet · 对比 Stack sheet" : sectionDefinition.description}
          title={isHome ? "调试面板 (True Sheet)" : sectionDefinition.label}
        />
      }
      insetAdjustment="automatic"
      name={TRUE_SHEET_DEBUG_NAME}
      onDidDismiss={resetScreen}
      pageSizing
      scrollable
      scrollableOptions={{
        // 单 detent 调试页：仅 grabber 参与扩 sheet，避免与内容滚动抢手势
        scrollingExpandsSheet: false,
      }}
    >
      <GestureHandlerRootView style={styles.sheetGestureRoot}>
        <ScreenOverlayPortalProvider hostName={TRUE_SHEET_DEBUG_OVERLAY_PORTAL_HOST}>
          <ScrollView
            contentContainerStyle={styles.sheetScrollContent}
            keyboardShouldPersistTaps="handled"
            nestedScrollEnabled
            showsVerticalScrollIndicator
            style={styles.sheetScroll}
          >
            {isHome ? (
              <DebugHomeScreen onOpenPanel={handleOpenPanel} presentationMode="page" />
            ) : (
              <DebugSectionScreen layoutHost="trueSheet" presentationMode="page" sectionKey={screen} />
            )}
          </ScrollView>
        </ScreenOverlayPortalProvider>
      </GestureHandlerRootView>
    </TrueSheet>
  );
}

const styles = StyleSheet.create({
  headerRoot: {
    flexGrow: 0,
  },
  sheetGestureRoot: {
    flexGrow: 1,
  },
  sheetScroll: {
    flexGrow: 1,
  },
  sheetScrollContent: {
    flexGrow: 1,
  },
  header: {
    alignItems: "center",
    borderBottomColor: "rgba(128, 128, 128, 0.22)",
    borderBottomWidth: StyleSheet.hairlineWidth,
    flexDirection: "row",
    gap: 12,
    paddingBottom: 12,
    paddingHorizontal: 16,
    paddingTop: 4,
  },
  headerActions: {
    flexDirection: "row",
    flexShrink: 0,
    gap: 8,
  },
  headerText: {
    flex: 1,
    gap: 4,
    minWidth: 0,
  },
});
