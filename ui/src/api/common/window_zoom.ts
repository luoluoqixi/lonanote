export const MIN_WINDOW_ZOOM = 0.25;
export const MAX_WINDOW_ZOOM = 5;

/** 应用支持的缩放范围；各系统 WebView 的内部硬边界并不统一公开。 */
export function clampWindowZoom(value: number): number {
  return Number.isFinite(value)
    ? Math.min(MAX_WINDOW_ZOOM, Math.max(MIN_WINDOW_ZOOM, Math.round(value * 100) / 100))
    : 1;
}

export function stepWindowZoom(value: number, direction: 1 | -1): number {
  return clampWindowZoom(value + direction * 0.1);
}
