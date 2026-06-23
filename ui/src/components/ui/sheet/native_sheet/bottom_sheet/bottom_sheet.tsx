import {
  BottomSheetBackdrop,
  BottomSheetModal,
  BottomSheetModalProvider,
  BottomSheetView,
} from "@gorhom/bottom-sheet";
import { useEffect, useMemo, useRef } from "react";
import { BackHandler, StyleSheet } from "react-native";
import { GestureHandlerRootView } from "react-native-gesture-handler";

import { ScreenOverlayPortalProvider } from "@/components/ui/utils/screen_overlay_portal";

import type { SheetProps } from "../../simple_sheet/types";
import { resolveBottomSheetSnapPoints } from "./snap_points";

type BottomSheetPanelProps = {
  children: React.ReactNode;
  dismissOnBackPress?: boolean;
  dismissOnOverlayPress?: boolean;
  enableHandle?: boolean;
  onAnimationComplete?: SheetProps["onAnimationComplete"];
  onOpenChange: (open: boolean) => void;
  onPositionChange?: (position: number) => void;
  open: boolean;
  overlay?: boolean;
  overlayPortalHostName?: string;
  position: number;
  snapPoints: SheetProps["snapPoints"];
  snapPointsMode: SheetProps["snapPointsMode"];
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
  const { enableDynamicSizing, snapPoints: resolvedSnapPoints } = useMemo(
    () => resolveBottomSheetSnapPoints(snapPoints, snapPointsMode),
    [snapPoints, snapPointsMode],
  );
  const resolvedPosition = Number.isFinite(position) ? Math.max(0, Math.round(position)) : 0;

  useEffect(() => {
    if (open) {
      modalRef.current?.present();
      requestAnimationFrame(() => {
        modalRef.current?.snapToIndex(resolvedPosition);
        onAnimationComplete?.({ open: true });
      });
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
    <GestureHandlerRootView style={styles.gestureRoot}>
      <BottomSheetModalProvider>
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
              onPositionChange?.(nextIndex);
            }
          }}
          onDismiss={() => {
            onOpenChange(false);
            onAnimationComplete?.({ open: false });
          }}
          snapPoints={resolvedSnapPoints as any}
        >
          <BottomSheetView style={styles.content}>{body}</BottomSheetView>
        </BottomSheetModal>
      </BottomSheetModalProvider>
    </GestureHandlerRootView>
  );
}

const styles = StyleSheet.create({
  content: {
    flex: 1,
    minHeight: 1,
  },
  gestureRoot: {
    flex: 1,
  },
});
