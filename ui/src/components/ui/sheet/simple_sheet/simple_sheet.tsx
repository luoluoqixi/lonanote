import type { GetRef } from "@tamagui/core";
import { YStack } from "@tamagui/stacks";
import { createContext, forwardRef, useContext, useEffect, useMemo } from "react";
import { BackHandler } from "react-native";

import { os } from "@/api/common/platform";
import { TrueSheetScrollContent } from "@/components/ui/sheet/native_sheet/true_sheet/scroll_content";
import { useScreenOverlayPortalHost } from "@/components/ui/utils/screen_overlay_portal";

import { NativeSheet, shouldUseNativeSheet } from "./native_sheet";
import {
  Sheet as ReplicaSheet,
  SheetController as ReplicaSheetController,
  useSheet,
} from "./sheet/index";
import type {
  SheetControlledProps,
  SheetControllerProps,
  SheetFrameProps,
  SheetHandleProps,
  SheetOverlayProps,
  SheetProps,
  SheetScrollViewProps,
} from "./types";

const DEFAULT_OVERLAY_ENTER_STYLE = { opacity: 0 } as const;
const DEFAULT_OVERLAY_EXIT_STYLE = { opacity: 0 } as const;
const NOOP_HANDLE_PRESS = () => {};
const NativeSheetRenderContext = createContext(false);

type SnapPointNormalization = {
  snapPoints: number[];
  toExternalIndex: (index: number) => number;
  toInternalIndex: (index: number) => number;
};

type SheetBackPressBehaviorProps = {
  dismissOnBackPress?: boolean;
};

function SheetRoot(props: SheetProps) {
  const {
    children,
    containerComponent: ContainerComponent,
    content,
    defaultPosition,
    dismissOnBackPress = true,
    frameProps,
    handle,
    handleProps,
    modal,
    onPositionChange,
    portalProps,
    overlay,
    overlayProps,
    position,
    scrollView,
    scrollViewProps,
    snapPoints,
    snapPointsMode,
    ...rootProps
  } = props;
  const useNativeSheet = shouldUseNativeSheet(props);
  const screenOverlayPortalHost = useScreenOverlayPortalHost();
  const resolvedPortalProps =
    modal === true && screenOverlayPortalHost != null
      ? { ...portalProps, hostName: screenOverlayPortalHost }
      : portalProps;
  const hasDefaultStructure =
    overlay != null || handle != null || content != null || scrollView != null;
  const resolvedSnapPointsMode = snapPointsMode ?? "percent";
  const snapPointNormalization = useMemo<SnapPointNormalization | null>(() => {
    if (
      snapPoints == null ||
      snapPoints.length < 2 ||
      (resolvedSnapPointsMode !== "percent" && resolvedSnapPointsMode !== "constant") ||
      !snapPoints.every((point) => typeof point === "number")
    ) {
      return null;
    }

    const indexedSnapPoints = snapPoints.map((point, originalIndex) => ({
      originalIndex,
      point,
    }));
    const normalizedSnapPoints = [...indexedSnapPoints].sort(
      (left, right) => right.point - left.point,
    );

    if (
      normalizedSnapPoints.every(
        (entry, normalizedIndex) => entry.originalIndex === normalizedIndex,
      )
    ) {
      return null;
    }

    const originalToNormalized = new Map<number, number>();
    const normalizedToOriginal = new Map<number, number>();

    normalizedSnapPoints.forEach((entry, normalizedIndex) => {
      originalToNormalized.set(entry.originalIndex, normalizedIndex);
      normalizedToOriginal.set(normalizedIndex, entry.originalIndex);
    });

    return {
      snapPoints: normalizedSnapPoints.map((entry) => entry.point),
      toExternalIndex: (index: number) => normalizedToOriginal.get(index) ?? index,
      toInternalIndex: (index: number) => originalToNormalized.get(index) ?? index,
    };
  }, [resolvedSnapPointsMode, snapPoints]);
  const resolvedSnapPoints = snapPointNormalization?.snapPoints ?? snapPoints;
  const resolvedHandleProps =
    handleProps?.onPress == null && os() === "android"
      ? { ...handleProps, onPress: NOOP_HANDLE_PRESS }
      : handleProps;
  const resolvedOnPositionChange = useMemo(() => {
    if (onPositionChange == null) {
      return undefined;
    }

    if (snapPointNormalization == null) {
      return onPositionChange;
    }

    return (nextPosition: number) => {
      onPositionChange(snapPointNormalization.toExternalIndex(nextPosition));
    };
  }, [onPositionChange, snapPointNormalization]);

  const resolvedRootProps = {
    ...rootProps,
    ...(resolvedPortalProps != null ? { portalProps: resolvedPortalProps } : null),
    ...(defaultPosition != null
      ? {
          defaultPosition:
            snapPointNormalization?.toInternalIndex(defaultPosition) ?? defaultPosition,
        }
      : null),
    ...(modal != null ? { modal } : null),
    ...(resolvedOnPositionChange != null ? { onPositionChange: resolvedOnPositionChange } : null),
    ...(position != null
      ? { position: snapPointNormalization?.toInternalIndex(position) ?? position }
      : null),
    ...(resolvedSnapPoints != null ? { snapPoints: resolvedSnapPoints } : null),
    ...(snapPointsMode != null ? { snapPointsMode } : null),
    ...(modal || ContainerComponent == null ? { containerComponent: ContainerComponent } : null),
  };

  const nativeChildren = !hasDefaultStructure ? (
    <>{children}</>
  ) : (
    <>
      {overlay ? <SheetOverlay {...overlayProps} /> : null}
      {handle ? <SheetHandle {...resolvedHandleProps} /> : null}
      <SheetFrame {...frameProps}>
        {scrollView ? <SheetScrollView {...scrollViewProps}>{content}</SheetScrollView> : content}
      </SheetFrame>
      {children}
    </>
  );

  const sheet = useNativeSheet ? (
    <NativeSheetRenderContext.Provider value>
      <NativeSheet {...resolvedRootProps}>{nativeChildren}</NativeSheet>
    </NativeSheetRenderContext.Provider>
  ) : !hasDefaultStructure ? (
    <ReplicaSheet {...resolvedRootProps}>
      <SheetBackHandler dismissOnBackPress={dismissOnBackPress} />
      {children}
    </ReplicaSheet>
  ) : (
    <ReplicaSheet {...resolvedRootProps}>
      <SheetBackHandler dismissOnBackPress={dismissOnBackPress} />
      {overlay ? <SheetOverlay {...overlayProps} /> : null}
      {handle ? <SheetHandle {...resolvedHandleProps} /> : null}
      <SheetFrame {...frameProps}>
        {scrollView ? <SheetScrollView {...scrollViewProps}>{content}</SheetScrollView> : content}
      </SheetFrame>
      {children}
    </ReplicaSheet>
  );

  if (ContainerComponent != null && modal !== true) {
    return <ContainerComponent>{sheet}</ContainerComponent>;
  }

  return sheet;
}

