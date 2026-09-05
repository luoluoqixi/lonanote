import { ArrowLeft, FilePlus2, FolderPlus, Pencil, Trash2 } from "lucide-react-native";
import { type ComponentProps } from "react";
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

export type WorkspaceExplorerToolbarProps = {
  canGoBack: boolean;
  isSelectionMode: boolean;
  isUpdating: boolean;
  onCreateDirectory: () => void;
  onCreateNote: () => void;
  onDelete: () => void;
  onEdit: () => void;
  onGoBack: () => void;
  selectedCount: number;
};

export function WorkspaceExplorerToolbar({
  canGoBack,
  isSelectionMode,
  isUpdating,
  onCreateDirectory,
  onCreateNote,
  onDelete,
  onEdit,
  onGoBack,
  selectedCount,
}: WorkspaceExplorerToolbarProps) {
  const insets = useSafeAreaInsets();
  const appBackgroundColors = useAppBackgroundColors();
  const theme = useUiTheme();
  const accentColor = theme.primary as ComponentProps<typeof ArrowLeft>["color"];
  const fallbackSurfaceStyle = isLiquidGlassAvailable()
    ? undefined
    : { backgroundColor: appBackgroundColors.card };

  return (
    <View pointerEvents="box-none" style={[styles.overlay, { bottom: insets.bottom + 16 }]}>
      <GlassEffect
        accessibilityLabel={isSelectionMode ? `已选择 ${selectedCount} 项` : "文件操作"}
        glassEffectStyle="regular"
        isInteractive
        style={[styles.toolbar, fallbackSurfaceStyle]}
      >
        {isSelectionMode ? (
          <>
            <Text className="text-base font-medium" style={styles.selectionLabel}>
              已选择 {selectedCount} 项
            </Text>
            <View style={styles.selectionActions}>
              <ToolbarButton
                accessibilityLabel="编辑所选项目名称"
                disabled={selectedCount !== 1 || isUpdating}
                onPress={onEdit}
              >
                <Pencil color={accentColor} size={23} />
              </ToolbarButton>
              <ToolbarButton
                accessibilityLabel="删除所选项目"
                disabled={selectedCount === 0 || isUpdating}
                onPress={onDelete}
              >
                <Trash2 color="#ff3b30" size={23} />
              </ToolbarButton>
            </View>
          </>
        ) : (
          <>
            <ToolbarButton
              accessibilityLabel="返回上一层文件夹"
              disabled={!canGoBack}
              onPress={onGoBack}
            >
              <ArrowLeft color={accentColor} size={25} />
            </ToolbarButton>
            <ToolbarButton accessibilityLabel="创建笔记" onPress={onCreateNote}>
              <FilePlus2 color={accentColor} size={25} />
            </ToolbarButton>
            <ToolbarButton accessibilityLabel="创建文件夹" onPress={onCreateDirectory}>
              <FolderPlus color={accentColor} size={25} />
            </ToolbarButton>
          </>
        )}
      </GlassEffect>
    </View>
  );
}

function ToolbarButton({
  accessibilityLabel,
  children,
  disabled,
  onPress,
}: {
  accessibilityLabel: string;
  children: React.ReactNode;
  disabled?: boolean;
  onPress: () => void;
}) {
  return (
    <Button
      accessibilityLabel={accessibilityLabel}
      circular
      disabled={disabled}
      hitSlop={8}
      nativeHaptics
      onPress={onPress}
      style={styles.actionButton}
      variant="ghost"
    >
      {children}
    </Button>
  );
}

const styles = StyleSheet.create({
  actionButton: {
    height: 44,
    padding: 0,
    width: 44,
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
  selectionActions: {
    alignItems: "center",
    flexDirection: "row",
    gap: 10,
  },
  toolbar: {
    alignItems: "center",
    borderRadius: 32,
    elevation: 8,
    flexDirection: "row",
    gap: 34,
    justifyContent: "center",
    maxWidth: 420,
    minHeight: 64,
    paddingHorizontal: 22,
    paddingVertical: 10,
    shadowColor: "#000000",
    shadowOffset: { height: 4, width: 0 },
    shadowOpacity: 0.12,
    shadowRadius: 16,
  },
});
