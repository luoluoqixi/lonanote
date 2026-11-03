import type { ReactNode } from "react";
import { StyleSheet, View } from "react-native";

export function DesktopEditorSurface({
  active,
  backgroundColor,
  children,
}: {
  active: boolean;
  backgroundColor: string;
  children: ReactNode;
}) {
  return (
    <View
      pointerEvents={active ? "auto" : "none"}
      accessibilityElementsHidden={!active}
      importantForAccessibility={active ? "auto" : "no-hide-descendants"}
      style={[
        StyleSheet.absoluteFillObject,
        { flex: 1, minHeight: 0, backgroundColor, zIndex: active ? 1 : 0 },
      ]}
    >
      {children}
    </View>
  );
}
