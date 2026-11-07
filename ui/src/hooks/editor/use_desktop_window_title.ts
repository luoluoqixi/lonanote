import { useEffect } from "react";
import { useStore } from "zustand";
import { createStore } from "zustand/vanilla";

import { isDesktop, isTauri } from "@/api/common/platform";
import { getAppTitle } from "@/config";
import { workspaceSessionStore } from "@/stores/workspace/workspace_session_store";

const titleStore = createStore(() => ({ title: getAppTitle() }));
export const useWindowTitle = () => useStore(titleStore, (state) => state.title);

/** 标题只读取调用窗口所属工作台，辅助窗口无需直接访问工作区命令。 */
export function useDesktopWindowTitle(ready: boolean) {
  useEffect(() => {
    if (!ready || !isDesktop() || !isTauri()) return;
    let disposed = false;
    let generation = 0;
    let stopEvents: (() => void) | undefined;
    const refresh = async () => {
      const request = ++generation;
      const { invoke } = await import("@tauri-apps/api/core");
      const title = await invoke<string>("refresh_current_window_title");
      if (!disposed && request === generation) {
        titleStore.setState({ title });
        document.title = title;
      }
    };
    const update = () => {
      void refresh().catch((error) => console.warn("更新窗口标题失败", error));
    };
    const stopWorkspace = workspaceSessionStore.subscribe(update);
    void import("@tauri-apps/api/event")
      .then(async ({ listen }) => {
        const stop = await listen("lonanote://workspace-catalog-changed", update);
        if (disposed) stop();
        else {
          stopEvents = stop;
          update();
        }
      })
      .catch(console.error);
    return () => {
      disposed = true;
      stopWorkspace();
      stopEvents?.();
    };
  }, [ready]);
}
