import { useMemo } from "react";
import { StyleSheet } from "react-native";

import { isWeb } from "@/api/common/platform";
import { Sheet as ReplicaSheet } from "@/components/ui/sheet/sheet/replica_sheet/Sheet";
import type { SnapPointsMode } from "@/components/ui/sheet/sheet/replica_sheet/types";
import { ScreenOverlayPortalProvider } from "@/components/ui/utils/screen_overlay_portal";

import type { NativeSheetProps } from "../types";

type BottomSheetPanelProps = {
  backgroundColor?: NativeSheetProps["backgroundColor"];
  children: React.ReactNode;
  dismissOnOverlayPress?: boolean;
  disableDrag?: boolean;
  enableHandle?: boolean;
  name?: string;
  onAnimationComplete?: NativeSheetProps["onAnimationComplete"];
  onOpenChange: (open: boolean) => void;
  onPositionChange?: (position: number) => void;
  open: boolean;
  overlay?: boolean;
  overlayPortalHostName?: string;
  position: number;
  snapPoints: NativeSheetProps["snapPoints"];
  snapPointsMode: NativeSheetProps["snapPointsMode"];
  transition?: NativeSheetProps["transition"];
  disableRemoveScroll?: boolean;
};

type ResolvedReplicaSheetSnapPoints = {
  snapPoints?: Array<string | number>;
  snapPointsMode: SnapPointsMode;
  toExternalIndex: (index: number) => number;
  toInternalIndex: (index: number) => number;
};

const DEFAULT_OVERLAY_ENTER_STYLE = { opacity: 0 } as const;
const DEFAULT_OVERLAY_EXIT_STYLE = { opacity: 0 } as const;
const IDENTITY_INDEX = (index: number) => index;

function normalizePercentString(point: string) {
  const matched = point.trim().match(/^(\d+(?:\.\d+)?)%$/);
  return matched == null ? null : Number.parseFloat(matched[1]);
}

function resolveReplicaSheetSnapPoints(
  snapPoints: NativeSheetProps["snapPoints"],
  snapPointsMode: NativeSheetProps["snapPointsMode"],
): ResolvedReplicaSheetSnapPoints {
  if (snapPointsMode === "fit") {
    return {
      snapPoints: ["fit"],
      snapPointsMode: "fit",
      toExternalIndex: IDENTITY_INDEX,
      toInternalIndex: IDENTITY_INDEX,
    };
  }

  if (snapPoints == null || snapPoints.length === 0) {
    return {
      snapPoints: [100],
      snapPointsMode: "percent",
      toExternalIndex: IDENTITY_INDEX,
      toInternalIndex: IDENTITY_INDEX,
    };
  }

  const hasFitPoint = snapPoints.some((point) => point === "fit");
  const resolvedMode =
    snapPointsMode ?? (hasFitPoint ? "mixed" : ("percent" satisfies SnapPointsMode));

  if (resolvedMode === "percent") {
    return normalizeReplicaSheetSnapPointOrder({
      snapPoints: snapPoints.map((point) =>
        typeof point === "string" ? (normalizePercentString(point) ?? point) : point,
      ),
      snapPointsMode: "percent",
    });
  }

  return normalizeReplicaSheetSnapPointOrder({
    snapPoints,
    snapPointsMode: resolvedMode,
  });
}

