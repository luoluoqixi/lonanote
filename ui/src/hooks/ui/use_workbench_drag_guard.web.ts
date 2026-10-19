import { useCallback, useEffect, useRef } from "react";

/** iframe 会吞掉父 document 的 pointerup；拖动工作台分栏时暂时隔离所有 surface。 */
export function useWorkbenchDragGuard() {
  const restore = useRef<(() => void) | null>(null);
  const onDragEnd = useCallback(() => {
    restore.current?.();
    restore.current = null;
  }, []);
  const onDragStart = useCallback(() => {
    onDragEnd();
    const style = document.createElement("style");
    style.textContent = "iframe { pointer-events: none !important; }";
    document.head.appendChild(style);
    restore.current = () => style.remove();
  }, [onDragEnd]);
  useEffect(() => {
    const cancel = () => {
      if (restore.current)
        document.dispatchEvent(new PointerEvent("pointercancel", { bubbles: true }));
      onDragEnd();
    };
    window.addEventListener("blur", cancel);
    window.addEventListener("pointerup", onDragEnd);
    window.addEventListener("pointercancel", onDragEnd);
    return () => {
      onDragEnd();
      window.removeEventListener("blur", cancel);
      window.removeEventListener("pointerup", onDragEnd);
      window.removeEventListener("pointercancel", onDragEnd);
    };
  }, [onDragEnd]);
  return { onDragStart, onDragEnd };
}
