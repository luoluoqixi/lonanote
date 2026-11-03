import type { ReactNode } from "react";

export function DesktopSidePanelSurface({
  active,
  children,
}: {
  active: boolean;
  children: ReactNode;
}) {
  return (
    <div
      aria-hidden={!active || undefined}
      inert={!active}
      style={{
        display: "flex",
        flexDirection: "column",
        position: "absolute",
        inset: 0,
        minHeight: 0,
        minWidth: 0,
        // 保留视口尺寸，避免文件树的虚拟列表因隐藏而重新布局或丢失滚动位置。
        visibility: active ? "visible" : "hidden",
        pointerEvents: active ? "auto" : "none",
      }}
    >
      {children}
    </div>
  );
}
