import { useEffect, useRef } from "react";

import type { AppMenuActionId } from "./app_menu_model";
import type { useAppMenu } from "./use_app_menu";

/** macOS app menu 的安装与资源生命周期由 Rust 唯一协调器管理。 */
export function NativeAppMenu({ menu }: { menu: ReturnType<typeof useAppMenu> }) {
  const latest = useRef(menu);
  latest.current = menu;
  const definition = JSON.stringify(menu.groups);
  useEffect(() => {
    void import("@tauri-apps/api/core")
      .then(({ invoke }) => invoke("update_window_menu", { groups: JSON.parse(definition) }))
      .catch((error) => console.error("更新原生菜单失败", error));
  }, [definition]);
  useEffect(() => {
    let disposed = false;
    let unlisten: (() => void) | undefined;
    void import("@tauri-apps/api/webviewWindow")
      .then(async ({ getCurrentWebviewWindow }) => {
        const stop = await getCurrentWebviewWindow().listen<AppMenuActionId>(
          "lonanote://menu-action",
          ({ payload }) => {
            void latest.current.execute(payload);
          },
        );
        if (disposed) stop();
        else unlisten = stop;
      })
      .catch((error) => console.error("注册原生菜单事件失败", error));
    return () => {
      disposed = true;
      unlisten?.();
    };
  }, []);
  return null;
}