function normalizeReplicaSheetSnapPointOrder({
  snapPoints,
  snapPointsMode,
}: Pick<
  ResolvedReplicaSheetSnapPoints,
  "snapPoints" | "snapPointsMode"
>): ResolvedReplicaSheetSnapPoints {
  if (
    snapPoints == null ||
    snapPoints.length < 2 ||
    (snapPointsMode !== "percent" && snapPointsMode !== "constant") ||
    !snapPoints.every((point) => typeof point === "number")
  ) {
    return {
      snapPoints,
      snapPointsMode,
      toExternalIndex: IDENTITY_INDEX,
      toInternalIndex: IDENTITY_INDEX,
    };
  }

  const indexedSnapPoints = snapPoints.map((point, originalIndex) => ({
    originalIndex,
    point,
  }));
  const normalizedSnapPoints = [...indexedSnapPoints].sort(
    (left, right) => right.point - left.point,
  );

  if (
    normalizedSnapPoints.every((entry, normalizedIndex) => entry.originalIndex === normalizedIndex)
  ) {
    return {
      snapPoints,
      snapPointsMode,
      toExternalIndex: IDENTITY_INDEX,
      toInternalIndex: IDENTITY_INDEX,
    };
  }

  const originalToNormalized = new Map<number, number>();
  const normalizedToOriginal = new Map<number, number>();

  normalizedSnapPoints.forEach((entry, normalizedIndex) => {
    originalToNormalized.set(entry.originalIndex, normalizedIndex);
    normalizedToOriginal.set(normalizedIndex, entry.originalIndex);
  });

  return {
    snapPoints: normalizedSnapPoints.map((entry) => entry.point),
    snapPointsMode,
    toExternalIndex: (index: number) => normalizedToOriginal.get(index) ?? index,
    toInternalIndex: (index: number) => originalToNormalized.get(index) ?? index,
  };
}

export function BottomSheetPanel({
  backgroundColor,
  children,
  dismissOnOverlayPress = true,
  disableDrag,
  enableHandle = true,
  onAnimationComplete,
  onOpenChange,
  onPositionChange,
  open,
  overlay = true,
  overlayPortalHostName,
  position,
  snapPoints,
  snapPointsMode,
  transition = "200ms",
  disableRemoveScroll,
}: BottomSheetPanelProps) {
  const {
    snapPoints: resolvedSnapPoints,
    snapPointsMode: resolvedSnapPointsMode,
    toExternalIndex,
    toInternalIndex,
  } = useMemo(
    () => resolveReplicaSheetSnapPoints(snapPoints, snapPointsMode),
    [snapPoints, snapPointsMode],
  );
  const externalPosition = Number.isFinite(position) ? Math.max(0, Math.round(position)) : 0;
  const resolvedPosition = toInternalIndex(externalPosition);
  const resolvedOnPositionChange = useMemo(() => {
    if (onPositionChange == null) {
      return undefined;
    }

    return (nextPosition: number) => {
      onPositionChange(toExternalIndex(nextPosition));
    };
  }, [onPositionChange, toExternalIndex]);

  const body =
    overlayPortalHostName != null ? (
      <ScreenOverlayPortalProvider hostName={overlayPortalHostName}>
        {children}
      </ScreenOverlayPortalProvider>
    ) : (
      children
    );

  return (
    <ReplicaSheet
      disableDrag={disableDrag}
      dismissOnOverlayPress={dismissOnOverlayPress}
      dismissOnSnapToBottom
      modal
      onAnimationComplete={onAnimationComplete}
      onOpenChange={onOpenChange}
      onPositionChange={resolvedOnPositionChange}
      open={open}
      position={resolvedPosition}
      snapPoints={resolvedSnapPoints}
      snapPointsMode={resolvedSnapPointsMode}
      transition={transition}
      disableRemoveScroll={disableRemoveScroll ?? isWeb()}
    >
      {overlay ? (
        <ReplicaSheet.Overlay
          bg="$shadowColor"
          enterStyle={DEFAULT_OVERLAY_ENTER_STYLE}
          exitStyle={DEFAULT_OVERLAY_EXIT_STYLE}
          opacity={0.5}
          transition="lazy"
        />
      ) : null}
      {enableHandle ? <ReplicaSheet.Handle /> : null}
      <ReplicaSheet.Frame
        style={[styles.content, backgroundColor != null ? { backgroundColor } : null]}
      >
        {body}
      </ReplicaSheet.Frame>
    </ReplicaSheet>
  );
}

const styles = StyleSheet.create({
  content: {
    flex: 1,
    minHeight: 1,
  },
});
