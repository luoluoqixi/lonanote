import {
  Baseline,
  Bold,
  ChevronDown,
  Code2,
  Highlighter,
  Italic,
  Keyboard as KeyboardIcon,
  Plus,
  Redo2,
  Strikethrough,
  Undo2,
} from "lucide-react-native";
import { type ReactNode, useCallback, useEffect, useMemo, useState } from "react";
import { Keyboard, ScrollView, StyleSheet, View } from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { Button, useUiTheme } from "rn-ui-kit";
import { GlassEffect, type KeyboardVisibilityPhase, useKeyboardVisibility } from "rn-ui-kit/core";

import { isMobile } from "@/api/common/platform";
import type { EditorCommand } from "@/assets/editor/src/bridge/protocol";
import { editorCommandCoordinator } from "@/components/editor/controllers";
import type { DocumentModel, EditorViewSession } from "@/stores/editor";

import { MOBILE_EDITOR_TOOLBAR_HEIGHT, MOBILE_EDITOR_TOOLBAR_PANEL_HEIGHT } from "./editor_layout";

type ToolbarPanel = "insert" | "format";

type ToolbarIconButtonProps = {
  accessibilityLabel: string;
  children: ReactNode;
  disabled?: boolean;
  onPress: () => void;
  selected?: boolean;
};

function ToolbarIconButton({
  accessibilityLabel,
  children,
  disabled,
  onPress,
  selected = false,
}: ToolbarIconButtonProps) {
  const theme = useUiTheme();
  return (
    <Button
      aria-label={accessibilityLabel}
      buttonSize={{ height: MOBILE_EDITOR_TOOLBAR_HEIGHT - 1, width: 42 }}
      disabled={disabled}
      onPress={onPress}
      size="xs"
      style={selected ? { backgroundColor: theme.muted } : undefined}
      variant="icon"
    >
      {children}
    </Button>
  );
}

