import { useEffect } from "react";

import { isDesktop, isTauri } from "@/api/common";

import { useUiPreferences } from "./use_ui_preferences";

export function clampZoomFactor(value: number): number {
  return Math.min(2, Math.max(0.75, Number(value.toFixed(2))));
}

// Apply the desktop UI zoom through Tauri webview so zoom state stays in UI preferences.
export function useDesktopZoomFactor() {
  const { isLoaded, preferences } = useUiPreferences();

  useEffect(() => {
    if (!isLoaded || !isTauri() || !isDesktop()) {
      return;
    }

    void (async () => {
      try {
        const { getCurrentWebview } = await import("@tauri-apps/api/webview");
        await getCurrentWebview().setZoom(clampZoomFactor(preferences.appearance.zoomFactor));
      } catch (error) {
        console.error("[appearance] failed to apply desktop zoom factor", error);
      }
    })();
  }, [isLoaded, preferences.appearance.zoomFactor]);
}
