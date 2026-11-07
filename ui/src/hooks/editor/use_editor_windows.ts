import { useEffect } from "react";
import { useStore } from "zustand";

import {
  editorWindowService,
  editorWindowState,
} from "@/components/editor/controllers/editor_window_service";

export function useEditorWindows() {
  const state = useStore(editorWindowState);
  useEffect(() => {
    void editorWindowService
      .initialize()
      .catch((error) => console.error("[editor-window] 初始化失败", error));
    if (typeof window === "undefined" || typeof window.addEventListener !== "function") return;
    const warnBeforeUnload = (event: BeforeUnloadEvent) => {
      if (!editorWindowService.hasUnconfirmedChanges()) return;
      event.preventDefault();
      event.returnValue = "";
    };
    window.addEventListener("beforeunload", warnBeforeUnload);
    return () => window.removeEventListener("beforeunload", warnBeforeUnload);
  }, []);
  return state;
}