export function EditorToolbar({
  document,
  editor,
  onMobileOverlayHeightChange,
}: {
  document: DocumentModel;
  editor: EditorViewSession;
  onMobileOverlayHeightChange?: (height: number) => void;
}) {
  const theme = useUiTheme();
  const insets = useSafeAreaInsets();
  const [keyboardVisible, setKeyboardVisible] = useState(false);
  const [activePanel, setActivePanel] = useState<ToolbarPanel | null>(null);
  const handleKeyboardPhaseChange = useCallback((phase: KeyboardVisibilityPhase) => {
    setKeyboardVisible(phase !== "hidden");
  }, []);
  useKeyboardVisibility({ onPhaseChange: handleKeyboardPhaseChange });

  const disabled =
    editor.bridgeState !== "ready" ||
    editor.readOnly ||
    editor.previewMode ||
    document.editOwnerEditorId !== editor.editorId;
  const panelHeight = activePanel === null ? 0 : MOBILE_EDITOR_TOOLBAR_PANEL_HEIGHT + insets.bottom;
  const contentOverlayHeight =
    activePanel === null ? 0 : panelHeight + MOBILE_EDITOR_TOOLBAR_HEIGHT;

  useEffect(() => {
    if (!isMobile()) return;
    onMobileOverlayHeightChange?.(contentOverlayHeight);
    return () => onMobileOverlayHeightChange?.(0);
  }, [contentOverlayHeight, onMobileOverlayHeightChange]);

  const executeCommand = useCallback(
    (command: EditorCommand) =>
      editorCommandCoordinator.execute(editor.editorId, command).catch(() => undefined),
    [editor.editorId],
  );
  const focusEditor = useCallback(() => {
    setActivePanel(null);
    void executeCommand({ type: "editor.focus" });
  }, [executeCommand]);
  const hideKeyboard = useCallback(() => {
    setActivePanel(null);
    void executeCommand({ type: "editor.blur" }).finally(() => Keyboard.dismiss());
  }, [executeCommand]);
  const togglePanel = useCallback(
    (panel: ToolbarPanel) => {
      if (activePanel === panel) {
        focusEditor();
        return;
      }
      setActivePanel(panel);
      void executeCommand({ type: "editor.blur" }).finally(() => Keyboard.dismiss());
    },
    [activePanel, executeCommand, focusEditor],
  );

  const desktopItems = [
    {
      command: { type: "history.undo" } as const,
      disabled: !editor.editorState.canUndo,
      icon: Undo2,
      label: "撤销",
    },
    {
      command: { type: "history.redo" } as const,
      disabled: !editor.editorState.canRedo,
      icon: Redo2,
      label: "重做",
    },
    { command: { type: "mark.toggle", mark: "bold" } as const, icon: Bold, label: "粗体" },
    { command: { type: "mark.toggle", mark: "italic" } as const, icon: Italic, label: "斜体" },
    {
      command: { type: "mark.toggle", mark: "inlineCode" } as const,
      icon: Code2,
      label: "行内代码",
    },
  ];

  const panelActions = useMemo(
    () =>
      activePanel === "insert"
        ? [
            {
              command: { type: "block.set", block: "heading", level: 1 } as const,
              label: "一级标题",
            },
            {
              command: { type: "block.set", block: "heading", level: 2 } as const,
              label: "二级标题",
            },
            {
              command: { type: "block.set", block: "heading", level: 3 } as const,
              label: "三级标题",
            },
            {
              command: { type: "block.set", block: "heading", level: 4 } as const,
              label: "四级标题",
            },
            {
              command: { type: "block.set", block: "heading", level: 5 } as const,
              label: "五级标题",
            },
            {
              command: { type: "block.set", block: "heading", level: 6 } as const,
              label: "六级标题",
            },
            { command: { type: "block.set", block: "paragraph" } as const, label: "正文" },
            { command: { type: "block.set", block: "blockquote" } as const, label: "引用" },
            { command: { type: "insert.horizontalRule" } as const, label: "分割线" },
            { command: { type: "list.toggle", list: "unordered" } as const, label: "无序列表" },
            { command: { type: "list.toggle", list: "ordered" } as const, label: "有序列表" },
            { command: { type: "list.toggle", list: "task" } as const, label: "任务列表" },
            { command: { type: "insert.link" } as const, label: "链接" },
            { command: { type: "insert.image" } as const, label: "图片" },
            { command: { type: "insert.codeBlock" } as const, label: "代码块" },
            { command: { type: "insert.table" } as const, label: "表格" },
          ]
        : [
            { command: { type: "block.set", block: "heading", level: 1 } as const, label: "H1" },
            { command: { type: "block.set", block: "heading", level: 2 } as const, label: "H2" },
            { command: { type: "block.set", block: "heading", level: 3 } as const, label: "H3" },
            { command: { type: "block.set", block: "heading", level: 4 } as const, label: "H4" },
            { command: { type: "block.set", block: "heading", level: 5 } as const, label: "H5" },
            { command: { type: "block.set", block: "heading", level: 6 } as const, label: "H6" },
            { command: { type: "block.set", block: "paragraph" } as const, label: "正文" },
            { command: { type: "list.toggle", list: "unordered" } as const, label: "无序列表" },
            { command: { type: "list.toggle", list: "ordered" } as const, label: "有序列表" },
            { command: { type: "list.toggle", list: "task" } as const, label: "任务列表" },
            { command: { type: "block.set", block: "blockquote" } as const, label: "引用" },
          ],
    [activePanel],
  );

  if (!isMobile()) {
    return (
      <View
        style={[
          styles.desktopContainer,
          { backgroundColor: theme.background, borderColor: theme.border },
        ]}
      >
        <ScrollView
          contentContainerStyle={styles.desktopContent}
          horizontal
          showsHorizontalScrollIndicator={false}
        >
          {desktopItems.map(({ command, disabled: itemDisabled, icon: Icon, label }) => (
            <Button
              aria-label={label}
              disabled={disabled || itemDisabled}
              key={label}
              onPress={() => void executeCommand(command)}
              size="xs"
              variant="icon"
            >
              <Icon color={theme.foreground} size={18} />
            </Button>
          ))}
        </ScrollView>
      </View>
    );
  }

  if (!keyboardVisible && activePanel === null) return null;

  return (
    <>
      {activePanel === null ? null : (
        <View style={[styles.panel, { backgroundColor: theme.background, height: panelHeight }]}>
          <ScrollView
            contentContainerStyle={styles.panelContent}
            showsVerticalScrollIndicator={false}
          >
            <View style={styles.panelGrid}>
              {panelActions.map(({ command, label }) => (
                <View key={label} style={styles.panelCell}>
                  <Button
                    disabled={disabled}
                    onPress={() => {
                      void executeCommand(command);
                      if (activePanel === "insert") focusEditor();
                    }}
                    size="sm"
                    style={styles.panelButton}
                    title={label}
                    variant="outline"
                  />
                </View>
              ))}
            </View>
          </ScrollView>
        </View>
      )}
      <GlassEffect
        accessibilityLabel="编辑工具栏"
        keyboardAvoidance={activePanel === null ? { subtractSafeAreaInset: false } : false}
        keyboardHiddenConfirmation={{ finalHeight: -MOBILE_EDITOR_TOOLBAR_HEIGHT }}
        style={[
          styles.mobileToolbar,
          { backgroundColor: theme.background, borderColor: theme.border, bottom: panelHeight },
        ]}
      >
        <View style={styles.mobileToolbarRow}>
          <ScrollView
            contentContainerStyle={styles.mobileActionContent}
            horizontal
            showsHorizontalScrollIndicator={false}
            style={styles.mobileActionScroll}
          >
            <ToolbarIconButton
              accessibilityLabel="插入内容"
              disabled={disabled}
              onPress={() => togglePanel("insert")}
              selected={activePanel === "insert"}
            >
              <Plus color={theme.foreground} size={24} />
            </ToolbarIconButton>
            <ToolbarIconButton
              accessibilityLabel="文本样式"
              disabled={disabled}
              onPress={() => togglePanel("format")}
              selected={activePanel === "format"}
            >
              <Baseline color={theme.foreground} size={24} />
            </ToolbarIconButton>
            <ToolbarIconButton
              accessibilityLabel="粗体"
              disabled={disabled}
              onPress={() => void executeCommand({ type: "mark.toggle", mark: "bold" })}
            >
              <Bold color={theme.foreground} size={23} />
            </ToolbarIconButton>
            <ToolbarIconButton
              accessibilityLabel="斜体"
              disabled={disabled}
              onPress={() => void executeCommand({ type: "mark.toggle", mark: "italic" })}
            >
              <Italic color={theme.foreground} size={23} />
            </ToolbarIconButton>
            <ToolbarIconButton
              accessibilityLabel="删除线"
              disabled={disabled}
              onPress={() => void executeCommand({ type: "mark.toggle", mark: "strikethrough" })}
            >
              <Strikethrough color={theme.foreground} size={22} />
            </ToolbarIconButton>
            <ToolbarIconButton
              accessibilityLabel="高亮"
              disabled={disabled}
              onPress={() => void executeCommand({ type: "mark.toggle", mark: "highlight" })}
            >
              <Highlighter color={theme.foreground} size={22} />
            </ToolbarIconButton>
            <ToolbarIconButton
              accessibilityLabel="行内代码"
              disabled={disabled}
              onPress={() => void executeCommand({ type: "mark.toggle", mark: "inlineCode" })}
            >
              <Code2 color={theme.foreground} size={22} />
            </ToolbarIconButton>
          </ScrollView>
          <View style={styles.trailingActions}>
            <ToolbarIconButton
              accessibilityLabel="撤销"
              disabled={disabled || !editor.editorState.canUndo}
              onPress={() => void executeCommand({ type: "history.undo" })}
            >
              <Undo2 color={theme.foreground} size={23} />
            </ToolbarIconButton>
            <ToolbarIconButton
              accessibilityLabel="重做"
              disabled={disabled || !editor.editorState.canRedo}
              onPress={() => void executeCommand({ type: "history.redo" })}
            >
              <Redo2 color={theme.foreground} size={23} />
            </ToolbarIconButton>
            <View style={[styles.trailingDivider, { backgroundColor: theme.border }]} />
            <ToolbarIconButton accessibilityLabel="隐藏键盘" onPress={hideKeyboard}>
              <View style={styles.keyboardHideIcon}>
                <KeyboardIcon color={theme.foreground} size={24} />
                <ChevronDown
                  color={theme.foreground}
                  size={15}
                  style={styles.keyboardHideChevron}
                />
              </View>
            </ToolbarIconButton>
          </View>
        </View>
      </GlassEffect>
    </>
  );
}

