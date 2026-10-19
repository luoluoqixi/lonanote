import { X } from "lucide-react-native";
import { useState } from "react";
import { type LayoutChangeEvent, Pressable, StyleSheet, Text, View } from "react-native";
import { useUiTheme } from "rn-ui-kit";

export function DesktopEditorTab({
  active,
  dirty,
  title,
  onActivate,
  onClose,
  onLayout,
  viewRef,
}: {
  active: boolean;
  dirty: boolean;
  title: string;
  onActivate: () => void;
  onClose: () => void;
  onLayout: (event: LayoutChangeEvent) => void;
  viewRef: (node: View | null) => void;
}) {
  const theme = useUiTheme();
  const [hovered, setHovered] = useState(false);
  const [closeHovered, setCloseHovered] = useState(false);
  return (
    <Pressable
      ref={viewRef}
      accessibilityRole="tab"
      accessibilityState={{ selected: active }}
      onPress={onActivate}
      onLayout={onLayout}
      onHoverIn={() => setHovered(true)}
      onHoverOut={() => setHovered(false)}
      style={[
        styles.tab,
        {
          backgroundColor: active ? theme.background : hovered ? theme.secondary : theme.muted,
          borderTopColor: active ? theme.primary : "transparent",
          borderRightColor: theme.border,
        },
      ]}
    >
      <Text
        numberOfLines={1}
        style={[
          styles.label,
          { color: active || hovered ? theme.foreground : theme.mutedForeground },
        ]}
      >
        {title}
      </Text>
      {dirty ? <View style={[styles.dirty, { backgroundColor: theme.foreground }]} /> : null}
      <Pressable
        accessibilityRole="button"
        accessibilityLabel={`关闭 ${title}`}
        onHoverIn={() => setCloseHovered(true)}
        onHoverOut={() => setCloseHovered(false)}
        onPress={(event) => {
          event.stopPropagation();
          onClose();
        }}
        style={[styles.close, { backgroundColor: closeHovered ? theme.accent : "transparent" }]}
      >
        <X color={closeHovered ? theme.foreground : theme.mutedForeground} size={14} />
      </Pressable>
    </Pressable>
  );
}

const styles = StyleSheet.create({
  tab: {
    alignItems: "center",
    flexDirection: "row",
    gap: 6,
    height: 36,
    maxWidth: 220,
    minWidth: 112,
    flexShrink: 0,
    paddingLeft: 10,
    paddingRight: 4,
    borderTopWidth: 2,
    borderRightWidth: StyleSheet.hairlineWidth,
  },
  label: { flex: 1, fontSize: 13 },
  close: { width: 22, height: 22, borderRadius: 4, alignItems: "center", justifyContent: "center" },
  dirty: { borderRadius: 3, height: 6, width: 6 },
});
