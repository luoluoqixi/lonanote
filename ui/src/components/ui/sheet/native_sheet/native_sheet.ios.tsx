import type { TrueSheetProps } from "@lodev09/react-native-true-sheet";
import { useEffect, useMemo, useRef, useState } from "react";
import { useWindowDimensions } from "react-native";

import { iosMajorVersion } from "@/api/common/platform";

import { dismissTrueSheet, presentTrueSheet, resizeTrueSheet } from "./true_sheet";
import { TrueSheetPanel } from "./true_sheet/panel";
import type { NativeSheetProps } from "./types";

let nativeSheetCounter = 0;

type NativeSheetDetent = NonNullable<TrueSheetProps["detents"]>[number];
type NativeDetentNormalization = {
  detents: NativeSheetDetent[];
  sourceDetentCount: number;
  toNativeIndex: (index: number) => number;
  fromNativeIndex: (index: number) => number;
};

function useControllableNativeSheetState({
  defaultOpen = false,
  defaultPosition = 0,
  onOpenChange,
  onPositionChange,
  open: openProp,
  position: positionProp,
}: Pick<
  NativeSheetProps,
  "defaultOpen" | "defaultPosition" | "onOpenChange" | "onPositionChange" | "open" | "position"
>) {
  const [uncontrolledOpen, setUncontrolledOpen] = useState(defaultOpen);
  const [uncontrolledPosition, setUncontrolledPosition] = useState(defaultPosition);
  const open = openProp ?? uncontrolledOpen;
  const position = positionProp ?? uncontrolledPosition;

  const setOpen = (nextOpen: boolean) => {
    if (openProp == null) {
      setUncontrolledOpen(nextOpen);
    }

    onOpenChange?.(nextOpen);
  };

  const setPosition = (nextPosition: number) => {
    if (positionProp == null) {
      setUncontrolledPosition(nextPosition);
    }

    onPositionChange?.(nextPosition);
  };

  return {
    open,
    position,
    setOpen,
    setPosition,
  };
}

function normalizePercentDetent(point: number) {
  return Math.max(0.01, Math.min(1, point / 100));
}

function normalizeConstantDetent(point: number, windowHeight: number) {
  if (!Number.isFinite(windowHeight) || windowHeight <= 0) {
    return null;
  }

  return Math.max(0.01, Math.min(1, point / windowHeight));
}

function resolveNativeDetent(
  point: string | number,
  snapPointsMode: NativeSheetProps["snapPointsMode"],
  windowHeight: number,
): NativeSheetDetent | null {
  if (point === "fit") {
    return "auto";
  }

  if (typeof point === "number") {
    if (snapPointsMode === "constant") {
      return normalizeConstantDetent(point, windowHeight);
    }

    return normalizePercentDetent(point);
  }

  const matchedPercent = point.trim().match(/^(\d+(?:\.\d+)?)%$/);
  return matchedPercent == null
    ? null
    : normalizePercentDetent(Number.parseFloat(matchedPercent[1]));
}

function supportsCustomIosDetents() {
  const iosMajor = iosMajorVersion();
  return iosMajor != null && iosMajor >= 16;
}

function normalizeIos15Detents(
  indexedDetents: Array<{ detent: NativeSheetDetent; originalIndex: number }>,
): NativeDetentNormalization {
  const sourceDetentCount = indexedDetents.length;

  if (indexedDetents.length === 1) {
    const detent = indexedDetents[0].detent;
    const nativeDetent = typeof detent === "number" && detent >= 0.75 ? 1 : 0.49;
    return {
      detents: [nativeDetent],
      sourceDetentCount,
      fromNativeIndex: () => indexedDetents[0].originalIndex,
      toNativeIndex: () => 0,
    };
  }

  const sortedDetents = [...indexedDetents].sort((left, right) => {
    if (left.detent === "auto") return -1;
    if (right.detent === "auto") return 1;
    return left.detent - right.detent;
  });
  const lowerDetent = sortedDetents[0];
  const upperDetent = sortedDetents[sortedDetents.length - 1];
  const originalToNative = new Map<number, number>();

  sortedDetents.forEach((entry, sortedIndex) => {
    originalToNative.set(entry.originalIndex, sortedIndex === 0 ? 0 : 1);
  });

  return {
    detents: [0.49, 1],
    sourceDetentCount,
    fromNativeIndex: (index: number) =>
      index <= 0 ? lowerDetent.originalIndex : upperDetent.originalIndex,
    toNativeIndex: (index: number) => originalToNative.get(index) ?? 0,
  };
}

