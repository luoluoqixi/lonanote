import { useState } from "react";

import { editorWindows } from "@/api/commands/win/editor_windows";
import { isTauri } from "@/api/common/platform";

import { editorWindowService } from "../controllers/editor_window_service";
import { EDITOR_TAB_DRAG_TYPE } from "./editor_tab_drag_data";
import type { EditorTabDragInputProps } from "./editor_tab_drag_input";

/** 使用浏览器原生拖放才能跨 WebView 窗口，文档交接仍由 owner 验证和执行。 */
export function EditorTabDragInput(props: EditorTabDragInputProps) {
  const [dragging, setDragging] = useState(false);
  const end = () => {
    setDragging(false);
    document.documentElement.removeAttribute("data-editor-tab-dragging");
  };
  return (
    <div
      ref={(node) => props.viewRef(node as never)}
      data-editor-tab-id={props.editorId}
      draggable={props.enabled}
      style={{
        flexShrink: 0,
        height: 36,
        opacity: dragging ? 0.35 : 1,
        userSelect: "none",
        cursor: "default",
      }}
      onDragStart={(event) => {
        const bootstrap = editorWindowService.getBootstrapSnapshot();
        const token = crypto.randomUUID();
        if (isTauri()) void editorWindows.beginTabDrag(token, props.editorId).catch(console.error);
        event.dataTransfer.setData(
          EDITOR_TAB_DRAG_TYPE,
          JSON.stringify({
            editorId: props.editorId,
            windowLabel: bootstrap?.windowLabel ?? "local",
            sessionId: bootstrap?.sessionId ?? "local",
            token,
          }),
        );
        event.dataTransfer.effectAllowed = "move";
        document.documentElement.setAttribute("data-editor-tab-dragging", "");
        document.getSelection()?.removeAllRanges();
        setDragging(true);
      }}
      onDragEnd={end}
    >
      {props.children}
    </div>
  );
}
