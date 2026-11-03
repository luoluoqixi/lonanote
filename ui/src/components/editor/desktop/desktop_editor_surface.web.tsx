import type { ReactNode } from "react";

export function DesktopEditorSurface({
  active,
  backgroundColor,
  children,
}: {
  active: boolean;
  backgroundColor: string;
  children: ReactNode;
}) {
  // 每个 editor 保留自己的 iframe 和视口尺寸，避免 display:none 使滚动位置重置。
  // 活动页的不透明底色覆盖后台页；inert 隔离后台焦点和辅助功能，关闭标签时才销毁。
  return (
    <div
      aria-hidden={!active || undefined}
      inert={!active}
      style={{
        backgroundColor,
        display: "flex",
        flexDirection: "column",
        flex: 1,
        minHeight: 0,
        position: "absolute",
        inset: 0,
        zIndex: active ? 1 : 0,
        pointerEvents: active ? "auto" : "none",
      }}
    >
      {children}
    </div>
  );
}
