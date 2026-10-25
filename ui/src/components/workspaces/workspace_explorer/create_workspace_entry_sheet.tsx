import { useEffect, useRef } from "react";
import { StyleSheet, type TextInput } from "react-native";
import {
  NativeList,
  NativeListButtonItem,
  NativeListInputItem,
  NativeListSection,
} from "rn-ui-kit";

import { isWeb } from "@/api/common";
import { AdaptiveModal } from "@/components/common/adaptive_modal";

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
  const inputRef = useRef<TextInput>(null);
  const cancelScheduledFocusRef = useRef<(() => void) | null>(null);
  const isNote = entryKind === "note";
  const title = isNote ? "创建笔记" : "创建文件夹";

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

  return (
    <AdaptiveModal
      name="create-workspace-entry-sheet"
      screenName="create-entry"
      title={title}
      open={open}
      onOpenChange={handleOpenChange}
      dialogSize={{ width: 520, height: 320 }}
      dialogContentProps={{
        onOpenAutoFocus: (event) => {
          event.preventDefault();
          handleDidPresent();
        },
      }}
      sheetProps={{
        onDidPresent: handleDidPresent,
        snapPoints: ["62%"],
      }}
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
