import { StyleSheet } from "react-native";
import {
  NativeList,
  NativeListButtonItem,
  NativeListInputItem,
  NativeListSection,
} from "rn-ui-kit";

import { AdaptiveModal } from "@/components/common/adaptive_modal";

type RenameWorkspaceEntrySheetProps = {
  isRenaming: boolean;
  name: string;
  onNameChange: (name: string) => void;
  onOpenChange: (open: boolean) => void;
  onSubmit: () => void;
  open: boolean;
};

export function RenameWorkspaceEntrySheet({
  isRenaming,
  name,
  onNameChange,
  onOpenChange,
  onSubmit,
  open,
}: RenameWorkspaceEntrySheetProps) {
  const content = (
    <NativeList dismissKeyboardOnTap style={styles.list} tracksNavigationBarScrollEdge>
      <NativeListSection title="文件名">
        <NativeListInputItem
          inputProps={{
            autoFocus: true,
            onChangeText: onNameChange,
            onSubmitEditing: onSubmit,
            returnKeyType: "done",
            value: name,
          }}
        />
      </NativeListSection>
      <NativeListSection>
        <NativeListButtonItem
          disabled={name.trim().length === 0 || isRenaming}
          onPress={onSubmit}
          title={isRenaming ? "正在保存…" : "保存"}
        />
      </NativeListSection>
    </NativeList>
  );

  return (
    <AdaptiveModal
      name="rename-workspace-entry-sheet"
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
  list: {
    flex: 1,
    minHeight: 0,
  },
});
