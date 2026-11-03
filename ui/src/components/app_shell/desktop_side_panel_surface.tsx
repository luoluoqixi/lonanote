import type { ReactNode } from "react";
import { StyleSheet, View } from "react-native";

export function DesktopSidePanelSurface({
  active,
  children,
}: {
  active: boolean;
  children: ReactNode;
}) {
  return (
    <View
      pointerEvents={active ? "auto" : "none"}
      accessibilityElementsHidden={!active}
      importantForAccessibility={active ? "auto" : "no-hide-descendants"}
      style={[
        StyleSheet.absoluteFillObject,
        { minHeight: 0, minWidth: 0, opacity: active ? 1 : 0, zIndex: active ? 1 : 0 },
      ]}
    >
      {children}
    </View>
  );
}
