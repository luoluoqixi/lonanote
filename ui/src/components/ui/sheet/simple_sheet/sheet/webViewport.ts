/**
 * Web viewport helper for keeping offscreen sheet content below the largest
 * visible area mobile Safari can expose while its browser chrome retracts.
 */
let maxViewportHeight = 0;

export function getMaxViewportHeight(): number {
  if (typeof window === "undefined") {
    return 0;
  }

  const documentHeight =
    typeof document !== "undefined" ? document.documentElement?.clientHeight : 0;

  maxViewportHeight = Math.max(
    maxViewportHeight,
    documentHeight || 0,
    window.innerHeight || 0,
    window.visualViewport?.height || 0,
    window.screen?.height || 0,
  );

  return maxViewportHeight;
}
