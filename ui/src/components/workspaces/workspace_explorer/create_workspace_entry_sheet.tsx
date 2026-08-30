import { StyleSheet } from "react-native";
import {
  NativeList,
  NativeListButtonItem,
  NativeListInputItem,
  NativeListSection,
  NativeSheetStack,
  getNativeStackScrollEdgeHeaderOptions,
  useAppBackgroundColors,
} from "rn-ui-kit";

export type CreateWorkspaceEntryKind = "directory" | "note";

type CreateWorkspaceEntrySheetProps = {
  entryKind: CreateWorkspaceEntryKind;
  isCreating: boolean;
  name: string;
  onNameChange: (name: string) => void;
  onOpenChange: (open: boolean) => void;
  onSubmit: () => void;
  open: boolean;
};

export function CreateWorkspaceEntrySheet({
  entryKind,
  isCreating,
  name,
  onNameChange,
  onOpenChange,
  onSubmit,
  open,
}: CreateWorkspaceEntrySheetProps) {
  const appBackgroundColors = useAppBackgroundColors();
  const isNote = entryKind === "note";
  const title = isNote ? "创建笔记" : "创建文件夹";
  const nativeHeaderOptions = getNativeStackScrollEdgeHeaderOptions({
    headerBackgroundColor: appBackgroundColors.header,
    screenBackgroundColor: appBackgroundColors.sheet,
  });

  return (
    <NativeSheetStack
      initialRouteName="create-entry"
      name="create-workspace-entry-sheet"
      onOpenChange={onOpenChange}
      open={open}
      headerRightButtonProps={{
        buttonSize: { width: 50, height: 40 },
      }}
      sheetProps={{
        snapPoints: ["62%"],
      }}
      screenOptions={nativeHeaderOptions}
    >
      <NativeSheetStack.Screen name="create-entry" options={{ title }}>
        {() => (
          <NativeList dismissKeyboardOnTap style={styles.list} tracksNavigationBarScrollEdge>
            <NativeListSection title="名称">
              <NativeListInputItem
                inputProps={{
                  autoFocus: true,
                  onChangeText: onNameChange,
                  onSubmitEditing: onSubmit,
                  placeholder: isNote ? "未命名笔记" : "新建文件夹",
                  returnKeyType: "done",
                  value: name,
                }}
              />
            </NativeListSection>
            <NativeListSection>
              <NativeListButtonItem
                disabled={name.trim().length === 0 || isCreating}
                onPress={onSubmit}
                title={isCreating ? "正在创建…" : title}
              />
            </NativeListSection>
          </NativeList>
        )}
      </NativeSheetStack.Screen>
    </NativeSheetStack>
  );
}

const styles = StyleSheet.create({
  list: {
    flex: 1,
  },
});
