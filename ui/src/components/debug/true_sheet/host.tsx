import { TrueSheet } from "@lodev09/react-native-true-sheet";
import { useCallback, useState } from "react";
import { ScrollView, StyleSheet, View } from "react-native";
import { GestureHandlerRootView } from "react-native-gesture-handler";

import { isDesktop, isWeb } from "@/api/common";
import { Button, ScreenOverlayPortalProvider, Text } from "@/components/ui";
import { DEBUG_OVERLAY_PORTAL_HOST } from "@/components/ui/utils/overlay_toast_layout";

import { type DebugTabKey, getDebugPanelRouteDefinition } from "../routes";
import { DebugHomeScreen, DebugSectionScreen } from "../screens";
import {
  DEBUG_TRUE_SHEET_NAME,
  closeDebugPanel,
  markDebugPanelClosed,
  switchDebugPanelToFullPage,
} from "./api";

type DebugTrueSheetScreen = "home" | DebugTabKey;

function DebugTrueSheetHeader({
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
 * 小屏调试 True Sheet 宿主。
 * 需 dev client + prebuild 后原生重装；不支持 Expo Go。
 *
 * @see https://sheet.lodev09.com/guides/scrolling — Android 须 `scrollable` 才正确协调列表与 sheet 拖拽
 */
export function DebugTrueSheetHost() {
  const [screen, setScreen] = useState<DebugTrueSheetScreen>("home");

  const resetScreen = useCallback(() => {
    setScreen("home");
  }, []);

  const handleClose = useCallback(() => {
    void closeDebugPanel();
  }, []);

  const handleOpenPanel = useCallback((key: DebugTabKey) => {
    setScreen(key);
  }, []);

  const handleSwitchToFullPage = useCallback(() => {
    void switchDebugPanelToFullPage();
  }, []);

  const handleDidDismiss = useCallback(() => {
    markDebugPanelClosed();
    resetScreen();
  }, [resetScreen]);

  if (isWeb() || isDesktop()) {
    return null;
  }

  const isHome = screen === "home";
  const sectionDefinition = isHome ? undefined : getDebugPanelRouteDefinition(screen);

  return (
    <TrueSheet
      detents={[1]}
      dismissible
      grabber
      header={
        <DebugTrueSheetHeader
          onBack={isHome ? undefined : resetScreen}
          onClose={handleClose}
          subtitle={isHome ? "True Sheet 调试面板" : sectionDefinition?.description}
          title={isHome ? "调试面板" : (sectionDefinition?.label ?? "调试")}
        />
      }
      insetAdjustment="automatic"
      name={DEBUG_TRUE_SHEET_NAME}
      onDidDismiss={handleDidDismiss}
      pageSizing
      scrollable
      scrollableOptions={{
        scrollingExpandsSheet: false,
      }}
    >
      <GestureHandlerRootView style={styles.sheetGestureRoot}>
        <ScreenOverlayPortalProvider hostName={DEBUG_OVERLAY_PORTAL_HOST}>
          <ScrollView
            contentContainerStyle={styles.sheetScrollContent}
            keyboardShouldPersistTaps="handled"
            nestedScrollEnabled
            showsVerticalScrollIndicator
            style={styles.sheetScroll}
          >
            {isHome ? (
              <DebugHomeScreen
                onOpenPanel={handleOpenPanel}
                onSwitchToFullPage={handleSwitchToFullPage}
              />
            ) : (
              <DebugSectionScreen layoutHost="trueSheet" sectionKey={screen} />
            )}
          </ScrollView>
        </ScreenOverlayPortalProvider>
      </GestureHandlerRootView>
    </TrueSheet>
  );
}

const styles = StyleSheet.create({
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
  headerRoot: {
    flexGrow: 0,
  },
  headerText: {
    flex: 1,
    gap: 4,
    minWidth: 0,
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
});
