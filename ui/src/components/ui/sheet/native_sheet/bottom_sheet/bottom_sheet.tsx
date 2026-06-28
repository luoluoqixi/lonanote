import { useEffect, useMemo } from "react";
import { BackHandler, StyleSheet } from "react-native";

import { Sheet as ReplicaSheet } from "@/components/ui/sheet/simple_sheet/sheet/Sheet";
import type { SnapPointsMode } from "@/components/ui/sheet/simple_sheet/sheet/types";
import { ScreenOverlayPortalProvider } from "@/components/ui/utils/screen_overlay_portal";

import type { NativeSheetProps } from "../types";

type BottomSheetPanelProps = {
  children: React.ReactNode;
  dismissOnBackPress?: boolean;
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
};

type ResolvedReplicaSheetSnapPoints = {
  snapPoints?: Array<string | number>;
  snapPointsMode: SnapPointsMode;
};

const DEFAULT_OVERLAY_ENTER_STYLE = { opacity: 0 } as const;
const DEFAULT_OVERLAY_EXIT_STYLE = { opacity: 0 } as const;

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
    };
  }

  if (snapPoints == null || snapPoints.length === 0) {
    return {
      snapPoints: [100],
      snapPointsMode: "percent",
    };
  }

  const hasFitPoint = snapPoints.some((point) => point === "fit");
  const resolvedMode =
    snapPointsMode ?? (hasFitPoint ? "mixed" : ("percent" satisfies SnapPointsMode));

  if (resolvedMode === "percent") {
    return {
      snapPoints: snapPoints.map((point) =>
        typeof point === "string" ? (normalizePercentString(point) ?? point) : point,
      ),
      snapPointsMode: "percent",
    };
  }

  return {
    snapPoints,
    snapPointsMode: resolvedMode,
  };
}

export function BottomSheetPanel({
  children,
  dismissOnBackPress = true,
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
}: BottomSheetPanelProps) {
  const { snapPoints: resolvedSnapPoints, snapPointsMode: resolvedSnapPointsMode } = useMemo(
    () => resolveReplicaSheetSnapPoints(snapPoints, snapPointsMode),
    [snapPoints, snapPointsMode],
  );
  const resolvedPosition = Number.isFinite(position) ? Math.max(0, Math.round(position)) : 0;

  useEffect(() => {
    if (!open || !dismissOnBackPress) {
      return;
    }

    const subscription = BackHandler.addEventListener("hardwareBackPress", () => {
      onOpenChange(false);
      return true;
    });

    return () => {
      subscription.remove();
    };
  }, [dismissOnBackPress, onOpenChange, open]);

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
      onPositionChange={onPositionChange}
      open={open}
      position={resolvedPosition}
      snapPoints={resolvedSnapPoints}
      snapPointsMode={resolvedSnapPointsMode}
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
      <ReplicaSheet.Frame style={styles.content}>{body}</ReplicaSheet.Frame>
    </ReplicaSheet>
  );
}

const styles = StyleSheet.create({
  content: {
    flex: 1,
    minHeight: 1,
  },
});
