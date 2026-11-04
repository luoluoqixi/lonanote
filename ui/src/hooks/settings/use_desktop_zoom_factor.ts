import { useEffect } from "react";

import { isDesktop, isTauri } from "@/api/common";
import { clampWindowZoom } from "@/api/common/window_zoom";

import { useUiPreferences } from "./use_ui_preferences";

let zoomApplications = Promise.resolve();

export function clampZoomFactor(value: number): number {
  return clampWindowZoom(value);
}

// 通过 Tauri WebView 应用缩放，持久化状态仍由 UI preferences 管理。
export function useDesktopZoomFactor() {
  const { isLoaded, preferences } = useUiPreferences();

  useEffect(() => {
    if (!isLoaded || !isTauri() || !isDesktop()) {
      return;
    }

    let cancelled = false;
    zoomApplications = zoomApplications
      .then(async () => {
        if (cancelled) return;
        const { getCurrentWebview } = await import("@tauri-apps/api/webview");
        if (cancelled) return;
        await getCurrentWebview().setZoom(clampZoomFactor(preferences.appearance.zoomFactor));
      })
      .catch((error) => {
        console.error("[appearance] failed to apply desktop zoom factor", error);
      });
    return () => {
      cancelled = true;
    };
  }, [isLoaded, preferences.appearance.zoomFactor]);
}
