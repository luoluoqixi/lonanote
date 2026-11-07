import { useRef } from "react";

import { editorWindowService } from "@/components/editor/controllers/editor_window_service";
import {
  WORKSPACE_FILE_DRAG_TYPE,
  WORKSPACE_TREE_DRAG_TYPE,
} from "@/components/editor/controllers/workspace_file_drag";

import type { TreeDragInputProps } from "./tree_drag_input";

/** 原生 HTML 拖放可以跨 WebView；树内目录移动继续复用现有命中和滚动逻辑。 */
export function TreeDragInput(props: TreeDragInputProps) {
  const origin = useRef({ x: 0, y: 0 });
  const end = () => {
    document.documentElement.removeAttribute("data-workspace-tree-native-drag");
    props.onFinish(false);
  };
  return (
    <div
      ref={(node) => props.viewRef(node as never)}
      draggable={props.enabled}
      style={{ flex: 1, minHeight: 0, minWidth: 0, display: "flex" }}
      onMouseDownCapture={(event) => {
        origin.current = { x: event.clientX, y: event.clientY };
      }}
      onDragStart={(event) => {
        const data = props.nativeData?.(origin.current.x, origin.current.y);
        if (!data) {
          event.preventDefault();
          return;
        }
        const b = editorWindowService.getBootstrapSnapshot();
        event.dataTransfer.setData(WORKSPACE_TREE_DRAG_TYPE, "true");
        if (data.files.length)
          event.dataTransfer.setData(
            WORKSPACE_FILE_DRAG_TYPE,
            JSON.stringify({
              token: editorWindowService.beginWorkspaceFileDrag(data.workspaceId, data.files),
              sessionId: b?.sessionId ?? "local",
              ownerWindowLabel: b?.ownerWindowLabel ?? "local",
            }),
          );
        event.dataTransfer.effectAllowed = "copyMove";
        const badge = document.createElement("div");
        badge.textContent = data.label;
        Object.assign(badge.style, {
          position: "fixed",
          top: "-100px",
          padding: "6px 12px",
          borderRadius: "16px",
          background: "#f5f5f5",
          color: "#333",
          border: "1px solid #7893ef",
          fontSize: "12px",
        });
        document.body.append(badge);
        event.dataTransfer.setDragImage(badge, -14, -18);
        setTimeout(() => badge.remove(), 0);
        document.documentElement.setAttribute("data-workspace-tree-native-drag", "");
        document.getSelection()?.removeAllRanges();
        props.onStart(origin.current.x, origin.current.y, event.clientX, event.clientY);
      }}
      onDrag={(event) => {
        if (event.clientX || event.clientY) props.onMove(event.clientX, event.clientY);
      }}
      onDragOver={(event) => {
        if (!event.dataTransfer.types.includes(WORKSPACE_TREE_DRAG_TYPE)) return;
        event.preventDefault();
        event.dataTransfer.dropEffect = "move";
        props.onMove(event.clientX, event.clientY);
      }}
      onDrop={(event) => {
        if (!event.dataTransfer.types.includes(WORKSPACE_TREE_DRAG_TYPE)) return;
        // 树内移动只接受本窗口正在进行的拖动；其他窗口没有本地 session。
        event.preventDefault();
        props.onMove(event.clientX, event.clientY);
        props.onFinish(true);
      }}
      onDragEnd={end}
    >
      {props.children}
    </div>
  );
}
