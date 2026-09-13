import { useIsFocused } from "@react-navigation/native";
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
import {
  Keyboard,
  ScrollView,
  type StyleProp,
  StyleSheet,
  View,
  type ViewStyle,
} from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { Button, useUiTheme } from "rn-ui-kit";
import {
  GlassEffect,
  type KeyboardVisibilityPhase,
  isLiquidGlassAvailable,
  useKeyboardVisibility,
} from "rn-ui-kit/core";

import { isIos26Plus, isMobile, os } from "@/api/common/platform";
import type { EditorCommand } from "@/assets/editor/src/bridge/protocol";
import { editorCommandCoordinator } from "@/components/editor/controllers";
import type { DocumentModel, EditorViewSession } from "@/stores/editor";

import {
  MOBILE_EDITOR_KEYBOARD_RESTORE_TIMEOUT_MS,
  MOBILE_EDITOR_TOOLBAR_HEIGHT,
  MOBILE_EDITOR_TOOLBAR_PADDING_VERTICAL,
  MOBILE_EDITOR_TOOLBAR_PANEL_FALLBACK_HEIGHT,
  getMobileEditorToolbarContainerHeight,
  getMobileEditorToolbarHeight,
} from "./editor_layout";

type ToolbarPanel = "insert" | "format";

const MOBILE_EDITOR_TOOLBAR_BUTTON_WIDTH = 42;
const MOBILE_EDITOR_TOOLBAR_SURFACE_GAP = 8;
const TOOLBAR_SURFACE_FALLBACK_OPACITY = 0.8;
const TOOLBAR_SURFACE_FALLBACK_SHADOW = "0 1px 3px rgba(0, 0, 0, 0.10)";