function SheetControlled(props: SheetControlledProps) {
  return <ReplicaSheet.Controlled {...props} />;
}

function SheetController(props: SheetControllerProps) {
  return <ReplicaSheetController {...props} />;
}

function SheetFrame(props: SheetFrameProps) {
  const isNativeSheet = useContext(NativeSheetRenderContext);

  if (isNativeSheet) {
    return <YStack {...props} />;
  }

  return <ReplicaSheet.Frame {...props} />;
}

function SheetOverlay(props: SheetOverlayProps) {
  const isNativeSheet = useContext(NativeSheetRenderContext);

  if (isNativeSheet) {
    return null;
  }

  return (
    <ReplicaSheet.Overlay
      {...props}
      bg={props.bg ?? "$shadowColor"}
      enterStyle={props.enterStyle ?? DEFAULT_OVERLAY_ENTER_STYLE}
      exitStyle={props.exitStyle ?? DEFAULT_OVERLAY_EXIT_STYLE}
      opacity={props.opacity ?? 0.5}
      transition={props.transition ?? "lazy"}
    />
  );
}

function SheetHandle(props: SheetHandleProps) {
  const isNativeSheet = useContext(NativeSheetRenderContext);

  if (isNativeSheet) {
    return <YStack {...props} />;
  }

  return <ReplicaSheet.Handle {...props} />;
}

const SheetScrollView = forwardRef<GetRef<typeof ReplicaSheet.ScrollView>, SheetScrollViewProps>(
  (props, ref) => {
    const isNativeSheet = useContext(NativeSheetRenderContext);

    if (isNativeSheet) {
      return (
        <TrueSheetScrollContent
          ref={ref as React.Ref<any>}
          {...(props as React.ComponentProps<typeof TrueSheetScrollContent>)}
        >
          {props.children}
        </TrueSheetScrollContent>
      );
    }

    return <ReplicaSheet.ScrollView ref={ref} {...props} />;
  },
);
SheetScrollView.displayName = "SheetScrollView";

function SheetBackHandler(props: SheetBackPressBehaviorProps) {
  const { dismissOnBackPress = true } = props;
  const { open, setOpen } = useSheet();

  useEffect(() => {
    if (os() !== "android" || !dismissOnBackPress || !open) {
      return;
    }

    const subscription = BackHandler.addEventListener("hardwareBackPress", () => {
      setOpen(false);
      return true;
    });

    return () => {
      subscription.remove();
    };
  }, [dismissOnBackPress, open, setOpen]);

  return null;
}

export const SimpleSheet = Object.assign(SheetRoot, {
  Controlled: SheetControlled,
  Controller: SheetController,
  Frame: SheetFrame,
  Overlay: SheetOverlay,
  Handle: SheetHandle,
  ScrollView: SheetScrollView,
});
