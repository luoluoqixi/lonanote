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
import { type ReactNode, useCallback, useEffect, useMemo, useRef, useState } from "react";
import { Keyboard, ScrollView, StyleSheet, View } from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { Button, useUiTheme } from "rn-ui-kit";
import { GlassEffect, type KeyboardVisibilityPhase, useKeyboardVisibility } from "rn-ui-kit/core";

import { isMobile, os } from "@/api/common/platform";
import type { EditorCommand } from "@/assets/editor/src/bridge/protocol";
import { editorCommandCoordinator } from "@/components/editor/controllers";
import type { DocumentModel, EditorViewSession } from "@/stores/editor";

import {
  MOBILE_EDITOR_KEYBOARD_RESTORE_TIMEOUT_MS,
  MOBILE_EDITOR_TOOLBAR_CONTAINER_HEIGHT,
  MOBILE_EDITOR_TOOLBAR_HEIGHT,
  MOBILE_EDITOR_TOOLBAR_PADDING_HORIZONTAL,
  MOBILE_EDITOR_TOOLBAR_PADDING_VERTICAL,
  MOBILE_EDITOR_TOOLBAR_PANEL_FALLBACK_HEIGHT,
} from "./editor_layout";

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
      nativeHaptics
      onPress={onPress}
      size="xs"
      style={selected ? { backgroundColor: theme.muted } : undefined}
      variant="icon"
    >
      {children}
    </Button>
  );
}

function MobileToolbarRow({
  canRedo,
  canUndo,
  disabled,
  executeCommand,
  hideKeyboard,
  safeAreaLeft,
  safeAreaRight,
  selectedPanel,
  togglePanel,
}: {
  canRedo: boolean;
  canUndo: boolean;
  disabled: boolean;
  executeCommand: (command: EditorCommand) => void;
  hideKeyboard: () => void;
  safeAreaLeft: number;
  safeAreaRight: number;
  selectedPanel: ToolbarPanel | null;
  togglePanel: (panel: ToolbarPanel) => void;
}) {
  const theme = useUiTheme();
  return (
    <View
      style={[
        styles.mobileToolbarRow,
        {
          paddingLeft: safeAreaLeft,
          paddingRight: safeAreaRight,
          paddingTop: MOBILE_EDITOR_TOOLBAR_PADDING_VERTICAL,
          paddingBottom: MOBILE_EDITOR_TOOLBAR_PADDING_VERTICAL,
        },
      ]}
    >
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
          selected={selectedPanel === "insert"}
        >
          <Plus color={theme.foreground} size={24} />
        </ToolbarIconButton>
        <ToolbarIconButton
          accessibilityLabel="文本样式"
          disabled={disabled}
          onPress={() => togglePanel("format")}
          selected={selectedPanel === "format"}
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
          disabled={disabled || !canUndo}
          onPress={() => void executeCommand({ type: "history.undo" })}
        >
          <Undo2 color={theme.foreground} size={23} />
        </ToolbarIconButton>
        <ToolbarIconButton
          accessibilityLabel="重做"
          disabled={disabled || !canRedo}
          onPress={() => void executeCommand({ type: "history.redo" })}
        >
          <Redo2 color={theme.foreground} size={23} />
        </ToolbarIconButton>
        <View style={[styles.trailingDivider, { backgroundColor: theme.border }]} />
        <ToolbarIconButton accessibilityLabel="隐藏键盘" onPress={hideKeyboard}>
          <View style={styles.keyboardHideIcon}>
            <KeyboardIcon color={theme.foreground} size={24} />
            <ChevronDown color={theme.foreground} size={15} style={styles.keyboardHideChevron} />
          </View>
        </ToolbarIconButton>
      </View>
    </View>
  );
}

