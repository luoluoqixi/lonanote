import { useEffect, useRef, useState } from "react";

import { isDesktop, os } from "@/api/common/platform";

import {
  appMenuMnemonics,
  createAppMenuFocusRestoration,
  installAppMenuKeyboard,
  restoreAppMenuFocus,
} from "./app_menu_keyboard.web";

export function useAppMenuKeyboard(options: { compact: boolean; capture(): void; close(): void }) {
  const latest = useRef(options);
  latest.current = options;
  const [showHints, setShowHints] = useState(false);
  const [focusedId, setFocusedId] = useState<string | null>(null);
  const restore = useRef<() => void>(() => {});
  const restoration = useRef(createAppMenuFocusRestoration(() => restore.current()));
  const enabled = isDesktop() && ["windows", "linux"].includes(os());
  useEffect(() => {
    if (!enabled) return;
    let previous: HTMLElement | null = null;
    restore.current = () => restoreAppMenuFocus(document, previous);
    const focusChanged = () => {
      setFocusedId(document.activeElement?.getAttribute("data-app-menu-trigger") ?? null);
    };
    document.addEventListener("focusin", focusChanged);
    document.addEventListener("focusout", focusChanged);
    const trigger = (id?: string) =>
      document.querySelector<HTMLElement>(
        id && !latest.current.compact
          ? `[data-app-menu-trigger="${id}"]`
          : "[data-app-menu-trigger]",
      );
    const capture = () => {
      if (!document.activeElement?.closest("[data-app-menubar], [role=menu]")) {
        previous = document.activeElement instanceof HTMLElement ? document.activeElement : null;
        latest.current.capture();
      }
    };
    const cleanup = installAppMenuKeyboard(window, {
      blocked: () =>
        Boolean(
          document.querySelector("[role=dialog]:not([data-state=closed]), [role=alertdialog]"),
        ),
      focus: () => {
        restoration.current.clear();
        capture();
        trigger()?.focus();
        focusChanged();
      },
      open: (id) => {
        restoration.current.clear();
        capture();
        const element = trigger(id);
        element?.focus();
        // 使用键盘事件打开，以便 Radix 按键盘模式把焦点送进第一项。
        element?.dispatchEvent(
          new KeyboardEvent("keydown", { key: "ArrowDown", bubbles: true, cancelable: true }),
        );
      },
      reset: (reason) => {
        setFocusedId(null);
        restoration.current.clear();
        if (reason === "pointer") return;
        if (reason === "keyboard") restoration.current.arm();
        latest.current.close();
        if (reason === "keyboard") restore.current();
      },
      showHints: setShowHints,
    });
    return () => {
      cleanup();
      document.removeEventListener("focusin", focusChanged);
      document.removeEventListener("focusout", focusChanged);
    };
  }, [enabled]);
  return {
    showHints,
    focusedId,
    onMenuOpen: () => restoration.current.clear(),
    restoreFocusOnClose: () => restoration.current.consume(),
    mnemonics: enabled ? appMenuMnemonics : ({} as Record<string, string>),
  };
}
