import { getCurrentWindow } from "@tauri-apps/api/window";
import { useEffect } from "react";

import { isDesktop, isTauri } from "@/api/common";
import {
  createWindowSizeRecorder,
  registerWindowSizeFlusher,
} from "@/api/common/window_size_recorder";
import { uiPreferences, uiPreferencesStore } from "@/stores/ui";

import { useUiPreferences } from "./use_ui_preferences";

/** 窗口位置由系统管理；仅采集用户调整后的普通逻辑尺寸。 */
export function useDesktopWindowState() {
  const { isLoaded } = useUiPreferences();
  useEffect(() => {
    if (!isLoaded || !isTauri() || !isDesktop()) return;
    const appWindow = getCurrentWindow();
    let cancelled = false;
    let timer: ReturnType<typeof setTimeout> | undefined;
    let unlisten: (() => void) | undefined;
    let unsubscribe: (() => void) | undefined;
    let unregisterFlush: (() => void) | undefined;
    let sampleRevision = 0;
    const initialize = async () => {
      const [size, scale] = await Promise.all([appWindow.innerSize(), appWindow.scaleFactor()]);
      if (cancelled) return;
      const recorder = createWindowSizeRecorder(size.toLogical(scale), async (next) => {
        await uiPreferences.saveDesktopWindowSize(next);
      });
      const sample = async () => {
        const revision = ++sampleRevision;
        const [size, scale, maximized, fullscreen, minimized] = await Promise.all([
          appWindow.innerSize(),
          appWindow.scaleFactor(),
          appWindow.isMaximized(),
          appWindow.isFullscreen(),
          appWindow.isMinimized(),
        ]);
        if (cancelled || revision !== sampleRevision) return;
        if (!uiPreferencesStore.getPreferences().window.rememberSize) {
          recorder.disable();
          return;
        }
        if (recorder.record(size.toLogical(scale), !maximized && !fullscreen && !minimized)) {
          clearTimeout(timer);
          timer = setTimeout(() => {
            void recorder
              .flush()
              .catch((error) => console.error("[window-size] 保存窗口尺寸失败", error));
          }, 240);
        }
      };
      unregisterFlush = registerWindowSizeFlusher(async () => {
        clearTimeout(timer);
        await sample();
        clearTimeout(timer);
        await recorder.flush();
      });
      unsubscribe = uiPreferencesStore.subscribe((state) => {
        if (!state.preferences.window.rememberSize) {
          clearTimeout(timer);
          recorder.disable();
        }
      });
      const stop = await appWindow.onResized(() => {
        void sample().catch((error) => console.error("[window-size] 读取窗口尺寸失败", error));
      });
      if (cancelled) stop();
      else unlisten = stop;
    };
    void initialize().catch((error) => console.error("[window-size] 初始化失败", error));
    return () => {
      cancelled = true;
      clearTimeout(timer);
      unlisten?.();
      unsubscribe?.();
      unregisterFlush?.();
    };
  }, [isLoaded]);
}
