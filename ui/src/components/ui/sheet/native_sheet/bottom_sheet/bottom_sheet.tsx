import { BottomSheetBackdrop, BottomSheetModal } from "@gorhom/bottom-sheet";
import { useEffect, useMemo, useRef, useState } from "react";
import { BackHandler, StyleSheet, View } from "react-native";
import { GestureHandlerRootView } from "react-native-gesture-handler";

import { ScreenOverlayPortalProvider } from "@/components/ui/utils/screen_overlay_portal";

import type { NativeSheetProps } from "../types";
import { BottomSheetScrollableProvider } from "./scrollable_context";
import { resolveBottomSheetSnapPoints } from "./snap_points";

const SHEET_ACTIVE_OFFSET_Y: [number, number] = [-10, 10];
const SHEET_FAIL_OFFSET_X: [number, number] = [-20, 20];

type BottomSheetPanelProps = {
  children: React.ReactNode;
  dismissOnBackPress?: boolean;
  dismissOnOverlayPress?: boolean;
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

export function BottomSheetPanel({
  children,
  dismissOnBackPress = true,
  dismissOnOverlayPress = true,
  enableHandle = true,
  name,
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
  const phaseRef = useRef<"closed" | "presenting" | "presented" | "dismissing">("closed");
  const reopenAfterDismissRef = useRef(false);
  const [hostInteractive, setHostInteractive] = useState(open);
  const { enableDynamicSizing, snapPoints: resolvedSnapPoints } = useMemo(
    () => resolveBottomSheetSnapPoints(snapPoints, snapPointsMode),
    [snapPoints, snapPointsMode],
  );
  const resolvedPosition = Number.isFinite(position) ? Math.max(0, Math.round(position)) : 0;
  requestedOpenRef.current = open;

  useEffect(() => {
    if (open) {
      setHostInteractive(true);
      if (phaseRef.current === "dismissing") {
        reopenAfterDismissRef.current = true;
        return;
      }

      reopenAfterDismissRef.current = false;
      if (phaseRef.current === "closed") {
        phaseRef.current = "presenting";
        modalRef.current?.present();
        return;
      }

      if (phaseRef.current === "presented") {
        modalRef.current?.snapToIndex(resolvedPosition);
      }
      return;
    }

    reopenAfterDismissRef.current = false;
    if (phaseRef.current === "closed") {
      setHostInteractive(false);
      return;
    }

    if (phaseRef.current === "dismissing") {
      return;
    }

    phaseRef.current = "dismissing";
    modalRef.current?.dismiss();
  }, [open, resolvedPosition]);

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
        <BottomSheetScrollableProvider>{children}</BottomSheetScrollableProvider>
      </ScreenOverlayPortalProvider>
    ) : (
      <BottomSheetScrollableProvider>{children}</BottomSheetScrollableProvider>
    );

  return (
    <View pointerEvents={hostInteractive ? "auto" : "none"} style={styles.hostLayer}>
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
          activeOffsetY={SHEET_ACTIVE_OFFSET_Y}
          failOffsetX={SHEET_FAIL_OFFSET_X}
          handleComponent={enableHandle ? undefined : null}
          index={resolvedPosition}
          name={name}
          stackBehavior="push"
          onChange={(nextIndex) => {
            if (nextIndex >= 0) {
              const previousPhase = phaseRef.current;
              phaseRef.current = "presented";
              onPositionChange?.(nextIndex);
              if (previousPhase !== "presented") {
                onAnimationComplete?.({ open: true });
              }
              return;
            }

            phaseRef.current = "dismissing";
            onOpenChange(false);
          }}
          onDismiss={() => {
            phaseRef.current = "closed";

            if (reopenAfterDismissRef.current && requestedOpenRef.current) {
              reopenAfterDismissRef.current = false;
              setHostInteractive(true);
              phaseRef.current = "presenting";
              modalRef.current?.present();
              return;
            }

            reopenAfterDismissRef.current = false;
            setHostInteractive(false);
            onOpenChange(false);
            onAnimationComplete?.({ open: false });
          }}
          snapPoints={resolvedSnapPoints as any}
        >
          <View style={styles.content}>{body}</View>
        </BottomSheetModal>
      </GestureHandlerRootView>
    </View>
  );
}

const styles = StyleSheet.create({
  content: {
    flex: 1,
    minHeight: 1,
  },
  hostLayer: {
    ...StyleSheet.absoluteFillObject,
    zIndex: 1000,
  },
  gestureRoot: {
    flex: 1,
  },
});
