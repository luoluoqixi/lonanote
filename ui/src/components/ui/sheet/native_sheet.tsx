import type { TrueSheetProps } from "@lodev09/react-native-true-sheet";
import { useEffect, useMemo, useRef, useState } from "react";
import { useWindowDimensions } from "react-native";

import { os } from "@/api/common/platform";
import {
  dismissTrueSheet,
  presentTrueSheet,
  resizeTrueSheet,
} from "@/components/ui/true_sheet/api";
import { TrueSheetPanel } from "@/components/ui/true_sheet/panel";
import { useScreenOverlayPortalHost } from "@/components/ui/utils/screen_overlay_portal";

import { useSheetOpenState } from "./sheet/useSheetOpenState";
import type { SheetProps } from "./types";

let nativeSheetCounter = 0;

type NativeSheetDetent = NonNullable<TrueSheetProps["detents"]>[number];
type NativeDetentNormalization = {
  detents: NativeSheetDetent[];
  toNativeIndex: (index: number) => number;
  fromNativeIndex: (index: number) => number;
};

function isSupportedNativeSheetPlatform() {
  const platform = os();
  return platform === "ios" || platform === "android";
}

function resolveDefaultNativeEnabled() {
  return os() === "ios";
}

function normalizePercentDetent(point: number) {
  return Math.max(0.01, Math.min(1, point / 100));
}

function isSupportedDetentString(point: string) {
  return point === "fit" || /^(\d+(?:\.\d+)?)%$/.test(point.trim());
}

function normalizeConstantDetent(point: number, windowHeight: number) {
  if (!Number.isFinite(windowHeight) || windowHeight <= 0) {
    return null;
  }

  return Math.max(0.01, Math.min(1, point / windowHeight));
}

function resolveNativeDetent(
  point: string | number,
  snapPointsMode: SheetProps["snapPointsMode"],
  windowHeight: number,
): NativeSheetDetent | null {
  if (point === "fit") {
    return "auto";
  }

  if (typeof point === "number") {
    if (snapPointsMode === "constant") {
      return normalizeConstantDetent(point, windowHeight);
    }

    if (snapPointsMode === "percent" || snapPointsMode === "mixed" || snapPointsMode == null) {
      return normalizePercentDetent(point);
    }

    return null;
  }

  const matchedPercent = point.trim().match(/^(\d+(?:\.\d+)?)%$/);

  if (matchedPercent != null) {
    return normalizePercentDetent(Number.parseFloat(matchedPercent[1]));
  }

  return null;
}

function resolveNativeDetents(
  snapPoints: SheetProps["snapPoints"],
  snapPointsMode: SheetProps["snapPointsMode"],
  windowHeight: number,
): NativeDetentNormalization | null {
  if (snapPointsMode === "fit") {
    return {
      detents: ["auto"] satisfies NativeSheetDetent[],
      toNativeIndex: (index: number) => index,
      fromNativeIndex: (index: number) => index,
    };
  }

  if (snapPoints == null || snapPoints.length === 0) {
    return {
      detents: [1] satisfies NativeSheetDetent[],
      toNativeIndex: (index: number) => index,
      fromNativeIndex: (index: number) => index,
    };
  }

  if (snapPoints.length > 3) {
    return null;
  }

  const detents = snapPoints
    .map((point) => resolveNativeDetent(point, snapPointsMode, windowHeight))
    .filter((point): point is NativeSheetDetent => point != null);

  if (detents.length !== snapPoints.length) {
    return null;
  }

  const indexedDetents = detents.map((detent, originalIndex) => ({
    detent,
    originalIndex,
  }));
  const normalizedDetents = [...indexedDetents].sort((left, right) => {
    if (left.detent === "auto") {
      return right.detent === "auto" ? 0 : -1;
    }

    if (right.detent === "auto") {
      return 1;
    }

    return left.detent - right.detent;
  });

  const originalToNative = new Map<number, number>();
  const nativeToOriginal = new Map<number, number>();

  normalizedDetents.forEach((entry, nativeIndex) => {
    originalToNative.set(entry.originalIndex, nativeIndex);
    nativeToOriginal.set(nativeIndex, entry.originalIndex);
  });

  return {
    detents: normalizedDetents.map((entry) => entry.detent),
    toNativeIndex: (index: number) => originalToNative.get(index) ?? index,
    fromNativeIndex: (index: number) => nativeToOriginal.get(index) ?? index,
  };
}

function clampDetentIndex(index: number | undefined, detents: NativeSheetDetent[]) {
  if (detents.length === 0) {
    return 0;
  }

  if (index == null || !Number.isFinite(index)) {
    return 0;
  }

  return Math.max(0, Math.min(detents.length - 1, Math.round(index)));
}

