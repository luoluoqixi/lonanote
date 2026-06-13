// 调试面板 NativeSheet 宿主（使用 @expo/ui SwiftUI BottomSheet）
import { useCallback, useEffect, useState } from "react";
import { DeviceEventEmitter } from "react-native";

import { NativeSheet } from "@/components/ui/native_sheet";

import { DEBUG_PANEL_ROUTE_DEFINITIONS, type DebugTabKey } from "./routes";
import { DebugHomeScreen, DebugSectionScreen } from "./screens";
import { DEBUG_SHEET_TOGGLE_EVENT, switchDebugSheetToTrueSheet } from "./sheet_mode";
import {
  closeDebugPanel,
  markDebugPanelClosed,
  switchDebugPanelToFullPage,
} from "./true_sheet/api";

export function DebugSheetHost() {
  const [open, setOpen] = useState(false);
  const [screen, setScreen] = useState<"home" | DebugTabKey>("home");

  useEffect(() => {
    const sub = DeviceEventEmitter.addListener(DEBUG_SHEET_TOGGLE_EVENT, () => {
      setOpen((prev) => !prev);
    });
    return () => sub.remove();
  }, []);

  const handleOpenChange = useCallback((next: boolean) => {
    setOpen(next);
    if (!next) {
      setScreen("home");
      markDebugPanelClosed();
    }
  }, []);

  const handleModeChange = useCallback((mode: "fullPage" | "native" | "trueSheet") => {
    if (mode === "fullPage") {
      void switchDebugPanelToFullPage();
    } else if (mode === "trueSheet") {
      void closeDebugPanel().then(() => {
        switchDebugSheetToTrueSheet();
      });
    }
  }, []);

  const isHome = screen === "home";
  const sectionDef = isHome
    ? undefined
    : DEBUG_PANEL_ROUTE_DEFINITIONS.find((d) => d.key === screen);

  if (!open) {
    return null;
  }

  return (
    <NativeSheet
      detents={[1]}
      grabberVisible
      name="lonanote-debug-sheet"
      onOpenChange={handleOpenChange}
      open={open}
    >
      {isHome ? (
        <DebugHomeScreen
          currentSheetMode="native"
          onOpenPanel={(key) => setScreen(key)}
          onSheetModeChange={handleModeChange}
          onSwitchToFullPage={() => void switchDebugPanelToFullPage()}
          onSwitchToTrueSheet={() => {
            void closeDebugPanel().then(() => {
              switchDebugSheetToTrueSheet();
            });
          }}
        />
      ) : (
        <>
          {sectionDef != null && <DebugSectionScreen layoutHost="trueSheet" sectionKey={screen} />}
        </>
      )}
    </NativeSheet>
  );
}
