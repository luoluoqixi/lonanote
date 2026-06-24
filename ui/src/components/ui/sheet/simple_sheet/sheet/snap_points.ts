export function parsePercentSnapPoint(point: string | number): number | null {
  if (typeof point === "number") {
    return Number.isFinite(point) ? point : null;
  }

  const matchedPercent = point.trim().match(/^(\d+(?:\.\d+)?)%$/);
  return matchedPercent == null ? null : Number.parseFloat(matchedPercent[1]);
}

export function isValidPercentSnapPoint(point: string | number): boolean {
  const percent = parsePercentSnapPoint(point);
  return percent != null && percent >= 0 && percent <= 100;
}

export function percentSnapPointToSize(
  point: string | number | undefined,
  screenSize: number,
): number {
  const percent = point == null ? null : parsePercentSnapPoint(point);
  return percent == null ? 0 : (percent / 100) * screenSize;
}