export function shouldUseNativeSheet(props: SheetProps) {
  if (!isSupportedNativeSheetPlatform()) {
    return false;
  }

  const native = props.native ?? resolveDefaultNativeEnabled();

  if (!native || props.modal === false) {
    return false;
  }

  if (props.containerComponent != null) {
    return false;
  }

  if (props.snapPoints != null && props.snapPoints.length > 3) {
    return false;
  }

  if (
    props.snapPoints?.some((point) => typeof point === "string" && !isSupportedDetentString(point))
  ) {
    return false;
  }

  return true;
}

export function NativeSheet(props: SheetProps & { children: React.ReactNode }) {
  const {
    children,
    defaultPosition,
    dismissOnBackPress = true,
    dismissOnOverlayPress = true,
    disableDrag,
    handle,
    onAnimationComplete,
    onPositionChange,
    overlay,
    position,
    snapPoints,
    snapPointsMode,
  } = props;
  const { height: windowHeight } = useWindowDimensions();
  const screenOverlayPortalHost = useScreenOverlayPortalHost();
  const [sheetName] = useState(() => `ui-sheet-native-${++nativeSheetCounter}`);
  const [uncontrolledPosition, setUncontrolledPosition] = useState(defaultPosition ?? 0);
  const openState = useSheetOpenState(props);
  const presentedRef = useRef(false);
  const lastRequestedPositionRef = useRef<number | null>(null);
  const detentNormalization = useMemo(
    () => resolveNativeDetents(snapPoints, snapPointsMode, windowHeight),
    [snapPoints, snapPointsMode, windowHeight],
  );
  const detents = detentNormalization?.detents ?? [1];

  const resolvedOpen = openState.open;
  const resolvedPosition = position ?? uncontrolledPosition;
  const clampedSourceIndex = clampDetentIndex(resolvedPosition, detents);
  const resolvedDetentIndex = detentNormalization?.toNativeIndex(clampedSourceIndex) ?? 0;

  useEffect(() => {
    if (detentNormalization == null) {
      return;
    }

    if (!resolvedOpen) {
      if (!presentedRef.current) {
        return;
      }

      dismissTrueSheet(sheetName).catch(() => undefined);
      return;
    }

    if (!presentedRef.current) {
      lastRequestedPositionRef.current = resolvedDetentIndex;
      presentTrueSheet(sheetName, resolvedDetentIndex).catch(() => undefined);
      return;
    }

    if (lastRequestedPositionRef.current === resolvedDetentIndex) {
      return;
    }

    lastRequestedPositionRef.current = resolvedDetentIndex;
    resizeTrueSheet(sheetName, resolvedDetentIndex).catch(() => undefined);
  }, [detentNormalization, resolvedDetentIndex, resolvedOpen, sheetName]);

  const handleOpenChange = (nextOpen: boolean) => {
    openState.setOpen(nextOpen);
  };

  const handlePositionChange = (nextPosition: number) => {
    const sourceIndex = detentNormalization?.fromNativeIndex(nextPosition) ?? nextPosition;
    lastRequestedPositionRef.current = sourceIndex;
    if (position == null) {
      setUncontrolledPosition(sourceIndex);
    }
    onPositionChange?.(sourceIndex);
  };

  const sheetProps: Omit<TrueSheetProps, "children" | "header" | "name"> = {
    detents,
    dimmed: overlay ?? true,
    dismissible: dismissOnOverlayPress !== false,
    draggable: disableDrag !== true,
    grabber: handle ?? false,
    onBackPress: dismissOnBackPress
      ? () => {
          handleOpenChange(false);
          return true;
        }
      : undefined,
    onDetentChange: (event) => {
      handlePositionChange(event.nativeEvent.index);
    },
    onDidDismiss: () => {
      presentedRef.current = false;
      lastRequestedPositionRef.current = null;
      handleOpenChange(false);
      openState.controller?.onAnimationComplete?.({ open: false });
      onAnimationComplete?.({ open: false });
    },
    onDidPresent: (event) => {
      presentedRef.current = true;
      lastRequestedPositionRef.current = event.nativeEvent.index;
      handlePositionChange(event.nativeEvent.index);
      openState.controller?.onAnimationComplete?.({ open: true });
      onAnimationComplete?.({ open: true });
    },
    onPositionChange: (event) => {
      if (!event.nativeEvent.realtime) {
        handlePositionChange(event.nativeEvent.index);
      }
    },
  };

  return (
    <TrueSheetPanel
      name={sheetName}
      overlayPortalHostName={screenOverlayPortalHost ?? undefined}
      onRequestClose={() => {
        handleOpenChange(false);
      }}
      sheetProps={sheetProps}
    >
      {children}
    </TrueSheetPanel>
  );
}
