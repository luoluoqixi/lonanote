export type EditorTabDragGeometry = {
  left: number;
  top: number;
  width: number;
  height: number;
  scaleX: number;
  scrollLeft: number;
  contentWidth: number;
  bounds: ReadonlyMap<string, { x: number; width: number }>;
};

/** 将视口中的实际矩形统一为 ScrollView 内容坐标，不能依赖手势包装层的 offsetParent。 */
export function getTabContentBounds(
  viewportLeft: number,
  scaleX: number,
  scrollLeft: number,
  tabLeft: number,
  tabWidth: number,
) {
  return { x: (tabLeft - viewportLeft) / scaleX + scrollLeft, width: tabWidth / scaleX };
}

export function getTabDropTarget(
  ids: string[],
  bounds: ReadonlyMap<string, { x: number; width: number }>,
  draggedId: string,
  x: number,
) {
  let end = 0;
  for (const id of ids) {
    const tab = bounds.get(id);
    if (!tab) continue;
    end = tab.x + tab.width;
    if (id !== draggedId && x < tab.x + tab.width / 2) return { beforeId: id, x: tab.x };
  }
  return { beforeId: null, x: end };
}

/** 速度单位为 px/s，离边缘越近滚动越快。 */
export function getTabDragScrollSpeed(x: number, width: number) {
  if (x < 0 || x > width || width <= 0) return 0;
  const edge = Math.min(40, width / 3);
  if (x < edge) return -600 * (1 - x / edge);
  if (x > width - edge) return 600 * (1 - (width - x) / edge);
  return 0;
}
