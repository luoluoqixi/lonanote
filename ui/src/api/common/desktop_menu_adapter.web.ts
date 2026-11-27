import type { MenuAdapter } from "rn-ui-kit";

import { openTauriContextMenu } from "./tauri_context_menu.web";
import { showWcPopupContextMenu } from "./wcpopup_context_menu.web";

/** 两种宿主分别提供真实关闭信号，或保留资源到请求失效。 */
export function createDesktopMenuAdapter(
  backend: "wcpopup" | "tauri",
  colorScheme: "light" | "dark",
): MenuAdapter {
  return {
    open(request) {
      const nativeRequest = {
        ...request,
        isCurrent: () => !request.signal.aborted && request.isCurrent(),
      };
      if (backend === "tauri") return openTauriContextMenu(nativeRequest);
      return { closed: showWcPopupContextMenu(nativeRequest, colorScheme) };
    },
  };
}
