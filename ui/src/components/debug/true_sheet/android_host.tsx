import { useCallback, useState } from "react";

import { TrueSheetPanel } from "@/components/ui/true_sheet/panel";
import { DEBUG_OVERLAY_PORTAL_HOST } from "@/components/ui/utils/overlay_toast_layout";

import { type DebugTabKey, getDebugPanelRouteDefinition } from "../routes";
import { DebugHomeScreen, DebugSectionScreen } from "../screens";
import {
  DEBUG_TRUE_SHEET_NAME,
  closeDebugPanel,
  markDebugPanelClosed,
  switchDebugPanelToFullPage,
} from "./api";
import { DebugTrueSheetScroll } from "./shared_scroll";

type DebugTrueSheetScreen = "home" | DebugTabKey;

/**
 * Android True Sheet：不使用 NavigationContainer（Sheet 子树无法满足 react-native-screens）。
 */
export function DebugTrueSheetAndroidHost() {
  const [screen, setScreen] = useState<DebugTrueSheetScreen>("home");

  const resetScreen = useCallback(() => {
    setScreen("home");
  }, []);

  const handleClose = useCallback(() => {
    void closeDebugPanel();
  }, []);

  const handleDidDismiss = useCallback(() => {
    markDebugPanelClosed();
    resetScreen();
  }, [resetScreen]);

  const isHome = screen === "home";
  const sectionDefinition = isHome ? undefined : getDebugPanelRouteDefinition(screen);

  return (
    <TrueSheetPanel
      canGoBack={!isHome}
      chrome="toolbar"
      name={DEBUG_TRUE_SHEET_NAME}
      onBack={resetScreen}
      onDidDismiss={handleDidDismiss}
      onRequestClose={handleClose}
      overlayPortalHostName={DEBUG_OVERLAY_PORTAL_HOST}
      title={isHome ? "调试面板" : (sectionDefinition?.label ?? "调试")}
    >
      <DebugTrueSheetScroll>
        {isHome ? (
          <DebugHomeScreen
            onOpenPanel={(key) => setScreen(key)}
            onSwitchToFullPage={() => {
              void switchDebugPanelToFullPage();
            }}
          />
        ) : (
          <DebugSectionScreen layoutHost="trueSheet" sectionKey={screen} />
        )}
      </DebugTrueSheetScroll>
    </TrueSheetPanel>
  );
}
