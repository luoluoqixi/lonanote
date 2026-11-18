import { StyleSheet, View } from "react-native";
import {
  Button,
  NativeList,
  NativeListButtonItem,
  NativeListInputItem,
  NativeListSection,
  Text,
} from "rn-ui-kit";

import { AdaptiveModal } from "@/components/common/adaptive_modal";
import { useLayoutMode } from "@/hooks/layout";

type RenameWorkspaceEntrySheetProps = {
  dialogContentOnly?: boolean;
  isRenaming: boolean;
  name: string;
  onNameChange: (name: string) => void;
  onNativeResult?: (result: unknown) => void;
  onOpenChange: (open: boolean) => void;
  onSubmit: () => void;
  open: boolean;
};

export function RenameWorkspaceEntrySheet({
  dialogContentOnly = false,
  isRenaming,
  name,
  onNameChange,
  onNativeResult,
  onOpenChange,
  onSubmit,
  open,
}: RenameWorkspaceEntrySheetProps) {
  const desktop = useLayoutMode().layoutMode === "desktop";
  const content = (
    <View style={styles.list}>
      <NativeList dismissKeyboardOnTap style={styles.list} tracksNavigationBarScrollEdge>
        <NativeListSection titleFontSize={desktop ? 12 : undefined} title="文件名">
          <NativeListInputItem
            titleFontSize={desktop ? 13 : undefined}
            valueFontSize={desktop ? 13 : undefined}
            inputProps={{
              style: desktop ? { fontSize: 13 } : undefined,
              autoFocus: true,
              onChangeText: onNameChange,
              onSubmitEditing: onSubmit,
              returnKeyType: "done",
              value: name,
            }}
          />
        </NativeListSection>
        {!desktop ? (
          <NativeListSection>
            <NativeListButtonItem
              titleFontSize={desktop ? 13 : undefined}
              valueFontSize={desktop ? 13 : undefined}
              disabled={name.trim().length === 0 || isRenaming}
              onPress={onSubmit}
              title={isRenaming ? "正在保存…" : "保存"}
            />
          </NativeListSection>
        ) : null}
      </NativeList>
      {desktop ? (
        <View style={[styles.actions, dialogContentOnly ? styles.windowActions : undefined]}>
          <Button
            size="sm"
            variant="outline"
            disabled={isRenaming}
            onPress={() => onOpenChange(false)}
          >
            <Text>取消</Text>
          </Button>
          <Button size="sm" disabled={name.trim().length === 0 || isRenaming} onPress={onSubmit}>
            <Text>{isRenaming ? "正在保存…" : "保存"}</Text>
          </Button>
        </View>
      ) : null}
    </View>
  );

  if (dialogContentOnly) return content;

  return (
    <AdaptiveModal
      name="rename-workspace-entry-sheet"
      nativeDialog={{
        id: "workspace.entry.rename",
        payload: { name },
        title: "编辑名称",
        width: 520,
        height: 320,
      }}
      onNativeResult={onNativeResult}
      screenName="rename-entry"
      title="编辑名称"
      onOpenChange={onOpenChange}
      open={open}
      dialogSize={{ width: 520, height: 320 }}
      sheetProps={{ snapPoints: ["62%"] }}
    >
      {content}
    </AdaptiveModal>
  );
}

const styles = StyleSheet.create({
  actions: { flexDirection: "row", justifyContent: "flex-end", gap: 8, paddingTop: 12 },
  windowActions: { paddingHorizontal: 16, paddingBottom: 16 },
  list: {
    flex: 1,
    minHeight: 0,
  },
});
