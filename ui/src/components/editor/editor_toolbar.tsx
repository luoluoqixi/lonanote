import { Bold, ChevronDown, Code2, Italic, List, Redo2, Undo2 } from "lucide-react-native";
import { useCallback, useState } from "react";
import { Keyboard, ScrollView, StyleSheet, View } from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { Button, useUiTheme } from "rn-ui-kit";
import { GlassEffect, type KeyboardVisibilityPhase, useKeyboardVisibility } from "rn-ui-kit/core";

import { isIos26Plus, isMobile } from "@/api/common/platform";
import type { EditorCommand } from "@/assets/editor/src/bridge/protocol";
import { editorCommandCoordinator } from "@/components/editor/controllers";
import type { DocumentModel, EditorViewSession } from "@/stores/editor";

import { MOBILE_EDITOR_TOOLBAR_HEIGHT } from "./editor_layout";

type ToolbarItem = {
  command: EditorCommand;
  icon: typeof Undo2;
  label: string;
  disabled?: boolean;
};

export function EditorToolbar({
  document,
  editor,
}: {
  document: DocumentModel;
  editor: EditorViewSession;
}) {
  const theme = useUiTheme();
  const insets = useSafeAreaInsets();
  const [keyboardVisible, setKeyboardVisible] = useState(false);
  const handleKeyboardPhaseChange = useCallback((phase: KeyboardVisibilityPhase) => {
    setKeyboardVisible(phase !== "hidden");
  }, []);
  useKeyboardVisibility({ onPhaseChange: handleKeyboardPhaseChange });
  const disabled =
    editor.bridgeState !== "ready" ||
    editor.readOnly ||
    editor.previewMode ||
    document.editOwnerEditorId !== editor.editorId;
  const items: ToolbarItem[] = [
    {
      command: { type: "history.undo" },
      disabled: !editor.editorState.canUndo,
      icon: Undo2,
      label: "撤销",
    },
    {
      command: { type: "history.redo" },
      disabled: !editor.editorState.canRedo,
      icon: Redo2,
      label: "重做",
    },
    { command: { type: "mark.toggle", mark: "bold" }, icon: Bold, label: "粗体" },
    { command: { type: "mark.toggle", mark: "italic" }, icon: Italic, label: "斜体" },
    { command: { type: "list.toggle", list: "unordered" }, icon: List, label: "无序列表" },
    { command: { type: "mark.toggle", mark: "inlineCode" }, icon: Code2, label: "行内代码" },
  ];
  const toolbarButtons = (
    <ScrollView
      contentContainerStyle={styles.content}
      horizontal
      showsHorizontalScrollIndicator={false}
      style={styles.scroll}
    >
      {items.map(({ command, disabled: itemDisabled, icon: Icon, label }) => (
        <Button
          aria-label={label}
          disabled={disabled || itemDisabled}
          key={label}
          onPress={() =>
            void editorCommandCoordinator.execute(editor.editorId, command).catch(() => undefined)
          }
          size="xs"
          variant="icon"
        >
          <Icon color={theme.foreground} size={18} />
        </Button>
      ))}
    </ScrollView>
  );
  const toolbarContent = isMobile() ? (
    <View style={styles.mobileToolbarRow}>
      {toolbarButtons}
      <Button aria-label="隐藏键盘" onPress={() => Keyboard.dismiss()} size="2xs" variant="icon">
        <ChevronDown color={theme.foreground} size={20} />
      </Button>
    </View>
  ) : (
    toolbarButtons
  );

  if (!isMobile()) {
    return (
      <View
        style={[
          styles.desktopContainer,
          { backgroundColor: theme.background, borderColor: theme.border },
        ]}
      >
        {toolbarContent}
      </View>
    );
  }

  if (!keyboardVisible) return null;

  const usesNativeEditorToolbar = isIos26Plus();
  return (
    <GlassEffect
      accessibilityLabel="编辑工具栏"
      keyboardAvoidance={usesNativeEditorToolbar ? true : { subtractSafeAreaInset: false }}
      keyboardHiddenConfirmation={{ finalHeight: -MOBILE_EDITOR_TOOLBAR_HEIGHT }}
      style={[
        usesNativeEditorToolbar ? styles.mobileFloatingContainer : styles.mobileDockedContainer,
        usesNativeEditorToolbar
          ? {
              backgroundColor: theme.background,
              borderColor: theme.border,
              bottom: insets.bottom + 8,
              left: 8,
              right: 8,
            }
          : {
              backgroundColor: theme.background,
              borderColor: theme.border,
              paddingBottom: Math.max(insets.bottom, 8),
            },
      ]}
    >
      {toolbarContent}
    </GlassEffect>
  );
}

const styles = StyleSheet.create({
  desktopContainer: { borderTopWidth: StyleSheet.hairlineWidth },
  mobileDockedContainer: {
    alignItems: "center",
    borderTopWidth: StyleSheet.hairlineWidth,
    bottom: 0,
    flexDirection: "row",
    left: 0,
    minHeight: MOBILE_EDITOR_TOOLBAR_HEIGHT,
    position: "absolute",
    right: 0,
    zIndex: 20,
  },
  mobileFloatingContainer: {
    alignItems: "center",
    borderRadius: 24,
    flexDirection: "row",
    height: MOBILE_EDITOR_TOOLBAR_HEIGHT,
    paddingHorizontal: 6,
    position: "absolute",
    zIndex: 20,
  },
  content: { alignItems: "center", gap: 2, paddingHorizontal: 4 },
  mobileToolbarRow: { alignItems: "center", flex: 1, flexDirection: "row" },
  scroll: { flex: 1 },
});