export function EditorToolbar({
  document,
  editor,
  onMobileInputMethodEnabledChange,
  onMobileOverlayHeightChange,
}: {
  document: DocumentModel;
  editor: EditorViewSession;
  onMobileInputMethodEnabledChange?: (enabled: boolean) => void;
  onMobileOverlayHeightChange?: (height: number) => void;
}) {
  const theme = useUiTheme();
  const insets = useSafeAreaInsets();
  const currentOs = os();
  const [keyboardVisible, setKeyboardVisible] = useState(false);
  const [activePanel, setActivePanel] = useState<ToolbarPanel | null>(null);
  const [restoringPanel, setRestoringPanel] = useState<ToolbarPanel | null>(null);
  const initialKeyboardHeight = Keyboard.metrics()?.height ?? 0;
  const [lastKeyboardHeight, setLastKeyboardHeight] = useState(() =>
    initialKeyboardHeight > 0 && currentOs === "android"
      ? initialKeyboardHeight + insets.bottom
      : initialKeyboardHeight,
  );
  const [isRestoringKeyboard, setIsRestoringKeyboard] = useState(false);
  const activePanelRef = useRef<ToolbarPanel | null>(null);
  const freezeKeyboardHeightRef = useRef(false);
  const panelKeyboardHiddenRef = useRef(false);
  const updateActivePanel = useCallback((panel: ToolbarPanel | null) => {
    activePanelRef.current = panel;
    setActivePanel(panel);
  }, []);
  const handleKeyboardPhaseChange = useCallback((phase: KeyboardVisibilityPhase) => {
    setKeyboardVisible(phase !== "hidden");
    if (phase === "visible") {
      freezeKeyboardHeightRef.current = false;
      setIsRestoringKeyboard(false);
      setRestoringPanel(null);
    }
  }, []);
  useKeyboardVisibility({ onPhaseChange: handleKeyboardPhaseChange });

  const disabled =
    editor.bridgeState !== "ready" ||
    editor.readOnly ||
    editor.previewMode ||
    document.editOwnerEditorId !== editor.editorId;
  const editorFocused = editor.editorState.focused;
  const displayedPanel = activePanel ?? restoringPanel;
  const replacementPanelHeight =
    lastKeyboardHeight > 0
      ? lastKeyboardHeight
      : MOBILE_EDITOR_TOOLBAR_PANEL_FALLBACK_HEIGHT + insets.bottom;
  const panelHeight = displayedPanel === null ? 0 : replacementPanelHeight;
  const contentOverlayHeight =
    displayedPanel !== null || isRestoringKeyboard
      ? replacementPanelHeight + MOBILE_EDITOR_TOOLBAR_CONTAINER_HEIGHT
      : 0;

  useEffect(() => {
    const normalizeKeyboardHeight = (height: number) =>
      height > 0 && currentOs === "android" ? height + insets.bottom : height;
    const updateLastKeyboardHeight = (height: number) => {
      if (!freezeKeyboardHeightRef.current && height > 0) {
        setLastKeyboardHeight(normalizeKeyboardHeight(height));
      }
    };
    const leavePanelForKeyboard = () => {
      if (
        currentOs !== "android" ||
        activePanelRef.current === null ||
        !panelKeyboardHiddenRef.current
      ) {
        return;
      }
      updateActivePanel(null);
      setRestoringPanel(null);
      setIsRestoringKeyboard(false);
      freezeKeyboardHeightRef.current = false;
      panelKeyboardHiddenRef.current = false;
      onMobileInputMethodEnabledChange?.(true);
    };
    const willShowSubscription = Keyboard.addListener("keyboardWillShow", (event) => {
      leavePanelForKeyboard();
      updateLastKeyboardHeight(event.endCoordinates.height);
    });
    const didShowSubscription = Keyboard.addListener("keyboardDidShow", (event) => {
      leavePanelForKeyboard();
      updateLastKeyboardHeight(event.endCoordinates.height);
    });
    const frameChangeSubscription = Keyboard.addListener("keyboardWillChangeFrame", (event) => {
      updateLastKeyboardHeight(event.endCoordinates.height);
    });
    const didHideSubscription = Keyboard.addListener("keyboardDidHide", () => {
      if (currentOs === "android") {
        setKeyboardVisible(false);
        if (activePanelRef.current !== null) {
          panelKeyboardHiddenRef.current = true;
        }
      }
    });
    return () => {
      willShowSubscription.remove();
      didShowSubscription.remove();
      frameChangeSubscription.remove();
      didHideSubscription.remove();
    };
  }, [currentOs, insets.bottom, onMobileInputMethodEnabledChange, updateActivePanel]);

  useEffect(() => {
    if (!isRestoringKeyboard) return;
    const timeout = setTimeout(() => {
      setIsRestoringKeyboard(false);
      setRestoringPanel(null);
      freezeKeyboardHeightRef.current = false;
      panelKeyboardHiddenRef.current = false;
    }, MOBILE_EDITOR_KEYBOARD_RESTORE_TIMEOUT_MS);
    return () => clearTimeout(timeout);
  }, [isRestoringKeyboard]);

  useEffect(() => {
    if (!isMobile()) return;
    onMobileOverlayHeightChange?.(contentOverlayHeight);
    return () => onMobileOverlayHeightChange?.(0);
  }, [contentOverlayHeight, onMobileOverlayHeightChange]);

  useEffect(() => {
    if (!isMobile()) return;
    onMobileInputMethodEnabledChange?.(activePanel === null);
  }, [activePanel, onMobileInputMethodEnabledChange]);

  useEffect(
    () => () => onMobileInputMethodEnabledChange?.(true),
    [onMobileInputMethodEnabledChange],
  );

  useEffect(() => {
    if (editorFocused || (activePanel === null && restoringPanel === null)) return;
    updateActivePanel(null);
    setRestoringPanel(null);
    setIsRestoringKeyboard(false);
    freezeKeyboardHeightRef.current = false;
    panelKeyboardHiddenRef.current = false;
  }, [activePanel, editorFocused, restoringPanel, updateActivePanel]);

  const executeCommand = useCallback(
    (command: EditorCommand) =>
      editorCommandCoordinator.execute(editor.editorId, command).catch(() => undefined),
    [editor.editorId],
  );
  const restoreKeyboard = useCallback(() => {
    setRestoringPanel(activePanel);
    setIsRestoringKeyboard(true);
    updateActivePanel(null);
    panelKeyboardHiddenRef.current = false;
  }, [activePanel, updateActivePanel]);
  const hideKeyboard = useCallback(() => {
    setIsRestoringKeyboard(false);
    updateActivePanel(null);
    setRestoringPanel(null);
    freezeKeyboardHeightRef.current = false;
    panelKeyboardHiddenRef.current = false;
    void executeCommand({ type: "editor.blur" }).finally(() => Keyboard.dismiss());
  }, [executeCommand, updateActivePanel]);
  const togglePanel = useCallback(
    (panel: ToolbarPanel) => {
      if (activePanel === panel) {
        restoreKeyboard();
        return;
      }
      const keyboardHeight = Keyboard.metrics()?.height ?? 0;
      if (keyboardHeight > 0) {
        setLastKeyboardHeight(
          currentOs === "android" ? keyboardHeight + insets.bottom : keyboardHeight,
        );
      }
      freezeKeyboardHeightRef.current = true;
      panelKeyboardHiddenRef.current = currentOs === "android" && keyboardHeight <= 0;
      if (currentOs === "android") {
        onMobileInputMethodEnabledChange?.(false);
        Keyboard.dismiss();
      }
      setIsRestoringKeyboard(false);
      setRestoringPanel(null);
      updateActivePanel(panel);
    },
    [
      activePanel,
      currentOs,
      insets.bottom,
      onMobileInputMethodEnabledChange,
      restoreKeyboard,
      updateActivePanel,
    ],
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
      displayedPanel === "insert"
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
    [displayedPanel],
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
              nativeHaptics
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

  if (!keyboardVisible && displayedPanel === null && !isRestoringKeyboard) {
    return null;
  }

  return (
    <>
      {displayedPanel === null ? null : (
        <View style={[styles.panel, { backgroundColor: theme.background, height: panelHeight }]}>
          <ScrollView
            contentContainerStyle={[
              styles.panelContent,
              {
                paddingBottom: insets.bottom + 8,
                paddingLeft: insets.left + 8,
                paddingRight: insets.right + 8,
              },
            ]}
            showsVerticalScrollIndicator={true}
          >
            <View style={styles.panelGrid}>
              {panelActions.map(({ command, label }) => (
                <View key={label} style={styles.panelCell}>
                  <Button
                    disabled={disabled}
                    nativeHaptics
                    onPress={() => {
                      void executeCommand(command);
                      if (activePanel === "insert") restoreKeyboard();
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
        accessibilityElementsHidden={displayedPanel !== null}
        accessibilityLabel="编辑工具栏"
        importantForAccessibility={displayedPanel === null ? "auto" : "no-hide-descendants"}
        keyboardAvoidance={{ subtractSafeAreaInset: false }}
        keyboardHiddenConfirmation={{ finalHeight: -MOBILE_EDITOR_TOOLBAR_CONTAINER_HEIGHT }}
        pointerEvents={displayedPanel === null ? "auto" : "none"}
        style={[
          styles.mobileToolbar,
          {
            backgroundColor: theme.background,
            borderColor: theme.border,
            bottom: 0,
            opacity: displayedPanel === null ? 1 : 0,
          },
        ]}
      >
        <MobileToolbarRow
          canRedo={editor.editorState.canRedo}
          canUndo={editor.editorState.canUndo}
          disabled={disabled}
          executeCommand={executeCommand}
          hideKeyboard={hideKeyboard}
          safeAreaLeft={insets.left}
          safeAreaRight={insets.right}
          selectedPanel={activePanel}
          togglePanel={togglePanel}
        />
      </GlassEffect>
      {displayedPanel === null ? null : (
        <GlassEffect
          accessibilityLabel="编辑工具栏"
          keyboardAvoidance={false}
          style={[
            styles.mobileToolbar,
            {
              backgroundColor: theme.background,
              borderColor: theme.border,
              bottom: panelHeight,
            },
          ]}
        >
          <MobileToolbarRow
            canRedo={editor.editorState.canRedo}
            canUndo={editor.editorState.canUndo}
            disabled={disabled}
            executeCommand={executeCommand}
            hideKeyboard={hideKeyboard}
            safeAreaLeft={insets.left}
            safeAreaRight={insets.right}
            selectedPanel={activePanel}
            togglePanel={togglePanel}
          />
        </GlassEffect>
      )}
    </>
  );
}

const styles = StyleSheet.create({
  desktopContainer: { borderTopWidth: StyleSheet.hairlineWidth },
  desktopContent: { gap: 4, paddingHorizontal: 8, paddingVertical: 6 },
  keyboardHideChevron: { marginTop: -9 },
  keyboardHideIcon: { alignItems: "center", height: 28, justifyContent: "center" },
  mobileActionContent: {
    alignItems: "center",
    paddingHorizontal: MOBILE_EDITOR_TOOLBAR_PADDING_HORIZONTAL,
  },
  mobileActionScroll: { flex: 1 },
  mobileToolbar: {
    borderTopWidth: StyleSheet.hairlineWidth,
    height: MOBILE_EDITOR_TOOLBAR_CONTAINER_HEIGHT,
    left: 0,
    maxHeight: MOBILE_EDITOR_TOOLBAR_CONTAINER_HEIGHT,
    minHeight: MOBILE_EDITOR_TOOLBAR_CONTAINER_HEIGHT,
    overflow: "hidden",
    position: "absolute",
    right: 0,
    zIndex: 30,
  },
  mobileToolbarRow: {
    alignItems: "center",
    flex: 1,
    flexDirection: "row",
  },
  panel: { bottom: 0, left: 0, position: "absolute", right: 0, zIndex: 20 },
  panelButton: { width: "100%" },
  panelCell: { padding: 4, width: "50%" },
  panelContent: { paddingTop: 8 },
  panelGrid: { flexDirection: "row", flexWrap: "wrap" },
  trailingActions: {
    alignItems: "center",
    flexDirection: "row",
    right: MOBILE_EDITOR_TOOLBAR_PADDING_HORIZONTAL,
  },
  trailingDivider: { height: 28, marginHorizontal: 2, width: StyleSheet.hairlineWidth },
});
