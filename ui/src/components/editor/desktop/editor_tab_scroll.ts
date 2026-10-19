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
