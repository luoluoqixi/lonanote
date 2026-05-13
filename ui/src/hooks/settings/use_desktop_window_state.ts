import { PhysicalPosition, PhysicalSize, getCurrentWindow } from "@tauri-apps/api/window";
import { useEffect, useRef } from "react";

import { uiPreferences } from "@/api/commands/store";
import { isDesktop, isTauri } from "@/api/common";
import { uiPreferencesStore } from "@/stores/ui";

import { useUiPreferences } from "./use_ui_preferences";

const WINDOW_STATE_SAVE_DEBOUNCE_MS = 240;

async function captureCurrentWindowState() {
  const appWindow = getCurrentWindow();
  const [innerSize, outerPosition, isFullscreen, isMaximized] = await Promise.all([
    appWindow.innerSize(),
    appWindow.outerPosition(),
    appWindow.isFullscreen(),
    appWindow.isMaximized(),
  ]);

  return {
    height: innerSize.height,
    isFullscreen,
    isMaximized,
    width: innerSize.width,
    x: outerPosition.x,
    y: outerPosition.y,
  };
}

// Persist desktop window geometry into store so shell state stays outside business settings.
export function useDesktopWindowState() {
  const { isLoaded, preferences } = useUiPreferences();
  const restoredRef = useRef(false);
  const saveTimeoutRef = useRef<number | undefined>(undefined);

  useEffect(() => {
    if (!isLoaded || !isTauri() || !isDesktop()) {
      return;
    }

    const appWindow = getCurrentWindow();
    let cancelled = false;
    let unlistenResized: (() => void) | undefined;
    let unlistenMoved: (() => void) | undefined;

    const schedulePersistWindowState = () => {
      if (saveTimeoutRef.current !== undefined) {
        window.clearTimeout(saveTimeoutRef.current);
      }

      saveTimeoutRef.current = window.setTimeout(() => {
        saveTimeoutRef.current = undefined;
        void (async () => {
          try {
            const nextWindowState = await captureCurrentWindowState();

            if (cancelled) {
              return;
            }

            uiPreferencesStore.patchPreferences((currentPreferences) => ({
              ...currentPreferences,
              window: {
                ...currentPreferences.window,
                lastWindowState: nextWindowState,
              },
            }));

            await uiPreferences.saveDesktopWindowState(nextWindowState);
          } catch (error) {
            console.error("[window-state] failed to persist window state", error);
          }
        })();
      }, WINDOW_STATE_SAVE_DEBOUNCE_MS);
    };

    const initializeWindowState = async () => {
      try {
        const windowState = preferences.window.lastWindowState;

        if (!restoredRef.current && preferences.window.restoreWindowState && windowState) {
          restoredRef.current = true;

          if (!windowState.isMaximized && !windowState.isFullscreen) {
            await appWindow.setSize(new PhysicalSize(windowState.width, windowState.height));
            await appWindow.setPosition(new PhysicalPosition(windowState.x, windowState.y));
          }

          if (windowState.isMaximized) {
            await appWindow.maximize();
          }

          if (windowState.isFullscreen) {
            await appWindow.setFullscreen(true);
          }
        }

        schedulePersistWindowState();
        [unlistenResized, unlistenMoved] = await Promise.all([
          appWindow.onResized(() => {
            schedulePersistWindowState();
          }),
          appWindow.onMoved(() => {
            schedulePersistWindowState();
          }),
        ]);
      } catch (error) {
        console.error("[window-state] failed to initialize desktop window state", error);
      }
    };

    void initializeWindowState();

    return () => {
      cancelled = true;
      if (saveTimeoutRef.current !== undefined) {
        window.clearTimeout(saveTimeoutRef.current);
        saveTimeoutRef.current = undefined;
      }
      unlistenResized?.();
      unlistenMoved?.();
    };
  }, [isLoaded, preferences.window.restoreWindowState]);
}
