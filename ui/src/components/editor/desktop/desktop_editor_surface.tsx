import type { ReactNode } from "react";
import { View } from "react-native";

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
    <View style={{ flex: 1, minHeight: 0, backgroundColor, display: active ? "flex" : "none" }}>
      {children}
    </View>
  );
}
