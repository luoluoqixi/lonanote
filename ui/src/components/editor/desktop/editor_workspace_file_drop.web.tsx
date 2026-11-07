import { useEffect, useState } from "react";
import { createPortal } from "react-dom";

import { editorWindowService } from "../controllers/editor_window_service";
import { WORKSPACE_FILE_DRAG_TYPE } from "../controllers/workspace_file_drag";

/** 拖动时覆盖 iframe，避免它吞掉父窗口的 drop；仅处理应用内工作区文件。 */
export function EditorWorkspaceFileDrop({
  groupId,
  onError,
}: {
  groupId: string;
  onError(error: unknown): void;
}) {
  const [active, setActive] = useState(false);
  useEffect(() => {
    const enter = (event: DragEvent) => {
      if (event.dataTransfer?.types.includes(WORKSPACE_FILE_DRAG_TYPE)) setActive(true);
    };
    const end = () => setActive(false);
    const leave = (event: DragEvent) => {
      if (
        !event.relatedTarget &&
        (event.clientX <= 0 ||
          event.clientY <= 0 ||
          event.clientX >= window.innerWidth ||
          event.clientY >= window.innerHeight)
      )
        end();
    };
    document.addEventListener("dragenter", enter);
    document.addEventListener("dragover", enter);
    document.addEventListener("drop", end);
    document.addEventListener("dragend", end);
    document.addEventListener("dragleave", leave);
    document.addEventListener("lonanote:workspace-file-drop-end", end);
    window.addEventListener("blur", end);
    return () => {
      document.removeEventListener("dragenter", enter);
      document.removeEventListener("dragover", enter);
      document.removeEventListener("drop", end);
      document.removeEventListener("dragend", end);
      document.removeEventListener("dragleave", leave);
      document.removeEventListener("lonanote:workspace-file-drop-end", end);
      window.removeEventListener("blur", end);
    };
  }, []);
  if (!active) return null;
  const rect = document.getElementById(`desktop-editor-group-${groupId}`)?.getBoundingClientRect();
  if (!rect) return null;
  return createPortal(
    <div
      data-workspace-file-drop={groupId}
      style={{
        position: "fixed",
        left: rect.left,
        top: rect.top,
        width: rect.width,
        height: rect.height,
        zIndex: 2147483640,
        cursor: "default",
      }}
      onDragOver={(event) => {
        if (event.dataTransfer.types.includes(WORKSPACE_FILE_DRAG_TYPE)) {
          event.preventDefault();
          event.dataTransfer.dropEffect = "copy";
        }
      }}
      onDrop={(event) => {
        event.preventDefault();
        event.stopPropagation();
        setActive(false);
        document.dispatchEvent(new Event("lonanote:workspace-file-drop-end"));
        try {
          const raw = event.dataTransfer.getData(WORKSPACE_FILE_DRAG_TYPE);
          if (raw.length > 2048) throw new Error("无效的文件拖放数据");
          const data = JSON.parse(raw);
          const bootstrap = editorWindowService.getBootstrapSnapshot();
          if (
            typeof data.token !== "string" ||
            data.sessionId !== (bootstrap?.sessionId ?? "local") ||
            data.ownerWindowLabel !== (bootstrap?.ownerWindowLabel ?? "local")
          )
            throw new Error("只能打开当前工作区所属窗口拖出的文件");
          void editorWindowService.dropWorkspaceFiles(data.token, groupId).catch(onError);
        } catch (error) {
          onError(error);
        }
      }}
    />,
    document.body,
  );
}
