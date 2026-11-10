import type { EditorPlatform } from "../bridge/protocol";
import type { LonaEditor } from "./editor";

type BackgroundFocusSession = {
  editor: LonaEditor;
  runtime: { platform: EditorPlatform; layoutMode?: "desktop" | "mobile" };
  documentReadOnly: boolean;
  inputEnabled: boolean;
};

/** 将桌面外壳留白的按下转交 CodeMirror，保留连续点击聚焦和完整的拖拽选区。 */
export function installDesktopBackgroundFocus(
  root: HTMLElement,
  getSession: () => BackgroundFocusSession | null,
): () => void {
  const onMouseDown = (event: MouseEvent) => {
    const session = getSession();
    if (
      !session ||
      session.runtime.layoutMode === "mobile" ||
      !["windows", "macos", "linux", "web"].includes(session.runtime.platform) ||
      session.documentReadOnly ||
      !session.inputEnabled ||
      event.button !== 0 ||
      event.shiftKey ||
      event.ctrlKey ||
      event.metaKey ||
      event.altKey
    )
      return;
    const view = session.editor.editor;
    // 只接管外壳和 contentDOM 本身，正文、图片、链接和其它 widget 仍使用原来的交互。
    const backgrounds = [root.ownerDocument.body, root, view.dom, view.scrollDOM, view.contentDOM];
    if (!backgrounds.includes(event.target as HTMLElement)) return;
    const documentBottom = view.documentTop + view.lineBlockAt(view.state.doc.length).bottom;
    if (event.clientY <= documentBottom) return;
    // contentDOM 上的原始事件会由 CodeMirror 处理，不能拦截其鼠标选区会话。
    if (event.target === view.contentDOM) return;
    event.preventDefault();
    event.stopPropagation();
    const MouseEvent = root.ownerDocument.defaultView!.MouseEvent;
    view.contentDOM.dispatchEvent(
      new MouseEvent("mousedown", {
        bubbles: true,
        cancelable: true,
        view: root.ownerDocument.defaultView,
        clientX: event.clientX,
        clientY: event.clientY,
        button: event.button,
        buttons: event.buttons,
        detail: event.detail || 1,
      }),
    );
  };
  const onContextMenu = (event: MouseEvent) => {
    const session = getSession();
    if (
      !session ||
      session.runtime.layoutMode === "mobile" ||
      !["windows", "macos", "linux"].includes(session.runtime.platform)
    )
      return;
    const view = session.editor.editor;
    // 正文及 widget 的右键保持原有处理，只补齐 CodeMirror 内容区以外的外壳留白。
    if (
      ![root.ownerDocument.body, root, view.dom, view.scrollDOM].includes(
        event.target as HTMLElement,
      )
    )
      return;
    const MouseEvent = root.ownerDocument.defaultView!.MouseEvent;
    const forwarded = new MouseEvent("contextmenu", {
      bubbles: true,
      cancelable: true,
      view: root.ownerDocument.defaultView,
      clientX: event.clientX,
      clientY: event.clientY,
      button: event.button,
      buttons: event.buttons,
      ctrlKey: event.ctrlKey,
      shiftKey: event.shiftKey,
      altKey: event.altKey,
      metaKey: event.metaKey,
    });
    // 不聚焦或重设光标，菜单操作应继续使用原有文本选区。
    if (!view.contentDOM.dispatchEvent(forwarded)) {
      event.preventDefault();
      event.stopPropagation();
    }
  };
  root.ownerDocument.body.addEventListener("mousedown", onMouseDown, { capture: true });
  root.ownerDocument.body.addEventListener("contextmenu", onContextMenu, { capture: true });
  return () => {
    root.ownerDocument.body.removeEventListener("mousedown", onMouseDown, { capture: true });
    root.ownerDocument.body.removeEventListener("contextmenu", onContextMenu, { capture: true });
  };
}
