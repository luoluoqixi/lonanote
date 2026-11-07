import { type ReactNode, useEffect, useState } from "react";
import { useUiTheme } from "rn-ui-kit";

import { editorWindowService } from "../controllers/editor_window_service";
import { EDITOR_TAB_DRAG_TYPE, parseEditorTabDragData } from "./editor_tab_drag_data";

/** 使用实际 DOM 几何，让空白区、横向滚动及跨窗口拖入共用同一个落点。 */
function getInsertion(container: HTMLElement, x: number) {
  const bounds = container.getBoundingClientRect();
  const tabs = Array.from(container.querySelectorAll<HTMLElement>("[data-editor-tab-id]"));
  const next = tabs.find((tab) => {
    const rect = tab.getBoundingClientRect();
    return x < rect.left + rect.width / 2;
  });
  const edge =
    next?.getBoundingClientRect().left ?? tabs.at(-1)?.getBoundingClientRect().right ?? bounds.left;
  return {
    beforeId: next?.dataset.editorTabId ?? null,
    left: Math.max(0, Math.min(Math.max(0, bounds.width - 2), edge - bounds.left)),
  };
}

export function EditorTabDropTarget({
  children,
  groupId,
  onError,
}: {
  children: ReactNode;
  groupId: string;
  onError(error: unknown): void;
}) {
  const theme = useUiTheme();
  const [insertion, setInsertion] = useState<ReturnType<typeof getInsertion> | null>(null);
  useEffect(() => {
    const end = () => setInsertion(null);
    document.addEventListener("dragend", end);
    document.addEventListener("drop", end, true);
    window.addEventListener("blur", end);
    return () => {
      document.removeEventListener("dragend", end);
      document.removeEventListener("drop", end, true);
      window.removeEventListener("blur", end);
    };
  }, []);
  return (
    <div
      style={{ display: "flex", flex: 1, minWidth: 0, position: "relative" }}
      onDragOver={(event) => {
        if (!event.dataTransfer.types.includes(EDITOR_TAB_DRAG_TYPE)) return;
        event.preventDefault();
        event.stopPropagation();
        event.dataTransfer.dropEffect = "move";
        setInsertion(getInsertion(event.currentTarget, event.clientX));
      }}
      onDragLeave={(event) => {
        if (!event.currentTarget.contains(event.relatedTarget as Node | null)) setInsertion(null);
      }}
      onDrop={(event) => {
        if (!event.dataTransfer.types.includes(EDITOR_TAB_DRAG_TYPE)) return;
        event.preventDefault();
        event.stopPropagation();
        setInsertion(null);
        const data = parseEditorTabDragData(event.dataTransfer.getData(EDITOR_TAB_DRAG_TYPE));
        if (!data) return;
        const bootstrap = editorWindowService.getBootstrapSnapshot();
        if (data.sessionId !== (bootstrap?.sessionId ?? "local")) {
          onError(new Error("只能在同一工作区所属窗口间移动标签"));
          return;
        }
        const { beforeId } = getInsertion(event.currentTarget, event.clientX);
        if (data.windowLabel === (bootstrap?.windowLabel ?? "local")) {
          void editorWindowService.moveTabToGroup(data.editorId, groupId, beforeId).catch(onError);
        } else void editorWindowService.dropTab(data.token, groupId, beforeId).catch(onError);
        document.documentElement.removeAttribute("data-editor-tab-dragging");
      }}
      data-editor-tab-drop-active={insertion ? "true" : undefined}
    >
      {children}
      {insertion && (
        <div
          aria-hidden
          data-editor-tab-insertion-marker
          style={{
            pointerEvents: "none",
            position: "absolute",
            top: 2,
            bottom: 2,
            left: insertion.left,
            width: 2,
            backgroundColor: theme.primary,
            zIndex: 10,
          }}
        />
      )}
    </div>
  );
}