const styles = StyleSheet.create({
  desktopContainer: { borderTopWidth: StyleSheet.hairlineWidth },
  desktopContent: { gap: 4, paddingHorizontal: 8, paddingVertical: 6 },
  keyboardHideChevron: { marginTop: -9 },
  keyboardHideIcon: { alignItems: "center", height: 28, justifyContent: "center" },
  mobileActionContent: { alignItems: "center", paddingHorizontal: 2 },
  mobileActionScroll: { flex: 1 },
  mobileToolbar: {
    borderTopWidth: StyleSheet.hairlineWidth,
    height: MOBILE_EDITOR_TOOLBAR_HEIGHT,
    left: 0,
    maxHeight: MOBILE_EDITOR_TOOLBAR_HEIGHT,
    minHeight: MOBILE_EDITOR_TOOLBAR_HEIGHT,
    overflow: "hidden",
    position: "absolute",
    right: 0,
    zIndex: 30,
  },
  mobileToolbarRow: { alignItems: "center", flex: 1, flexDirection: "row" },
  panel: { bottom: 0, left: 0, position: "absolute", right: 0, zIndex: 20 },
  panelButton: { width: "100%" },
  panelCell: { padding: 4, width: "50%" },
  panelContent: { paddingHorizontal: 8, paddingTop: 8 },
  panelGrid: { flexDirection: "row", flexWrap: "wrap" },
  trailingActions: { alignItems: "center", flexDirection: "row" },
  trailingDivider: { height: 28, marginHorizontal: 2, width: StyleSheet.hairlineWidth },
});
