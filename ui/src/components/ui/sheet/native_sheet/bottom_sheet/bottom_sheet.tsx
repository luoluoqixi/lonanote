import { BottomSheetBackdrop, BottomSheetModal, BottomSheetView } from "@gorhom/bottom-sheet";
import { useEffect, useMemo, useRef } from "react";
import { BackHandler, StyleSheet } from "react-native";
import { GestureHandlerRootView } from "react-native-gesture-handler";

import { ScreenOverlayPortalProvider } from "@/components/ui/utils/screen_overlay_portal";

import type { NativeSheetProps } from "../types";
import { resolveBottomSheetSnapPoints } from "./snap_points";

type BottomSheetPanelProps = {
  children: React.ReactNode;
  dismissOnBackPress?: boolean;
  dismissOnOverlayPress?: boolean;
  enableHandle?: boolean;
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

export function BottomSheetPanel({
  children,
  dismissOnBackPress = true,
  dismissOnOverlayPress = true,
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
  const modalRef = useRef<BottomSheetModal>(null);
  const requestedOpenRef = useRef(open);
  const hasPresentedRef = useRef(false);
  const { enableDynamicSizing, snapPoints: resolvedSnapPoints } = useMemo(
    () => resolveBottomSheetSnapPoints(snapPoints, snapPointsMode),
    [snapPoints, snapPointsMode],
  );
  const resolvedPosition = Number.isFinite(position) ? Math.max(0, Math.round(position)) : 0;
  requestedOpenRef.current = open;

  useEffect(() => {
    if (open) {
      requestAnimationFrame(() => {
        if (!requestedOpenRef.current) {
          return;
        }

        modalRef.current?.present();
        modalRef.current?.snapToIndex(resolvedPosition);
        onAnimationComplete?.({ open: true });
      });
      return;
    }

    if (!hasPresentedRef.current) {
      return;
    }

    modalRef.current?.dismiss();
  }, [onAnimationComplete, open, resolvedPosition]);

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
    <GestureHandlerRootView pointerEvents="box-none" style={styles.gestureRoot}>
      <BottomSheetModal
        ref={modalRef}
        backdropComponent={
          overlay
            ? (props) => (
                <BottomSheetBackdrop
                  {...props}
                  appearsOnIndex={0}
                  disappearsOnIndex={-1}
                  pressBehavior={dismissOnOverlayPress ? "close" : "none"}
                />
              )
            : undefined
        }
        enableDynamicSizing={enableDynamicSizing}
        enablePanDownToClose
        handleComponent={enableHandle ? undefined : null}
        index={resolvedPosition}
        onChange={(nextIndex) => {
          if (nextIndex >= 0) {
            hasPresentedRef.current = true;
            onPositionChange?.(nextIndex);
            return;
          }

          if (!hasPresentedRef.current) {
            return;
          }

          onOpenChange(false);
          onAnimationComplete?.({ open: false });
        }}
        onDismiss={() => {
          if (requestedOpenRef.current) {
            requestAnimationFrame(() => {
              if (!requestedOpenRef.current) {
                return;
              }

              modalRef.current?.present();
              modalRef.current?.snapToIndex(resolvedPosition);
            });
            return;
          }

          hasPresentedRef.current = false;
          onOpenChange(false);
          onAnimationComplete?.({ open: false });
        }}
        snapPoints={resolvedSnapPoints as any}
      >
        <BottomSheetView style={styles.content}>{body}</BottomSheetView>
      </BottomSheetModal>
    </GestureHandlerRootView>
  );
}

const styles = StyleSheet.create({
  content: {
    flex: 1,
    minHeight: 1,
  },
  gestureRoot: {
    ...StyleSheet.absoluteFillObject,
    zIndex: 1000,
  },
});
