import type { EditorPlatform } from "../bridge/protocol";
import type { LonaEditor } from "./editor";

type BackgroundFocusSession = {
  editor: LonaEditor;
  runtime: { platform: EditorPlatform };
  documentReadOnly: boolean;
  inputEnabled: boolean;
};

/** 桌面文末背景用 mousedown 接管，防止浏览器在重复点击时清除原生输入选区。 */
export function installDesktopBackgroundFocus(
  root: HTMLElement,
  getSession: () => BackgroundFocusSession | null,
): () => void {
  const onMouseDown = (event: MouseEvent) => {
    const session = getSession();
    if (
      !session ||
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
    if (!session.editor.focus({ x: event.clientX, y: event.clientY }, { allowDocumentEnd: true })) {
      return;
    }
    event.preventDefault();
    event.stopPropagation();
  };
  root.ownerDocument.body.addEventListener("mousedown", onMouseDown, { capture: true });
  return () => {
    root.ownerDocument.body.removeEventListener("mousedown", onMouseDown, { capture: true });
  };
}
