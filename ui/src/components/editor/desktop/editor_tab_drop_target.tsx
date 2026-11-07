import type { ReactNode } from "react";

export function EditorTabDropTarget({
  children,
}: {
  children: ReactNode;
  groupId: string;
  onError(error: unknown): void;
}) {
  return <>{children}</>;
}
