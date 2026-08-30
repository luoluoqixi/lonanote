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
  const appBackgroundColors = useAppBackgroundColors();
  const nativeHeaderOptions = getNativeStackScrollEdgeHeaderOptions({
    headerBackgroundColor: appBackgroundColors.header,
    screenBackgroundColor: appBackgroundColors.sheet,
  });

  return (
    <NativeSheetStack
      initialRouteName="rename-entry"
      name="rename-workspace-entry-sheet"
      onOpenChange={onOpenChange}
      open={open}
      sheetProps={{
        snapPoints: ["62%"],
      }}
      screenOptions={nativeHeaderOptions}
    >
      <NativeSheetStack.Screen name="rename-entry" options={{ title: "编辑名称" }}>
        {() => (
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
