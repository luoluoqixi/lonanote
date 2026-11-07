import { X } from "lucide-react-native";
import { forwardRef, useState } from "react";
import { Pressable, type PressableProps, StyleSheet, Text, View } from "react-native";
import { useUiTheme } from "rn-ui-kit";

type DesktopEditorTabProps = PressableProps & {
  active: boolean;
  groupFocused?: boolean;
  dirty: boolean;
  title: string;
  onActivate: () => void;
  onClose: () => void;
};

// ContextMenu 的 asChild 需要将事件和 ref 透传到实际 Pressable。
export const DesktopEditorTab = forwardRef<View, DesktopEditorTabProps>(
  (
    {
      active,
      groupFocused = true,
      dirty,
      title,
      onActivate,
      onClose,
      onPress,
      onHoverIn,
      onHoverOut,
      ...pressableProps
    },
    ref,
  ) => {
    const theme = useUiTheme();
    const [hovered, setHovered] = useState(false);
    const [closeHovered, setCloseHovered] = useState(false);
    return (
      <Pressable
        {...pressableProps}
        ref={ref}
        accessibilityRole="tab"
        accessibilityState={{ selected: active }}
        onPress={(event) => {
          onPress?.(event);
          onActivate();
        }}
        onHoverIn={(event) => {
          onHoverIn?.(event);
          setHovered(true);
        }}
        onHoverOut={(event) => {
          onHoverOut?.(event);
          setHovered(false);
        }}
        style={[
          styles.tab,
          {
            backgroundColor: active ? theme.background : hovered ? theme.secondary : theme.muted,
            borderTopColor: active ? (groupFocused ? theme.primary : theme.border) : "transparent",
            borderRightColor: theme.border,
          },
        ]}
      >
        <Text
          numberOfLines={1}
          style={[
            styles.label,
            {
              color: (active && groupFocused) || hovered ? theme.foreground : theme.mutedForeground,
            },
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
  },
);

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
