import { useEffect, useRef } from "react";

import { isDesktop, os } from "@/api/common/platform";
import {
  type ViewShortcutAction,
  getViewShortcutAction,
} from "@/assets/editor/src/bridge/view_shortcuts";

/** macOS 由原生菜单处理 accelerator，避免同一按键重复执行。 */
export function useAppViewShortcuts(execute: (action: ViewShortcutAction) => Promise<void>) {
  const latest = useRef(execute);
  latest.current = execute;
  useEffect(() => {
    if (!isDesktop() || os() === "macos") return;
    const handle = (event: KeyboardEvent) => {
      const action = getViewShortcutAction(event, os());
      if (!action) return;
      event.preventDefault();
      event.stopPropagation();
      void latest.current(action);
    };
    window.addEventListener("keydown", handle, true);
    return () => window.removeEventListener("keydown", handle, true);
  }, []);
}
