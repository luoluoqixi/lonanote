// iOS 原生 Sheet：使用 @expo/ui/swift-ui 的 SwiftUI BottomSheet
import { BottomSheet, Group, Host, RNHostView } from "@expo/ui/swift-ui";
import { presentationDetents, presentationDragIndicator } from "@expo/ui/swift-ui/modifiers";
import { useCallback, useMemo } from "react";
import { ScrollView } from "react-native";

import type { NativeSheetComponent, NativeSheetProps, NativeSheetScreenProps } from "./types";

function NativeSheetScreen({ children }: NativeSheetScreenProps) {
  return <>{children}</>;
}

function toDetentValues(detents: number[]): ({ fraction: number } | "medium" | "large")[] {
  return detents.map((d) => ({ fraction: d }));
}

function NativeSheetRoot({
  children,
  open = false,
  onOpenChange,
  onDismiss,
  detents = [1],
  grabberVisible,
}: NativeSheetProps) {
  const handleIsPresentedChange = useCallback(
    (next: boolean) => {
      onOpenChange?.(next);
      if (!next) {
        onDismiss?.();
      }
    },
    [onOpenChange, onDismiss],
  );

  const modifiers = useMemo(() => {
    const result = [presentationDetents(toDetentValues(detents))];
    if (grabberVisible) {
      result.push(presentationDragIndicator("visible"));
    }
    return result;
  }, [detents, grabberVisible]);

  return (
    <Host matchContents>
      <BottomSheet isPresented={open} onIsPresentedChange={handleIsPresentedChange}>
        <Group modifiers={modifiers}>
          <RNHostView>
            <ScrollView>{children}</ScrollView>
          </RNHostView>
        </Group>
      </BottomSheet>
    </Host>
  );
}

export const NativeSheet: NativeSheetComponent = Object.assign(NativeSheetRoot, {
  Screen: NativeSheetScreen,
});
