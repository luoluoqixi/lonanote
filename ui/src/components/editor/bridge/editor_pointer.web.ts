import type { EditorPointerPayload } from "@/assets/editor/src/bridge/pointer";

/** 在 iframe 元素上重放外部交互，供宿主菜单识别 outside pointer。 */
export function forwardEditorPointer(frame: HTMLIFrameElement, payload: EditorPointerPayload) {
  const ownerWindow = frame.ownerDocument.defaultView;
  if (!ownerWindow) return;
  const rect = frame.getBoundingClientRect();
  frame.dispatchEvent(
    new ownerWindow.PointerEvent(payload.type, {
      ...payload,
      bubbles: true,
      cancelable: true,
      clientX: rect.left + payload.clientX,
      clientY: rect.top + payload.clientY,
    }),
  );
}
