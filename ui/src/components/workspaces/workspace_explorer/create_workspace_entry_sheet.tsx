import { useEffect, useRef } from "react";
import { Platform, StyleSheet, TextInput } from "react-native";
import {
  NativeList,
  NativeListButtonItem,
  NativeListInputItem,
  NativeListSection,
  NativeSheetStack,
  getNativeStackScrollEdgeHeaderOptions,
  useAppBackgroundColors,
} from "rn-ui-kit";

import { scheduleAfterAnimationFrames } from "./schedule_after_animation_frames";

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
  const inputRef = useRef<TextInput>(null);
  const cancelScheduledFocusRef = useRef<(() => void) | null>(null);
  const isNote = entryKind === "note";
  const title = isNote ? "创建笔记" : "创建文件夹";
  const nativeHeaderOptions = getNativeStackScrollEdgeHeaderOptions({
    headerBackgroundColor: appBackgroundColors.header,
    screenBackgroundColor: appBackgroundColors.sheet,
  });

  const cancelScheduledFocus = () => {
    cancelScheduledFocusRef.current?.();
    cancelScheduledFocusRef.current = null;
  };

  const handleDidPresent = () => {
    if (Platform.OS !== "web") {
      return;
    }
    cancelScheduledFocus();
    cancelScheduledFocusRef.current = scheduleAfterAnimationFrames(() => {
      cancelScheduledFocusRef.current = null;
      inputRef.current?.focus();
    }, 2);
  };

  const handleOpenChange = (nextOpen: boolean) => {
    if (!nextOpen) {
      cancelScheduledFocus();
    }
    onOpenChange(nextOpen);
  };

  useEffect(() => cancelScheduledFocus, []);

  return (
    <NativeSheetStack
      initialRouteName="create-entry"
      name="create-workspace-entry-sheet"
      onOpenChange={handleOpenChange}
      open={open}
      sheetProps={{
        onDidPresent: handleDidPresent,
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
                  onChangeText: onNameChange,
                  onSubmitEditing: onSubmit,
                  placeholder: isNote ? "未命名笔记" : "新建文件夹",
                  ref: inputRef,
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
