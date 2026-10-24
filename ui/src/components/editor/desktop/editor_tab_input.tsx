import type { ReactNode } from "react";

export function EditorTabInput({
  children,
}: {
  children: ReactNode;
  onMenu(x: number, y: number): void;
}) {
  return <>{children}</>;
}
