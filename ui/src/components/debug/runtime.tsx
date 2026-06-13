import type { ReactNode } from "react";
import { useEffect, useState } from "react";
import { DeviceEventEmitter, Platform } from "react-native";

import { isDesktop, isWeb } from "@/api/common";

import { DebugSheetHost } from "./debug_sheet_host";
import { isDebugFeatureEnabled } from "./release_gate";
import { DEBUG_PANEL_TOGGLE_EVENT } from "./routes";
import { DEBUG_SHEET_MODE_SWITCH_EVENT, type SheetMode, setSheetMode } from "./sheet_mode";
import { toggleDebugPanel } from "./true_sheet/api";
import { DebugTrueSheetHost } from "./true_sheet/true_sheet_host";
import { DebugPanelGestureLayer, DebugWidePanelHost } from "./wide_panel";

function DebugMobilePanelToggleListener({ mode }: { mode: SheetMode }) {
  useEffect(() => {
    if (!isDebugFeatureEnabled() || Platform.OS === "web" || isDesktop()) {
      return;
    }

    // NativeSheet 模式下，DebugSheetHost 自身已监听 toggle 事件
    // TrueSheet 模式下，仍需通过 toggleDebugPanel 调用 presentTrueSheet
    if (mode !== "trueSheet") {
      return;
    }

    const subscription = DeviceEventEmitter.addListener(DEBUG_PANEL_TOGGLE_EVENT, () => {
      void toggleDebugPanel();
    });

    return () => {
      subscription.remove();
    };
  }, [mode]);

  return null;
}

function DebugMobileRuntime() {
  const [mode, setMode] = useState<SheetMode>("trueSheet");

  // 监听模式切换事件
  useEffect(() => {
    const subscription = DeviceEventEmitter.addListener(
      DEBUG_SHEET_MODE_SWITCH_EVENT,
      (nextMode: SheetMode) => {
        setMode(nextMode);
        setSheetMode(nextMode);
      },
    );

    // 确保运行时状态与模块状态同步
    setSheetMode(mode);
    return () => {
      subscription.remove();
    };
  }, []);

  if (isWeb() || isDesktop()) {
    return null;
  }

  return (
    <>
      <DebugMobilePanelToggleListener mode={mode} />
      {mode === "native" ? <DebugSheetHost /> : <DebugTrueSheetHost />}
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
