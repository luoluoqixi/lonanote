import type { ScrollView, View } from "react-native";

import { type EditorTabDragGeometry, getTabContentBounds } from "./editor_tab_reorder";

export function readEditorTabGeometry(
  scrollView: ScrollView | null,
  nodes: ReadonlyMap<string, View>,
): EditorTabDragGeometry | null {
  const viewport = scrollView?.getScrollableNode() as HTMLElement | undefined;
  if (!viewport || !viewport.clientWidth) return null;
  const rect = viewport.getBoundingClientRect();
  const scaleX = rect.width / viewport.clientWidth;
  if (!scaleX) return null;
  const bounds = new Map<string, { x: number; width: number }>();
  for (const [id, node] of nodes) {
    const element = node as unknown as HTMLElement;
    if (!element.isConnected) continue;
    const tab = element.getBoundingClientRect();
    bounds.set(
      id,
      getTabContentBounds(rect.left, scaleX, viewport.scrollLeft, tab.left, tab.width),
    );
  }
  return {
    left: rect.left,
    top: rect.top,
    width: viewport.clientWidth,
    height: rect.height,
    scaleX,
    scrollLeft: viewport.scrollLeft,
    contentWidth: viewport.scrollWidth,
    bounds,
  };
}
