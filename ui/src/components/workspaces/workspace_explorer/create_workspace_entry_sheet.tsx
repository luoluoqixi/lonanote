import { useEffect, useRef } from "react";
import { StyleSheet, type TextInput, useWindowDimensions } from "react-native";
import {
  Dialog,
  NativeList,
  NativeListButtonItem,
  NativeListInputItem,
  NativeListSection,
  NativeSheetStack,
  getNativeStackScrollEdgeHeaderOptions,
  useAppBackgroundColors,
} from "rn-ui-kit";

import { isWeb } from "@/api/common";
import { useLayoutMode } from "@/hooks/layout";

import { getCreateEntrySelectionEnd } from "./create_workspace_entry_input";
import { scheduleAfterAnimationFrames } from "./schedule_after_animation_frames";

type WebTextInput = TextInput & {
  setSelectionRange?: (start: number, end: number) => void;
};

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
  const { layoutMode } = useLayoutMode();
  const { width, height } = useWindowDimensions();
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
    if (!isWeb()) {
      return;
    }
    cancelScheduledFocus();
    cancelScheduledFocusRef.current = scheduleAfterAnimationFrames(() => {
      cancelScheduledFocusRef.current = null;
      const input = inputRef.current as WebTextInput | null;
      input?.focus();
      input?.setSelectionRange?.(0, getCreateEntrySelectionEnd(name, isNote));
    }, 2);
  };

  const handleOpenChange = (nextOpen: boolean) => {
    if (!nextOpen) {
      cancelScheduledFocus();
    }
    onOpenChange(nextOpen);
  };

  useEffect(() => cancelScheduledFocus, []);

  const content = (
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
  );

  if (layoutMode === "desktop") {
    return (
      <Dialog
        open={open}
        onOpenChange={handleOpenChange}
        title={title}
        content={content}
        contentProps={{
          onOpenAutoFocus: (event) => {
            event.preventDefault();
            handleDidPresent();
          },
          style: {
            width: Math.min(520, width * 0.9),
            maxWidth: width * 0.9,
            height: Math.min(320, height * 0.8),
            padding: 16,
            backgroundColor: appBackgroundColors.sheet,
          },
        }}
      />
    );
  }

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
        {() => content}
      </NativeSheetStack.Screen>
    </NativeSheetStack>
  );
}

const styles = StyleSheet.create({
  list: {
    flex: 1,
    minHeight: 0,
  },
});
