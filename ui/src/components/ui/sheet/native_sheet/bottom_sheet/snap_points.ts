import type { NativeSheetProps } from "../types";

type BottomSheetSnapPoint = number | string;

export function resolveBottomSheetSnapPoints(
  snapPoints: NativeSheetProps["snapPoints"],
  snapPointsMode: NativeSheetProps["snapPointsMode"],
): {
  enableDynamicSizing: boolean;
  snapPoints: BottomSheetSnapPoint[];
} {
  if (snapPointsMode === "fit") {
    return {
      enableDynamicSizing: true,
      snapPoints: ["CONTENT_HEIGHT"],
    };
  }

  if (snapPoints == null || snapPoints.length === 0) {
    return {
      enableDynamicSizing: false,
      snapPoints: ["100%"],
    };
  }

  const resolved = snapPoints.map((point) => {
    if (point === "fit") {
      return "CONTENT_HEIGHT";
    }

    if (typeof point === "string") {
      return point;
    }

    if (snapPointsMode === "constant") {
      return point;
    }

    return `${point}%`;
  });

  return {
    enableDynamicSizing:
      snapPointsMode === "mixed" && resolved.some((point) => point === "CONTENT_HEIGHT"),
    snapPoints: resolved,
  };
}
