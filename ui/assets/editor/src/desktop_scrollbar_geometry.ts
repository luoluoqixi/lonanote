export type ScrollbarMetrics = {
  thumbHeight: number;
  thumbTop: number;
  travel: number;
  maxScroll: number;
};

export function getScrollbarMetrics(
  viewport: number,
  content: number,
  scrollTop: number,
): ScrollbarMetrics | null {
  if (viewport <= 0 || content <= viewport) return null;
  const thumbHeight = Math.min(viewport, Math.max(24, (viewport * viewport) / content));
  const travel = viewport - thumbHeight;
  const maxScroll = content - viewport;
  return {
    thumbHeight,
    thumbTop: (Math.max(0, Math.min(maxScroll, scrollTop)) / maxScroll) * travel,
    travel,
    maxScroll,
  };
}

export function scrollTopFromThumb(top: number, metrics: ScrollbarMetrics): number {
  return metrics.travel <= 0
    ? 0
    : (Math.max(0, Math.min(metrics.travel, top)) / metrics.travel) * metrics.maxScroll;
}
