import { useEffect, useRef } from "react";
import { Dropdown, createNativeMenuItems, useMenuConfig } from "rn-ui-kit";

import { editorPredefinedItem } from "@/api/common/tauri_menu_items";

import type { EditorMenuPopupProps } from "./editor_menu_popup_types";

/** 编辑器菜单在宿主窗口渲染，避免被 iframe 或标签栏的滚动容器裁切。 */
export function EditorMenuPopup({ request, onDismiss }: EditorMenuPopupProps) {
  const config = useMenuConfig();
  const native = config.native === true && !!config.showNativeMenu;
  const dismissRef = useRef(onDismiss);
  dismissRef.current = onDismiss;
  const interactedOutside = useRef(false);
  const menuRef = useRef<{ presentMenu(): void } | null>(null);
  useEffect(() => {
    if (!request) return;
    interactedOutside.current = false;
    if (native && config.showNativeMenu) {
      let cancelled = false;
      void (async () => {
        // 系统剪贴板动作发送给当前输入控件，弹出菜单前先归还 iframe 输入焦点。
        await request.restoreFocus?.();
        if (cancelled || !request.isCurrent()) return;
        await config.showNativeMenu?.({
          x: request.x,
          y: request.y,
          items: createNativeMenuItems(request.items).map((item, index) => ({
            ...item,
            predefined: editorPredefinedItem(request.items[index].value),
          })),
          isCurrent: () => !cancelled && request.isCurrent(),
        });
        if (!cancelled && request.isCurrent()) await request.restoreFocus?.();
      })()
        .catch((error) => config.onNativeMenuError?.(error))
        .finally(() => {
          if (!cancelled) dismissRef.current();
        });
      return () => {
        cancelled = true;
      };
    }
    // 当前 rn-ui-kit Web renderer 通过 trigger 句柄呈现菜单。
    menuRef.current?.presentMenu();
  }, [request, native, config.showNativeMenu, config.onNativeMenuError]);
  useEffect(() => {
    if (request && !request.isCurrent()) onDismiss();
  });
  if (!request || native) return null;
  return (
    <Dropdown
      key={request.sequence}
      native={false}
      __menuRef={menuRef}
      onOpenChange={(open) => {
        if (!open) onDismiss();
      }}
      items={request.items}
      trigger={
        <div
          aria-hidden
          style={{
            position: "fixed",
            left: request.x,
            top: request.y,
            width: 0,
            height: 0,
            pointerEvents: "none",
          }}
        />
      }
      contentProps={{
        align: "start",
        side: "right",
        sideOffset: 0,
        onInteractOutside: () => {
          interactedOutside.current = true;
        },
        onCloseAutoFocus: (event) => {
          // 不将焦点交给不可见锚点，也不抢走用户点击的其他控件的焦点。
          event.preventDefault();
          if (!interactedOutside.current && request.isCurrent()) request.restoreFocus?.();
        },
      }}
    />
  );
}
