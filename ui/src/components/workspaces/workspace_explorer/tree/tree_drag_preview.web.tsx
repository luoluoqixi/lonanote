import { FileText, Files, Folder } from "lucide-react-native";
import { useLayoutEffect, useRef } from "react";
import { createPortal } from "react-dom";
import { useUiTheme } from "rn-ui-kit";

import type { TreeDragPreviewProps } from "./tree_drag_preview_types";

/** Portal 避免被树的滚动视口裁切；坐标直接更新 DOM，不随鼠标移动重绘整个文件树。 */
export function TreeDragPreview({ pointer, sources, folder }: TreeDragPreviewProps) {
  const theme = useUiTheme();
  const element = useRef<HTMLDivElement>(null);
  useLayoutEffect(() => {
    const html = document.documentElement;
    const previous = html.getAttribute("data-workspace-tree-dragging");
    html.setAttribute("data-workspace-tree-dragging", "");
    let frame = 0;
    const update = () => {
      const point = pointer.current;
      if (point && element.current) {
        element.current.style.transform = `translate3d(${point.x + 14}px, ${point.y + 18}px, 0)`;
      }
      frame = requestAnimationFrame(update);
    };
    update();
    return () => {
      cancelAnimationFrame(frame);
      if (previous === null) html.removeAttribute("data-workspace-tree-dragging");
      else html.setAttribute("data-workspace-tree-dragging", previous);
    };
  }, [pointer]);
  const Icon = sources.length > 1 ? Files : folder ? Folder : FileText;
  const label = sources.length > 1 ? `${sources.length} 个项目` : sources[0]?.split("/").at(-1);
  return createPortal(
    <div
      ref={element}
      data-workspace-tree-preview
      aria-hidden
      style={{
        position: "fixed",
        left: 0,
        top: 0,
        zIndex: 2147483647,
        pointerEvents: "none",
        userSelect: "none",
        display: "flex",
        alignItems: "center",
        gap: 6,
        maxWidth: 240,
        padding: "5px 9px",
        borderRadius: 16,
        border: `1px solid ${theme.primary}`,
        backgroundColor: theme.popover,
        color: theme.foreground,
        opacity: 0.75,
        fontSize: 12,
        lineHeight: "18px",
        whiteSpace: "nowrap",
        willChange: "transform",
      }}
    >
      <Icon size={16} color={theme.primary} style={{ flexShrink: 0 }} />
      <span style={{ overflow: "hidden", textOverflow: "ellipsis" }}>{label}</span>
    </div>,
    document.body,
  );
}