function resolveNativeDetents(
  snapPoints: NativeSheetProps["snapPoints"],
  snapPointsMode: NativeSheetProps["snapPointsMode"],
  windowHeight: number,
): NativeDetentNormalization {
  if (snapPointsMode === "fit") {
    return {
      detents: ["auto"],
      sourceDetentCount: 1,
      fromNativeIndex: (index: number) => index,
      toNativeIndex: (index: number) => index,
    };
  }

  const sourceSnapPoints = snapPoints == null || snapPoints.length === 0 ? [100] : snapPoints;
  const detents = sourceSnapPoints
    .slice(0, 3)
    .map((point) => resolveNativeDetent(point, snapPointsMode, windowHeight))
    .filter((point): point is NativeSheetDetent => point != null);
  const indexedDetents = detents.map((detent, originalIndex) => ({
    detent,
    originalIndex,
  }));

  if (!supportsCustomIosDetents()) {
    return normalizeIos15Detents(indexedDetents);
  }

  const normalizedDetents = [...indexedDetents].sort((left, right) => {
    if (left.detent === "auto") return -1;
    if (right.detent === "auto") return 1;
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
    sourceDetentCount: sourceSnapPoints.length,
    fromNativeIndex: (index: number) => nativeToOriginal.get(index) ?? index,
    toNativeIndex: (index: number) => originalToNative.get(index) ?? index,
  };
}

function clampDetentIndex(index: number | undefined, detentCount: number) {
  if (detentCount <= 0 || index == null || !Number.isFinite(index)) {
    return 0;
  }

  return Math.max(0, Math.min(detentCount - 1, Math.round(index)));
}

export function NativeSheet({
  backgroundColor,
  children,
  content,
  defaultOpen,
  defaultPosition,
  dismissOnBackPress = true,
  dismissOnOverlayPress = true,
  disableDrag,
  grabberContentInsetTop,
  handle,
  modal,
  name,
  onAnimationComplete,
  onOpenChange,
  onPositionChange,
  open: openProp,
  overlay,
  overlayPortalHostName: overlayPortalHostNameProp,
  position: positionProp,
  snapPoints,
  snapPointsMode,
}: NativeSheetProps) {
  const { height: windowHeight } = useWindowDimensions();
  const [generatedSheetName] = useState(() => `ui-sheet-native-${++nativeSheetCounter}`);
  const sheetName = name ?? generatedSheetName;
  const [generatedOverlayPortalHostName] = useState(() => `${sheetName}-overlay`);
  const overlayPortalHostName = overlayPortalHostNameProp ?? generatedOverlayPortalHostName;
  const sheetState = useControllableNativeSheetState({
    defaultOpen,
    defaultPosition,
    onOpenChange,
    onPositionChange,
    open: openProp,
    position: positionProp,
  });
  const presentedRef = useRef(false);
  const dismissingRef = useRef(false);
  const lastRequestedPositionRef = useRef<number | null>(null);
  const detentNormalization = useMemo(
    () => resolveNativeDetents(snapPoints, snapPointsMode, windowHeight),
    [snapPoints, snapPointsMode, windowHeight],
  );
  const resolvedDetentIndex = detentNormalization.toNativeIndex(
    clampDetentIndex(sheetState.position, detentNormalization.sourceDetentCount),
  );

  useEffect(() => {
    if (modal === false) {
      return;
    }

    if (sheetState.open) {
      if (presentedRef.current || dismissingRef.current) {
        return;
      }

      dismissingRef.current = false;
      lastRequestedPositionRef.current = resolvedDetentIndex;
      presentTrueSheet(sheetName, resolvedDetentIndex).catch(() => undefined);
      return;
    }

    if (!presentedRef.current || dismissingRef.current) {
      return;
    }

    dismissingRef.current = true;
    dismissTrueSheet(sheetName).catch(() => undefined);
  }, [modal, resolvedDetentIndex, sheetName, sheetState.open]);

  useEffect(() => {
    if (!presentedRef.current || lastRequestedPositionRef.current === resolvedDetentIndex) {
      return;
    }

    lastRequestedPositionRef.current = resolvedDetentIndex;
    resizeTrueSheet(sheetName, resolvedDetentIndex).catch(() => undefined);
  }, [resolvedDetentIndex, sheetName]);

  if (modal === false) {
    return null;
  }

  const sheetProps: Omit<TrueSheetProps, "children" | "header" | "name"> = {
    detents: detentNormalization.detents,
    dimmed: overlay ?? true,
    dismissible: dismissOnOverlayPress !== false,
    draggable: disableDrag !== true,
    grabber: handle ?? false,
    onBackPress: dismissOnBackPress
      ? () => {
          dismissingRef.current = true;
          sheetState.setOpen(false);
          return true;
        }
      : undefined,
    onDetentChange: (event) => {
      const sourceIndex = detentNormalization.fromNativeIndex(event.nativeEvent.index);
      lastRequestedPositionRef.current = event.nativeEvent.index;
      sheetState.setPosition(sourceIndex);
    },
    onDidDismiss: () => {
      presentedRef.current = false;
      dismissingRef.current = false;
      lastRequestedPositionRef.current = null;
      sheetState.setOpen(false);
      onAnimationComplete?.({ open: false });
    },
    onDidPresent: (event) => {
      presentedRef.current = true;
      dismissingRef.current = false;
      lastRequestedPositionRef.current = event.nativeEvent.index;
      sheetState.setPosition(detentNormalization.fromNativeIndex(event.nativeEvent.index));
      onAnimationComplete?.({ open: true });
    },
  };

  return (
    <TrueSheetPanel
      backgroundColor={backgroundColor}
      grabberContentInsetTop={grabberContentInsetTop}
      name={sheetName}
      onRequestClose={() => {
        dismissingRef.current = true;
        sheetState.setOpen(false);
      }}
      overlayPortalHostName={overlayPortalHostName}
      sheetProps={sheetProps}
    >
      {content ?? children}
    </TrueSheetPanel>
  );
}
