import type { ReactNode } from "react";
import { useEffect } from "react";
import { DeviceEventEmitter, Platform } from "react-native";

import { isDesktop, isWeb } from "@/api/common";

import { toggleDebugPanel } from "./debug_panel_sheet_state";
import { isDebugFeatureEnabled } from "./release_gate";
import { DEBUG_PANEL_TOGGLE_EVENT } from "./routes";
import { DebugNativeSheetHost } from "./true_sheet";
import { DebugPanelGestureLayer, DebugWidePanelHost } from "./wide_panel";

function DebugMobilePanelToggleListener() {
  useEffect(() => {
    if (!isDebugFeatureEnabled() || Platform.OS === "web" || isDesktop()) {
      return;
    }

    const subscription = DeviceEventEmitter.addListener(DEBUG_PANEL_TOGGLE_EVENT, () => {
      void toggleDebugPanel();
    });

    return () => {
      subscription.remove();
    };
  }, []);

  return null;
}

function DebugMobileRuntime() {
  if (isWeb() || isDesktop()) {
    return null;
  }

  return (
    <>
      <DebugMobilePanelToggleListener />
      <DebugNativeSheetHost />
    </>
  );
}

/**
 * 开发态调试唯一入口：包裹应用子树（三指下滑 / F6）并挂载宽屏 Dialog、小屏 Sheet。
 */
export function DebugRuntime({ children }: { children: ReactNode }) {
  if (!isDebugFeatureEnabled()) {
    return children;
  }

  return (
    <DebugPanelGestureLayer>
      {children}
      <DebugWidePanelHost />
      <DebugMobileRuntime />
    </DebugPanelGestureLayer>
  );
}