function withBackgroundOpacity(color: string, opacity: number): string {
  const value = color.trim();
  const hex = value.match(/^#([\da-f]{3}|[\da-f]{6})$/i)?.[1];

  if (hex != null) {
    const expanded =
      hex.length === 3
        ? hex
            .split("")
            .map((character) => character + character)
            .join("")
        : hex;
    const channels = [0, 2, 4].map((index) =>
      Number.parseInt(expanded.slice(index, index + 2), 16),
    );
    return `rgba(${channels.join(", ")}, ${opacity})`;
  }

  const rgb = value.match(
    /^rgba?\(\s*(\d+(?:\.\d+)?)\s*,\s*(\d+(?:\.\d+)?)\s*,\s*(\d+(?:\.\d+)?)\s*(?:,\s*[\d.]+)?\s*\)$/i,
  );
  return rgb == null ? value : `rgba(${rgb[1]}, ${rgb[2]}, ${rgb[3]}, ${opacity})`;
}

type ToolbarIconButtonProps = {
  accessibilityLabel: string;
  children: ReactNode | ((pressed: boolean) => ReactNode);
  disabled?: boolean;
  onPress: () => void;
  simple?: boolean;
  selected?: boolean;
  usesLiquidGlass?: boolean;
};

function ToolbarIconButton({
  accessibilityLabel,
  children,
  disabled,
  onPress,
  simple = false,
  selected,
  usesLiquidGlass = false,
}: ToolbarIconButtonProps) {
  const theme = useUiTheme();
  const [pressed, setPressed] = useState(false);
  const isPanelToggle = selected !== undefined;
  return (
    <Button
      aria-label={accessibilityLabel}
      aria-pressed={isPanelToggle ? selected : undefined}
      buttonSize={{
        height: MOBILE_EDITOR_TOOLBAR_HEIGHT,
        width: MOBILE_EDITOR_TOOLBAR_BUTTON_WIDTH,
      }}
      circular
      disabled={disabled}
      nativeHaptics
      onPress={onPress}
      onPressIn={simple ? () => setPressed(true) : undefined}
      onPressOut={simple ? () => setPressed(false) : undefined}
      size="xs"
      style={
        isPanelToggle
          ? ({ pressed }) => (selected || pressed ? { backgroundColor: theme.accent } : undefined)
          : simple
            ? ({ pressed }) => ({
                backgroundColor:
                  usesLiquidGlass || !pressed
                    ? "transparent"
                    : withBackgroundOpacity(theme.accent, TOOLBAR_SURFACE_FALLBACK_OPACITY),
              })
            : undefined
      }
      variant="icon"
    >
      {typeof children === "function" ? children(pressed) : children}
    </Button>
  );
}

function MobileToolbarSurface({
  children,
  interactive = true,
  style,
  toolbarHeight,
  usesLiquidGlass,
}: {
  children: ReactNode;
  interactive?: boolean;
  style?: StyleProp<ViewStyle>;
  toolbarHeight: number;
  usesLiquidGlass: boolean;
}) {
  const theme = useUiTheme();
  const fallbackStyle = !usesLiquidGlass
    ? {
        backgroundColor: withBackgroundOpacity(theme.muted, TOOLBAR_SURFACE_FALLBACK_OPACITY),
        boxShadow: isIos26Plus() ? undefined : TOOLBAR_SURFACE_FALLBACK_SHADOW,
      }
    : undefined;

  return (
    <GlassEffect
      glassEffectStyle={usesLiquidGlass ? "regular" : "none"}
      isInteractive={usesLiquidGlass && interactive}
      style={[
        styles.mobileToolbarSurface,
        { borderRadius: toolbarHeight / 2, height: toolbarHeight },
        fallbackStyle,
        style,
      ]}
    >
      {children}
    </GlassEffect>
  );
}

function MobileScrollableToolbarSurface({
  children,
  toolbarHeight,
  usesLiquidGlass,
}: {
  children: ReactNode;
  toolbarHeight: number;
  usesLiquidGlass: boolean;
}) {
  const theme = useUiTheme();
  const fallbackStyle = !usesLiquidGlass
    ? {
        backgroundColor: withBackgroundOpacity(theme.muted, TOOLBAR_SURFACE_FALLBACK_OPACITY),
        boxShadow: isIos26Plus() ? undefined : TOOLBAR_SURFACE_FALLBACK_SHADOW,
      }
    : undefined;

  return (
    <View
      style={[
        styles.mobileToolbarSurface,
        styles.mobileActionSurface,
        { borderRadius: toolbarHeight / 2, height: toolbarHeight },
      ]}
    >
      <GlassEffect
        glassEffectStyle={usesLiquidGlass ? "regular" : "none"}
        pointerEvents="none"
        style={[
          styles.mobileToolbarSurfaceBackground,
          { borderRadius: toolbarHeight / 2 },
          fallbackStyle,
        ]}
      />
      {children}
    </View>
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
  toolbarHeight,
  togglePanel,
  usesLiquidGlass,
}: {
  canRedo: boolean;
  canUndo: boolean;
  disabled: boolean;
  executeCommand: (command: EditorCommand) => void;
  hideKeyboard: () => void;
  safeAreaLeft: number;
  safeAreaRight: number;
  selectedPanel: ToolbarPanel | null;
  toolbarHeight: number;
  togglePanel: (panel: ToolbarPanel) => void;
  usesLiquidGlass: boolean;
}) {
  const theme = useUiTheme();
  return (
    <View
      style={[
        styles.mobileToolbarRow,
        {
          paddingLeft: safeAreaLeft + MOBILE_EDITOR_TOOLBAR_SURFACE_GAP,
          paddingRight: safeAreaRight + MOBILE_EDITOR_TOOLBAR_SURFACE_GAP,
          paddingTop: MOBILE_EDITOR_TOOLBAR_PADDING_VERTICAL,
          paddingBottom: MOBILE_EDITOR_TOOLBAR_PADDING_VERTICAL,
        },
      ]}
    >
      <MobileScrollableToolbarSurface
        toolbarHeight={toolbarHeight}
        usesLiquidGlass={usesLiquidGlass}
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
      </MobileScrollableToolbarSurface>
      <View style={styles.trailingActions}>
        <MobileToolbarSurface
          style={styles.mobileHistorySurface}
          toolbarHeight={toolbarHeight}
          usesLiquidGlass={usesLiquidGlass}
        >
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
        </MobileToolbarSurface>
        <MobileToolbarSurface
          style={styles.mobileKeyboardSurface}
          toolbarHeight={toolbarHeight}
          usesLiquidGlass={usesLiquidGlass}
        >
          <ToolbarIconButton
            accessibilityLabel="隐藏键盘"
            onPress={hideKeyboard}
            simple
            usesLiquidGlass={usesLiquidGlass}
          >
            {(pressed) => (
              <View
                style={[
                  styles.keyboardHideIcon,
                  !usesLiquidGlass && pressed ? styles.keyboardHideIconPressed : null,
                ]}
              >
                <KeyboardIcon color={theme.foreground} size={24} />
                <ChevronDown
                  color={theme.foreground}
                  size={15}
                  style={styles.keyboardHideChevron}
                />
              </View>
            )}
          </ToolbarIconButton>
        </MobileToolbarSurface>
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
  const isScreenFocused = useIsFocused();
  const currentOs = os();
  const isIos26OrLater = isIos26Plus();
  const usesLiquidGlass = isIos26Plus() && isLiquidGlassAvailable();
  const toolbarHeight = getMobileEditorToolbarHeight(isIos26OrLater);
  const toolbarContainerHeight = getMobileEditorToolbarContainerHeight(isIos26OrLater);
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
  const isScreenFocusedRef = useRef(isScreenFocused);
  const panelKeyboardHiddenRef = useRef(false);
  isScreenFocusedRef.current = isScreenFocused;
  const updateActivePanel = useCallback((panel: ToolbarPanel | null) => {
    activePanelRef.current = panel;
    setActivePanel(panel);
  }, []);
  const handleKeyboardPhaseChange = useCallback((phase: KeyboardVisibilityPhase) => {
    if (!isScreenFocusedRef.current) {
      setKeyboardVisible(false);
      return;
    }
    setKeyboardVisible(phase !== "hidden");
    if (phase === "visible") {
      freezeKeyboardHeightRef.current = false;
      setIsRestoringKeyboard(false);
      setRestoringPanel(null);
    }
  }, []);
  useKeyboardVisibility({ onPhaseChange: handleKeyboardPhaseChange });

  useEffect(() => {
    if (isScreenFocused || !isMobile()) return;

    setKeyboardVisible(false);
    updateActivePanel(null);
    setRestoringPanel(null);
    setIsRestoringKeyboard(false);
    freezeKeyboardHeightRef.current = false;
    panelKeyboardHiddenRef.current = false;
  }, [isScreenFocused, updateActivePanel]);

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
  const panelFallbackStyle = !usesLiquidGlass
    ? {
        backgroundColor: withBackgroundOpacity(theme.muted, TOOLBAR_SURFACE_FALLBACK_OPACITY),
        boxShadow: isIos26Plus() ? undefined : TOOLBAR_SURFACE_FALLBACK_SHADOW,
      }
    : undefined;
  const contentOverlayHeight =
    displayedPanel !== null || isRestoringKeyboard
      ? replacementPanelHeight + toolbarContainerHeight
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
    const handleKeyboardShow = (height: number) => {
      if (isScreenFocusedRef.current) {
        // iOS 页面转场后 keyboard phase 可能仍停留在 visible，需用原生事件重新同步显示状态。
        setKeyboardVisible(true);
      }
      leavePanelForKeyboard();
      updateLastKeyboardHeight(height);
    };
    const willShowSubscription = Keyboard.addListener("keyboardWillShow", (event) => {
      handleKeyboardShow(event.endCoordinates.height);
    });
    const didShowSubscription = Keyboard.addListener("keyboardDidShow", (event) => {
      handleKeyboardShow(event.endCoordinates.height);
    });
    const frameChangeSubscription = Keyboard.addListener("keyboardWillChangeFrame", (event) => {
      updateLastKeyboardHeight(event.endCoordinates.height);
    });
    const didHideSubscription = Keyboard.addListener("keyboardDidHide", () => {
      setKeyboardVisible(false);
      if (currentOs === "ios") {
        // 自定义面板接管键盘空间时仍需保留 WebView 焦点；否则会触发下方失焦清理并关闭面板。
        if (activePanelRef.current !== null) return;
        // 系统键盘的收起不会让 WKWebView 自动 blur。保留焦点会让图片等 widget 的下一次点击只更新选区。
        void editorCommandCoordinator
          .execute(editor.editorId, { type: "editor.blur" })
          .catch(() => undefined);
        return;
      }
      if (currentOs === "android") {
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
  }, [
    currentOs,
    editor.editorId,
    insets.bottom,
    onMobileInputMethodEnabledChange,
    updateActivePanel,
  ]);

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
        <View style={[styles.panel, { height: panelHeight }]}>
          <GlassEffect
            glassEffectStyle={usesLiquidGlass ? "regular" : "none"}
            pointerEvents="none"
            style={[styles.panelBackground, panelFallbackStyle]}
          />
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
        glassEffectStyle="none"
        importantForAccessibility={displayedPanel === null ? "auto" : "no-hide-descendants"}
        keyboardAvoidance={{ subtractSafeAreaInset: false }}
        keyboardHiddenConfirmation={{ finalHeight: -toolbarContainerHeight }}
        pointerEvents={displayedPanel === null ? "auto" : "none"}
        style={[
          styles.mobileToolbar,
          {
            bottom: 0,
            height: toolbarContainerHeight,
            maxHeight: toolbarContainerHeight,
            minHeight: toolbarContainerHeight,
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
          toolbarHeight={toolbarHeight}
          togglePanel={togglePanel}
          usesLiquidGlass={usesLiquidGlass}
        />
      </GlassEffect>
      {displayedPanel === null ? null : (
        <GlassEffect
          accessibilityLabel="编辑工具栏"
          glassEffectStyle="none"
          keyboardAvoidance={false}
          style={[
            styles.mobileToolbar,
            {
              bottom: panelHeight,
              height: toolbarContainerHeight,
              maxHeight: toolbarContainerHeight,
              minHeight: toolbarContainerHeight,
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
            toolbarHeight={toolbarHeight}
            togglePanel={togglePanel}
            usesLiquidGlass={usesLiquidGlass}
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
  keyboardHideIcon: {
    alignItems: "center",
    height: 28,
    justifyContent: "center",
    transform: [{ translateY: 2 }],
  },
  keyboardHideIconPressed: { opacity: 0.6 },
  mobileActionContent: {
    alignItems: "center",
    paddingHorizontal: 2,
  },
  mobileActionScroll: { alignSelf: "stretch", flex: 1 },
  mobileActionSurface: { flex: 1, minWidth: 0 },
  mobileHistorySurface: {
    flexDirection: "row",
    width: MOBILE_EDITOR_TOOLBAR_BUTTON_WIDTH * 2,
  },
  mobileKeyboardSurface: { width: MOBILE_EDITOR_TOOLBAR_BUTTON_WIDTH },
  mobileToolbar: {
    left: 0,
    position: "absolute",
    right: 0,
    zIndex: 30,
  },
  mobileToolbarRow: {
    alignItems: "center",
    flex: 1,
    flexDirection: "row",
  },
  mobileToolbarSurface: {
    alignItems: "center",
    borderCurve: "continuous",
    borderRadius: MOBILE_EDITOR_TOOLBAR_HEIGHT / 2,
    height: MOBILE_EDITOR_TOOLBAR_HEIGHT,
    justifyContent: "center",
    overflow: "hidden",
  },
  mobileToolbarSurfaceBackground: {
    ...StyleSheet.absoluteFillObject,
    borderCurve: "continuous",
    borderRadius: MOBILE_EDITOR_TOOLBAR_HEIGHT / 2,
  },
  panel: {
    borderCurve: "continuous",
    borderTopLeftRadius: 24,
    borderTopRightRadius: 24,
    bottom: 0,
    left: 0,
    overflow: "hidden",
    position: "absolute",
    right: 0,
    zIndex: 20,
  },
  panelBackground: StyleSheet.absoluteFillObject,
  panelButton: { width: "100%" },
  panelCell: { padding: 4, width: "50%" },
  panelContent: { paddingTop: 8 },
  panelGrid: { flexDirection: "row", flexWrap: "wrap" },
  trailingActions: {
    alignItems: "center",
    flexDirection: "row",
    gap: MOBILE_EDITOR_TOOLBAR_SURFACE_GAP,
    marginLeft: MOBILE_EDITOR_TOOLBAR_SURFACE_GAP,
  },
});
