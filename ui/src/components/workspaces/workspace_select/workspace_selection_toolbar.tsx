import { Pencil, Trash2 } from "lucide-react-native";
import { StyleSheet, View } from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import {
  Button,
  GlassEffect,
  Text,
  isLiquidGlassAvailable,
  useAppBackgroundColors,
  useUiTheme,
} from "rn-ui-kit";

type WorkspaceSelectionToolbarProps = {
  isDeleting: boolean;
  isUpdating: boolean;
  onDelete: () => void;
  onEdit: () => void;
  selectedCount: number;
};

export function WorkspaceSelectionToolbar({
  isDeleting,
  isUpdating,
  onDelete,
  onEdit,
  selectedCount,
}: WorkspaceSelectionToolbarProps) {
  const theme = useUiTheme();
  const insets = useSafeAreaInsets();
  const appBackgroundColors = useAppBackgroundColors();
  const hasSelection = selectedCount > 0;
  const isInteractionDisabled = isDeleting || isUpdating;
  const canEdit = selectedCount === 1 && !isInteractionDisabled;
  const canDelete = hasSelection && !isInteractionDisabled;
  const fallbackSurfaceStyle = isLiquidGlassAvailable()
    ? undefined
    : { backgroundColor: appBackgroundColors.card };
  const accentColor = theme.primary;

  return (
    <View pointerEvents="box-none" style={[styles.overlay, { bottom: insets.bottom + 20 }]}>
      <GlassEffect
        accessibilityLabel={`工作区选择操作，已选择 ${selectedCount} 个`}
        glassEffectStyle="regular"
        isInteractive
        style={[styles.toolbar, fallbackSurfaceStyle]}
      >
        <Text className="text-base font-medium" numberOfLines={1} style={styles.selectionLabel}>
          已选择 {selectedCount} 个
        </Text>
        <View style={styles.actions}>
          <Button
            accessibilityLabel="编辑所选工作区"
            circular
            disabled={!canEdit}
            hitSlop={8}
            onPress={onEdit}
            style={styles.actionButton}
            variant="ghost"
          >
            <Pencil color={accentColor} size={22} />
          </Button>
          <Button
            accessibilityLabel="删除所选工作区"
            circular
            disabled={!canDelete}
            hitSlop={8}
            nativeHaptics
            onPress={onDelete}
            style={styles.actionButton}
            variant="ghost"
          >
            <Trash2 color="#ff3b30" size={24} />
          </Button>
        </View>
      </GlassEffect>
    </View>
  );
}

const styles = StyleSheet.create({
  actionButton: {
    height: 44,
    padding: 0,
    width: 44,
  },
  actions: {
    alignItems: "center",
    flexDirection: "row",
    gap: 12,
  },
  overlay: {
    alignItems: "center",
    left: 0,
    paddingHorizontal: 20,
    position: "absolute",
    right: 0,
    zIndex: 20,
  },
  selectionLabel: {
    flex: 1,
  },
  toolbar: {
    alignItems: "center",
    borderRadius: 32,
    elevation: 8,
    flexDirection: "row",
    maxWidth: 680,
    minHeight: 64,
    paddingHorizontal: 20,
    paddingVertical: 10,
    shadowColor: "#000000",
    shadowOffset: { height: 4, width: 0 },
    shadowOpacity: 0.12,
    shadowRadius: 16,
    width: "100%",
  },
});
