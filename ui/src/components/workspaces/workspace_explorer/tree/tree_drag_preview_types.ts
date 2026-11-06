import type { RefObject } from "react";

export type TreeDragPreviewProps = {
  pointer: RefObject<{ x: number; y: number } | null>;
  sources: string[];
  folder: boolean;
};
