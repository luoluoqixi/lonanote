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
import { useLayoutMode } from "@/hooks/layout";

import { getCreateEntrySelectionEnd } from "./create_workspace_entry_input";
import { scheduleAfterAnimationFrames } from "./schedule_after_animation_frames";

type WebTextInput = TextInput & {
  setSelectionRange?: (start: number, end: number) => void;
};

export type CreateWorkspaceEntryKind = "directory" | "note";

type CreateWorkspaceEntrySheetProps = {
  modalName?: string;
  entryKind: CreateWorkspaceEntryKind;
  dialogContentOnly?: boolean;
  isCreating: boolean;
  name: string;
  parentPath: string;
  onNameChange: (name: string) => void;
  onNativeResult?: (result: unknown) => void;
  onOpenChange: (open: boolean) => void;
  onSubmit: () => void;
  open: boolean;
};

export function CreateWorkspaceEntrySheet({
  modalName = "create-workspace-entry-sheet",
  entryKind,
  dialogContentOnly = false,
  isCreating,
  name,
  parentPath,
  onNameChange,
  onNativeResult,
  onOpenChange,
  onSubmit,
  open,
}: CreateWorkspaceEntrySheetProps) {
  const desktop = useLayoutMode().layoutMode === "desktop";
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

  useEffect(() => {
    if (open && desktop && !dialogContentOnly) handleDidPresent();
  }, [open, desktop, dialogContentOnly]);

  const content = (
    <NativeList dismissKeyboardOnTap style={styles.list} tracksNavigationBarScrollEdge>
      <NativeListSection titleFontSize={desktop ? 12 : undefined} title="名称">
        <NativeListInputItem
          titleFontSize={desktop ? 13 : undefined}
          valueFontSize={desktop ? 13 : undefined}
          inputProps={{
            style: desktop ? { fontSize: 13 } : undefined,
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
          titleFontSize={desktop ? 13 : undefined}
          valueFontSize={desktop ? 13 : undefined}
          disabled={name.trim().length === 0 || isCreating}
          onPress={onSubmit}
          title={isCreating ? "正在创建…" : title}
        />
      </NativeListSection>
    </NativeList>
  );

  if (dialogContentOnly) return content;

  return (
    <AdaptiveModal
      name={modalName}
      nativeDialog={{
        id: "workspace.entry.create",
        payload: { entryKind, name, parentPath },
        title: `${title} · ${parentPath || "/"}`,
        width: 520,
        height: 320,
      }}
      onNativeResult={onNativeResult}
      screenName="create-entry"
      title={`${title} · ${parentPath || "/"}`}
      open={open}
      onOpenChange={handleOpenChange}
      dialogSize={{ width: 520, height: 320 }}
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
