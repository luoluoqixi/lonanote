import { parsePercentSnapPoint, percentSnapPointToSize } from "./snap_points";
import type { SheetContextValue } from "./useSheetProviderProps";

export const useSheetOffscreenSize = ({
  snapPoints,
  position,
  screenSize,
  // frameSize,
  snapPointsMode,
}: SheetContextValue) => {
  if (snapPointsMode === "fit") {
    return 0;
  }

  if (snapPointsMode === "constant") {
    const maxSize = Number(snapPoints[0]);
    const currentSize = Number(snapPoints[position] ?? 0);
    const offscreenSize = maxSize - currentSize;
    return offscreenSize;
  }

  if (snapPointsMode === "percent") {
    const maxPercentOpened = (parsePercentSnapPoint(snapPoints[0] ?? 0) ?? 0) / 100;
    const percentOpened = (parsePercentSnapPoint(snapPoints[position] ?? 0) ?? 0) / 100;
    const percentHidden = maxPercentOpened - percentOpened;
    const offscreenSize = percentHidden * screenSize;
    return offscreenSize;
  }

  // mixed:
  const maxSnapPoint = snapPoints[0];
  if (maxSnapPoint === "fit") {
    return 0;
  }

  const maxSize =
    typeof maxSnapPoint === "string"
      ? percentSnapPointToSize(maxSnapPoint, screenSize)
      : maxSnapPoint;
  const currentSnapPoint = snapPoints[position] ?? 0;
  const currentSize =
    typeof currentSnapPoint === "string"
      ? percentSnapPointToSize(currentSnapPoint, screenSize)
      : currentSnapPoint;
  const offscreenSize = maxSize - currentSize;
  if (Number.isNaN(offscreenSize)) {
    return 0;
  }
  return offscreenSize;
};
