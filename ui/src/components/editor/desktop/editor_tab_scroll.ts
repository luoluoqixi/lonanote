/** 计算让标签完整可见所需的最小横向滚动。 */
export function getEditorTabScrollTarget(
  bounds: { x: number; width: number },
  left: number,
  viewportWidth: number,
): number | null {
  if (viewportWidth <= 0) return null;
  if (bounds.width >= viewportWidth) return bounds.x === left ? null : Math.max(0, bounds.x);
  if (bounds.x < left) return bounds.x;
  if (bounds.x + bounds.width > left + viewportWidth)
    return bounds.x + bounds.width - viewportWidth;
  return null;
}

/** 使用主轴位移，避免触控板斜向手势被重复累加。 */
export function getEditorTabWheelDelta(
  event: { deltaX: number; deltaY: number; deltaMode: number; ctrlKey: boolean },
  viewportWidth: number,
): number {
  if (event.ctrlKey) return 0;
  const delta = Math.abs(event.deltaX) > Math.abs(event.deltaY) ? event.deltaX : event.deltaY;
  const unit = event.deltaMode === 1 ? 16 : event.deltaMode === 2 ? viewportWidth : 1;
  return delta * unit;
}

/** 滑块保持最小可见宽度，并将滚动位置限制在轨道内。 */
export function getEditorTabScrollbar(
  viewportWidth: number,
  contentWidth: number,
  scrollLeft: number,
) {
  if (viewportWidth <= 0 || contentWidth <= viewportWidth) return null;
  const width = Math.min(
    viewportWidth,
    Math.max(24, (viewportWidth * viewportWidth) / contentWidth),
  );
  const progress = Math.max(0, Math.min(1, scrollLeft / (contentWidth - viewportWidth)));
  return { width, left: progress * (viewportWidth - width) };
}

/** 将滑块在轨道中的位置换算为内容偏移，兼容最小滑块宽度。 */
export function getEditorTabScrollFromThumb(
  viewportWidth: number,
  contentWidth: number,
  thumbLeft: number,
): number {
  const thumb = getEditorTabScrollbar(viewportWidth, contentWidth, 0);
  if (!thumb || viewportWidth <= thumb.width) return 0;
  const progress = Math.max(0, Math.min(1, thumbLeft / (viewportWidth - thumb.width)));
  return progress * (contentWidth - viewportWidth);
}
