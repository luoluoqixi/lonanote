import { useEffect, useRef, useState } from "react";

import { clipboard } from "@/api/commands/system/clipboard";

export type TextMenuAction = "undo" | "redo" | "cut" | "copy" | "paste" | "selectAll";

/** 菜单获得焦点后仍保留原输入框；点击其他内容即放弃旧目标。 */
export function useTextMenuTarget() {
  const target = useRef<HTMLInputElement | HTMLTextAreaElement | null>(null);
  const [, refresh] = useState(0);
  useEffect(() => {
    const update = (event: FocusEvent | PointerEvent) => {
      const node = event.target;
      if (
        !(node instanceof Element) ||
        node.closest("[data-app-menubar], [role=menu], [role=menuitem]")
      )
        return;
      target.current =
        node instanceof HTMLInputElement || node instanceof HTMLTextAreaElement ? node : null;
      refresh((n) => n + 1);
    };
    const onWindowBlur = () => {
      setTimeout(() => {
        if (document.activeElement instanceof HTMLIFrameElement) {
          target.current = null;
          refresh((n) => n + 1);
        }
      }, 0);
    };
    window.addEventListener("blur", onWindowBlur);
    document.addEventListener("focusin", update);
    document.addEventListener("pointerdown", update);
    return () => {
      window.removeEventListener("blur", onWindowBlur);
      document.removeEventListener("focusin", update);
      document.removeEventListener("pointerdown", update);
    };
  }, []);
  const node = target.current;
  return {
    active: Boolean(node?.isConnected),
    isActive: () => Boolean(target.current?.isConnected),
    selectable: true,
    writable: Boolean(node?.isConnected && !node.readOnly && !node.disabled),
    selected: Boolean(node && node.selectionStart !== node.selectionEnd),
    execute: async (action: TextMenuAction) => {
      const input = target.current;
      if (!input?.isConnected) return;
      const start = input.selectionStart ?? 0;
      const end = input.selectionEnd ?? 0;
      const previousValue = input.value;
      const valid = () =>
        target.current === input &&
        input.isConnected &&
        input.value === previousValue &&
        input.selectionStart === start &&
        input.selectionEnd === end;
      if (action === "copy" || action === "cut") {
        await clipboard.writeText(previousValue.slice(start, end));
        if (action === "copy") return;
      }
      const text = action === "paste" ? await clipboard.readText() : "";
      if (!valid()) return;
      input.focus();
      input.setSelectionRange(start, end);
      if (action === "selectAll") {
        input.select();
        return;
      }
      if (action === "undo" || action === "redo") {
        document.execCommand(action);
        return;
      }
      if (input.readOnly || input.disabled) return;
      // insertText 经过浏览器编辑事务，保留原生 undo 历史和 React onChange。
      if (!document.execCommand("insertText", false, text))
        throw new Error("当前输入框不支持此编辑操作");
    },
  };
}
