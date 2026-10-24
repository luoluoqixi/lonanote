import type { ReactNode } from "react";

export function EditorTabInput({
  children,
  onMenu,
}: {
  children: ReactNode;
  onMenu(x: number, y: number): void;
}) {
  return (
    <div
      style={{ display: "contents" }}
      onContextMenu={(event) => {
        event.preventDefault();
        event.stopPropagation();
        onMenu(event.clientX, event.clientY);
      }}
      onKeyDown={(event) => {
        if (event.key !== "ContextMenu" && !(event.shiftKey && event.key === "F10")) return;
        event.preventDefault();
        event.stopPropagation();
        const rect = (event.target as HTMLElement).getBoundingClientRect();
        onMenu(rect.left, rect.bottom);
      }}
    >
      {children}
    </div>
  );
}
