import type { ReactNode } from "react";

import { isDesktop, os } from "@/api/common/platform";

export function DesktopEditorSurface({
  active,
  backgroundColor,
  children,
}: {
  active: boolean;
  backgroundColor: string;
  children: ReactNode;
}) {
  // macOS 的 iframe 被 display/visibility 隐藏后，原生滚动条可能不再响应 wheel 绘制。
  // 保留布局与绘制，活动页的不透明底色覆盖后台页；inert 隔离后台焦点和辅助功能。
  const keepRendered = isDesktop() && os() === "macos";
  return (
    <div
      aria-hidden={!active || undefined}
      inert={!active}
      style={{
        backgroundColor,
        display: keepRendered || active ? "flex" : "none",
        flexDirection: "column",
        flex: 1,
        minHeight: 0,
        ...(keepRendered
          ? {
              position: "absolute",
              inset: 0,
              zIndex: active ? 1 : 0,
              pointerEvents: active ? "auto" : "none",
            }
          : {}),
      }}
    >
      {children}
    </div>
  );
}
