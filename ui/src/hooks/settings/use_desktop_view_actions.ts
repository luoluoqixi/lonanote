import { useEffect } from "react";
import { useStore } from "zustand";

import { isDesktop } from "@/api/common/platform";
import {
  MAX_WINDOW_ZOOM,
  MIN_WINDOW_ZOOM,
  clampWindowZoom,
  stepWindowZoom,
} from "@/api/common/window_zoom";
import { desktopViewState } from "@/stores/ui/desktop_view_state";

import { createFullscreenActions } from "./desktop_fullscreen_actions";
import { useUiPreferences } from "./use_ui_preferences";

const currentWindow = async () => (await import("@tauri-apps/api/window")).getCurrentWindow();
let zoomUpdates = Promise.resolve();
const fullscreenActions = createFullscreenActions({
  get: async () => (await currentWindow()).isFullscreen(),
  set: async (next) => (await currentWindow()).setFullscreen(next),
  publish: (fullscreen) => desktopViewState.setState({ fullscreen, ready: true }),
});

export function useDesktopViewActions() {
  const supported = isDesktop();
  const { preferences, updateAndSave } = useUiPreferences();
  const { fullscreen, ready } = useStore(desktopViewState);
  const zoom = clampWindowZoom(preferences.appearance.zoomFactor);
  useEffect(() => {
    if (!supported) return;
    let disposed = false;
    let unlisten: (() => void) | undefined;
    const refresh = () => {
      void fullscreenActions.refresh().catch((error) => console.error("读取全屏状态失败", error));
    };
    void currentWindow()
      .then(async (window) => {
        const stop = await window.onResized(refresh);
        if (disposed) stop();
        else {
          unlisten = stop;
          refresh();
        }
      })
      .catch((error) => console.error("监听全屏状态失败", error));
    return () => {
      disposed = true;
      unlisten?.();
    };
  }, [supported]);
  const changeZoom = async (direction: 1 | -1 | 0) => {
    if (!supported) return;
    const task = zoomUpdates.then(async () => {
      await updateAndSave((current) => ({
        ...current,
        appearance: {
          ...current.appearance,
          zoomFactor:
            direction === 0 ? 1 : stepWindowZoom(current.appearance.zoomFactor, direction),
        },
      }));
    });
    zoomUpdates = task.catch(() => undefined);
    await task;
  };
  return {
    supported,
    zoom,
    fullscreen,
    fullscreenReady: supported && ready,
    canZoomIn: supported && zoom < MAX_WINDOW_ZOOM,
    canZoomOut: supported && zoom > MIN_WINDOW_ZOOM,
    zoomIn: () => changeZoom(1),
    zoomOut: () => changeZoom(-1),
    resetZoom: () => changeZoom(0),
    toggleFullscreen: async () => {
      if (supported) await fullscreenActions.toggle();
    },
    setFullscreen: async (next: boolean) => {
      if (supported) await fullscreenActions.set(next);
    },
  };
}
