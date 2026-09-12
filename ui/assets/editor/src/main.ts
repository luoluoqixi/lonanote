import { EditorView } from "@codemirror/view";
import { PurrMDFeatures, commands } from "purrmd";

import {
  EDITOR_BRIDGE_PROTOCOL_VERSION,
  type EditorBridgeBootstrap,
  type EditorBridgeError,
  type EditorBridgeEvent,
  type EditorBridgeMessage,
  type EditorBridgeRequest,
  type EditorCommand,
  type EditorDocumentRevisionPayload,
  type EditorInitializePayload,
  type EditorInputEnabledPayload,
  type EditorPreferences,
  type EditorResourceActivatedPayload,
  type EditorResourceContext,
  type EditorRuntimeUpdatePayload,
  type EditorStateSnapshot,
  isEditorBridgeBootstrap,
  isEditorCommand,
  isEditorDocumentRevisionPayload,
  isEditorInitializePayload,
  isEditorInputEnabledPayload,
  isEditorPreferencesUpdatePayload,
  isEditorRuntimeUpdatePayload,
  parseEditorBridgeMessage,
} from "./bridge/protocol";
import { ANDROID_SELECTION_BOTTOM_OFFSET, EDITOR_MESSAGE_DEDUPLICATION_LIMIT } from "./consts";
import { LonaEditor } from "./index";
import {
  parseEditorResourceReference,
  resolveEditorResourceReference,
} from "./resources/resource_reference";
import { resolveEditorResourceUrl } from "./resources/resource_url";
import "./styles.css";

const root = document.getElementById("editor");

if (!root) {
  throw new Error("编辑器根节点不存在");
}

// 让底部 safe area 进入文档流，避免 WebView/CodeMirror 的溢出内容覆盖它。
const bottomSafeArea = document.createElement("div");
bottomSafeArea.id = "editor-bottom-safe-area";
bottomSafeArea.setAttribute("aria-hidden", "true");
document.body.append(bottomSafeArea);

/** 空白 body 区域点击时，将焦点交给距离触点最近的文档位置。 */
document.body.addEventListener("click", (event) => {
  if (
    (event.target !== document.body && event.target !== getRoot()) ||
    !session
  ) {
    return;
  }
  session.editor.focus({ x: event.clientX, y: event.clientY });
});

function getRoot(): HTMLElement {
  if (!root) {
    throw new Error("编辑器根节点不存在");
  }
  return root;
}

type SurfaceSession = {
  identity: EditorBridgeBootstrap;
  editor: LonaEditor;
  documentRevision: number;
  localSequence: number;
  suppressDocumentChange: boolean;
  pendingDocumentChange: boolean;
  stateRevision: number;
  runtime: EditorRuntimeUpdatePayload;
  preferences: EditorPreferences;
  documentReadOnly: boolean;
  inputEnabled: boolean;
  resources: EditorResourceContext;
  documentWorkspacePath: string | null;
};

let bootstrap = getBootstrap();
let session: SurfaceSession | null = null;
let nextMessageSequence = 1;
const receivedMessageIds = new Set<string>();

function getBootstrap(): EditorBridgeBootstrap | null {
  const preloadedBootstrap = window.__LONANOTE_EDITOR_BRIDGE_BOOTSTRAP__;
  if (isEditorBridgeBootstrap(preloadedBootstrap)) return preloadedBootstrap;
  try {
    const raw = window.ReactNativeWebView?.injectedObjectJson?.();
    const parsed = typeof raw === "string" ? JSON.parse(raw) : null;
    const value = parsed?.lonanoteEditorBridge;
    return isEditorBridgeBootstrap(value) ? value : null;
  } catch {
    return null;
  }
}

function isStandaloneDevelopmentMode(): boolean {
  return (
    import.meta.env.DEV &&
    window.parent === window &&
    new URLSearchParams(window.location.search).get("standalone") === "1"
  );
}

function createStandaloneInitializeRequest(): EditorBridgeRequest {
  const darkMode = window.matchMedia?.("(prefers-color-scheme: dark)").matches ?? false;
  const colorScheme = darkMode ? "dark" : "light";
  const colors = darkMode
    ? {
        background: "#111113",
        foreground: "#f4f4f5",
        primary: "#f472b6",
        muted: "#27272a",
        mutedForeground: "#a1a1aa",
        border: "#3f3f46",
      }
    : {
        background: "#ffffff",
        foreground: "#18181b",
        primary: "#db2777",
        muted: "#f4f4f5",
        mutedForeground: "#71717a",
        border: "#e4e4e7",
      };

  return {
    protocolVersion: EDITOR_BRIDGE_PROTOCOL_VERSION,
    messageId: "standalone-initialize-message",
    channelId: "standalone-channel",
    generation: 1,
    editorId: "standalone-editor",
    documentId: "standalone-document",
    kind: "request",
    requestId: "standalone-initialize-request",
    method: "host.initialize",
    payload: {
      runtime: {
        revision: 1,
        platform: "web",
        colorScheme,
        colors,
        safeAreaInsets: { top: 0, right: 0, bottom: 0, left: 0 },
        contentInsets: { top: 0, right: 0, bottom: 0, left: 0 },
        locale: navigator.language || "zh-CN",
        pixelRatio: window.devicePixelRatio || 1,
        fontScale: 1,
        reducedMotion: window.matchMedia?.("(prefers-reduced-motion: reduce)").matches ?? false,
      },
      document: {
        text: "# Editor standalone 测试\n\n当前页面由开发模式自动初始化，可以直接编辑。",
        revision: 1,
        displayName: "standalone.md",
        fileName: "standalone.md",
        workspacePath: null,
        readOnly: false,
        inputEnabled: true,
      },
      preferences: {
        lineNumbers: true,
        lineWrapping: true,
        sourceMode: false,
      },
      resources: {
        available: false,
        reason: "untitled",
      },
    } satisfies EditorInitializePayload,
  };
}

function createMessageId(): string {
  const sequence = nextMessageSequence;
  nextMessageSequence += 1;
  return `surface-${sequence}`;
}

function sendMessage(message: EditorBridgeMessage): void {
  const serializedMessage = JSON.stringify(message);
  if (window.ReactNativeWebView?.postMessage) {
    window.ReactNativeWebView.postMessage(serializedMessage);
    return;
  }
  if (window.parent !== window) {
    window.parent.postMessage(serializedMessage, "*");
  }
}

function emitEvent(event: string, payload: unknown): void {
  const identity = session?.identity ?? bootstrap;
  if (!identity) return;
  const message: EditorBridgeEvent = {
    protocolVersion: EDITOR_BRIDGE_PROTOCOL_VERSION,
    messageId: createMessageId(),
    channelId: identity.channelId,
    generation: identity.generation,
    editorId: identity.editorId,
    documentId: identity.documentId,
    kind: "event",
    event,
    payload,
  };
  sendMessage(message);
}

function respond(request: EditorBridgeRequest, result?: unknown, error?: EditorBridgeError): void {
  const message: EditorBridgeMessage = {
    protocolVersion: EDITOR_BRIDGE_PROTOCOL_VERSION,
    messageId: createMessageId(),
    channelId: request.channelId,
    generation: request.generation,
    editorId: request.editorId,
    documentId: request.documentId,
    kind: "response",
    requestId: request.requestId,
    ...(error ? { error } : { result }),
  };
  sendMessage(message);
}

function getStateSnapshot(currentSession: SurfaceSession): EditorStateSnapshot {
  const state = currentSession.editor.editor.state;
  const selection = state.selection.main;
  const status = currentSession.editor.getStatusInfo();
  currentSession.stateRevision += 1;
  return {
    revision: currentSession.stateRevision,
    focused: currentSession.editor.editor.hasFocus,
    composing: currentSession.editor.editor.composing,
    canUndo: currentSession.editor.canUndo(),
    canRedo: currentSession.editor.canRedo(),
    selectionEmpty: selection.empty,
    activeMarks: [],
    block: { type: "paragraph" },
    list: "none",
    row: status.rowIndex,
    column: status.colIndex + 1,
    characterCount: status.charCount,
  };
}

function emitStateSnapshot(currentSession: SurfaceSession): void {
  emitEvent("editor.stateChanged", getStateSnapshot(currentSession));
}

function scheduleDocumentChanged(currentSession: SurfaceSession): void {
  if (currentSession.suppressDocumentChange || currentSession.pendingDocumentChange) return;
  currentSession.pendingDocumentChange = true;
  queueMicrotask(() => {
    flushPendingDocumentChange(currentSession);
  });
}

function flushPendingDocumentChange(currentSession: SurfaceSession): void {
  if (!currentSession.pendingDocumentChange) return;
  currentSession.pendingDocumentChange = false;
  if (session !== currentSession || currentSession.suppressDocumentChange) return;

  const text = currentSession.editor.getValue();
  if (text === null) return;
  const baseRevision = currentSession.documentRevision;
  currentSession.documentRevision += 1;
  currentSession.localSequence += 1;
  emitEvent("document.changed", {
    baseRevision,
    localSequence: currentSession.localSequence,
    text,
  });
}

function applyRuntimeStyles(runtime: EditorRuntimeUpdatePayload): void {
  const editorRoot = getRoot();
  editorRoot.style.setProperty("--lonanote-editor-background", runtime.colors.background);
  editorRoot.style.setProperty("--lonanote-editor-foreground", runtime.colors.foreground);
  editorRoot.style.setProperty("--lonanote-editor-primary", runtime.colors.primary);
  editorRoot.style.setProperty("--lonanote-editor-content-top", `${runtime.contentInsets.top}px`);
  editorRoot.style.setProperty(
    "--lonanote-editor-content-right",
    `${runtime.contentInsets.right}px`,
  );
  editorRoot.style.setProperty(
    "--lonanote-editor-content-bottom",
    `${runtime.contentInsets.bottom}px`,
  );
  editorRoot.style.setProperty("--lonanote-editor-content-left", `${runtime.contentInsets.left}px`);
  bottomSafeArea.style.height = `${runtime.contentInsets.bottom}px`;
  bottomSafeArea.style.minHeight = `${runtime.contentInsets.bottom}px`;
}

function applyPresentation(currentSession: SurfaceSession): void {
  currentSession.editor.updatePresentation({
    lineNumbers: currentSession.preferences.lineNumbers,
    lineWrapping: currentSession.preferences.lineWrapping,
    sourceMode: currentSession.preferences.sourceMode,
    theme: currentSession.runtime.colorScheme,
  });
}

function revealSelectionInViewport(currentSession: SurfaceSession): void {
  if (!currentSession.editor.editor.hasFocus) return;
  if (currentSession.runtime.platform !== "ios") {
    currentSession.editor.scrollSelectionIntoView();
    return;
  }
  // 合并同一帧的输入与 inset 更新，等 CodeMirror 完成布局后再测量光标。
  currentSession.editor.editor.requestMeasure({
    key: currentSession,
    read: () => currentSession.editor.getSelectionScrollTop(currentSession.runtime.contentInsets),
    write: (scrollTop) => {
      if (
        session === currentSession &&
        currentSession.editor.editor.hasFocus &&
        scrollTop !== null
      ) {
        emitEvent("viewport.scrollRequested", { y: scrollTop });
      }
    },
  });
}

function initializeEditor(request: EditorBridgeRequest, payload: EditorInitializePayload): void {
  if (session) {
    const identity = session.identity;
    if (
      identity.channelId === request.channelId &&
      identity.generation === request.generation &&
      identity.editorId === request.editorId &&
      identity.documentId === request.documentId
    ) {
      respond(request, { initialized: true });
      emitEvent("editor.ready", {
        capabilities: {
          protocolVersion: EDITOR_BRIDGE_PROTOCOL_VERSION,
          commands: [],
        },
        state: getStateSnapshot(session),
      });
      return;
    }
    respond(request, undefined, {
      code: "editor_already_initialized",
      message: "Editor 已初始化",
      retryable: false,
    });
    return;
  }

  const identity: EditorBridgeBootstrap = {
    channelId: request.channelId,
    generation: request.generation,
    editorId: request.editorId,
    documentId: request.documentId,
  };
  bootstrap ??= identity;
  const editor = new LonaEditor();
  const currentSession: SurfaceSession = {
    identity,
    editor,
    documentRevision: payload.document.revision,
    localSequence: 0,
    suppressDocumentChange: false,
    pendingDocumentChange: false,
    stateRevision: 0,
    runtime: payload.runtime,
    preferences: payload.preferences,
    documentReadOnly: payload.document.readOnly,
    inputEnabled: payload.document.inputEnabled,
    resources: payload.resources,
    documentWorkspacePath: payload.document.workspacePath,
  };
  session = currentSession;

  editor.create({
    root: getRoot(),
    defaultValue: payload.document.text,
    filePath: payload.document.workspacePath ?? payload.document.fileName ?? undefined,
    readOnly: payload.document.readOnly || !payload.document.inputEnabled,
    extensions: [
      // 由宿主统一描述 header、键盘、工具栏和底部面板遮挡的区域。
      // CodeMirror 会在点击、选区变化和输入时将光标保持在这些区域之外。
      EditorView.scrollMargins.of(() => {
        const insets = currentSession.runtime.contentInsets;
        if (currentSession.runtime.platform !== "ios") {
          return {
            ...insets,
            bottom: Math.max(insets.bottom + ANDROID_SELECTION_BOTTOM_OFFSET, 0),
          };
        }
        // iOS visualViewport 已扣除键盘，只补充剩余的 Toolbar / 面板遮挡。
        const overlap = Math.max(
          window.innerHeight - (window.visualViewport?.height ?? window.innerHeight),
          0,
        );
        return { ...insets, bottom: Math.max(insets.bottom - overlap, 0) };
      }),
      EditorView.scrollHandler.of((view, range, options) => {
        if (
          currentSession.runtime.platform !== "ios" ||
          !view.hasFocus ||
          options.y !== "nearest" ||
          range.head !== view.state.selection.main.head
        )
          return false;
        // 输入事务也走宿主 offset 通道，避免与原生校正同时滚动页面。
        revealSelectionInViewport(currentSession);
        return true;
      }),
    ],
    extensionsConfig: {
      enableLineWrapping: payload.preferences.lineWrapping,
      enableLineNumbers: payload.preferences.lineNumbers,
    },
    theme: payload.runtime.colorScheme,
    markdownConfig: {
      formattingDisplayMode: payload.preferences.sourceMode ? "show" : "auto",
      defaultSlashMenu: { show: false },
      featuresConfigs: {
        [PurrMDFeatures.Image]: {
          proxyURL: (rawReference: string) =>
            resolveEditorResourceUrl(rawReference, currentSession.resources) ?? rawReference,
        },
        [PurrMDFeatures.Link]: {
          clickToOpenInPreview: "click",
          clickToOpenInSource: "click",
          onLinkClickPreview: (rawReference: string, event: MouseEvent) =>
            emitResourceActivation(currentSession, rawReference, event),
          onLinkClickSource: (rawReference: string, event: MouseEvent) =>
            emitResourceActivation(currentSession, rawReference, event),
        },
      },
    },
  });
  applyRuntimeStyles(payload.runtime);
  editor.addListener("onUpdate", (_editor, update) => {
    if (update.docChanged) {
      scheduleDocumentChanged(currentSession);
    }
    if (update.docChanged || update.selectionSet || update.focusChanged) {
      emitStateSnapshot(currentSession);
    }
    if (currentSession.runtime.platform === "ios" && (update.docChanged || update.selectionSet)) {
      revealSelectionInViewport(currentSession);
    }
  });
  editor.addListener("onSave", () => {
    emitEvent("editor.saveRequested", {});
  });
  editor.addListener("onFocus", (_editor, focused) => {
    emitEvent("editor.focusChanged", { focused });
  });

  respond(request, { initialized: true });
  emitEvent("editor.ready", {
    capabilities: {
      protocolVersion: EDITOR_BRIDGE_PROTOCOL_VERSION,
      commands: [],
    },
    state: getStateSnapshot(currentSession),
  });
}

function emitResourceActivation(
  currentSession: SurfaceSession,
  rawReference: string,
  event: MouseEvent,
): void {
  event.preventDefault();
  const reference = parseEditorResourceReference(rawReference);
  const resolved = currentSession.documentWorkspacePath
    ? resolveEditorResourceReference(reference, currentSession.documentWorkspacePath)
    : reference;
  if (
    resolved.kind === "unsupported" ||
    resolved.kind === "documentRelative" ||
    resolved.kind === "workspaceRootRelative"
  ) {
    return;
  }
  if (resolved.kind === "anchor") {
    currentSession.editor.scrollToAnchor(resolved.fragment);
    return;
  }

  const payload: EditorResourceActivatedPayload = {
    rawReference,
    resolved:
      resolved.kind === "workspaceFile"
        ? {
            kind: "workspaceFile",
            path: resolved.path,
            ...(resolved.fragment === null ? {} : { fragment: resolved.fragment }),
          }
        : resolved,
    modifiers: { newView: event.ctrlKey || event.metaKey },
  };
  emitEvent("resource.activated", payload);
}

function applyRuntimeUpdate(request: EditorBridgeRequest): void {
  if (!session || !isEditorRuntimeUpdatePayload(request.payload)) {
    respond(request, undefined, {
      code: "invalid_runtime_update",
      message: "runtime.update payload 无效",
      retryable: false,
    });
    return;
  }
  if (request.payload.revision <= session.runtime.revision) {
    respond(request, { applied: false });
    return;
  }
  const previousInsets = session.runtime.contentInsets;
  session.runtime = request.payload;
  applyRuntimeStyles(session.runtime);
  applyPresentation(session);
  const currentInsets = session.runtime.contentInsets;
  if (
    session.editor.editor.hasFocus &&
    (previousInsets.top !== currentInsets.top ||
      previousInsets.right !== currentInsets.right ||
      previousInsets.bottom !== currentInsets.bottom ||
      previousInsets.left !== currentInsets.left)
  ) {
    revealSelectionInViewport(session);
  }
  respond(request, { applied: true });
}

function applyPreferencesUpdate(request: EditorBridgeRequest): void {
  if (!session || !isEditorPreferencesUpdatePayload(request.payload)) {
    respond(request, undefined, {
      code: "invalid_preferences_update",
      message: "preferences.update payload 无效",
      retryable: false,
    });
    return;
  }
  session.preferences = request.payload;
  applyPresentation(session);
  respond(request, { applied: true });
}

function applyDocumentRevision(request: EditorBridgeRequest): void {
  if (!session || !isEditorDocumentRevisionPayload(request.payload)) {
    respond(request, undefined, {
      code: "invalid_document_revision",
      message: "document.applyRevision payload 无效",
      retryable: false,
    });
    return;
  }

  const payload: EditorDocumentRevisionPayload = request.payload;
  if (payload.revision <= session.documentRevision) {
    respond(request, { applied: false });
    return;
  }

  session.suppressDocumentChange = true;
  try {
    session.editor.setValue(payload.text, { useHistory: false, scrollToTop: false });
    session.documentRevision = payload.revision;
  } finally {
    session.suppressDocumentChange = false;
  }
  emitStateSnapshot(session);
  respond(request, { applied: true });
}

function applyInputEnabled(request: EditorBridgeRequest): void {
  if (!session || !isEditorInputEnabledPayload(request.payload)) {
    respond(request, undefined, {
      code: "invalid_input_enabled",
      message: "editor.setInputEnabled payload 无效",
      retryable: false,
    });
    return;
  }

  session.inputEnabled = request.payload.enabled;
  session.editor.setReadonly(session.documentReadOnly || !session.inputEnabled);
  emitStateSnapshot(session);
  respond(request, { applied: true });
}

function revealSelection(request: EditorBridgeRequest): void {
  if (!session) {
    respond(request, undefined, {
      code: "editor_not_initialized",
      message: "Editor 尚未初始化",
      retryable: true,
    });
    return;
  }
  revealSelectionInViewport(session);
  respond(request, { applied: true });
}

function executeCommand(request: EditorBridgeRequest): void {
  if (!session || !isEditorCommand(request.payload)) {
    respond(request, undefined, {
      code: "invalid_command",
      message: "editor command 无效",
      retryable: false,
    });
    return;
  }
  const command: EditorCommand = request.payload;
  if (
    command.type !== "editor.focus" &&
    command.type !== "editor.blur" &&
    command.type !== "navigation.scrollToAnchor" &&
    (session.documentReadOnly || !session.inputEnabled)
  ) {
    const snapshot = getStateSnapshot(session);
    respond(request, { applied: false, stateRevision: snapshot.revision });
    return;
  }
  if (command.type === "history.undo") session.editor.undo();
  if (command.type === "history.redo") session.editor.redo();
  if (command.type === "editor.focus") session.editor.focus();
  if (command.type === "editor.blur") session.editor.blur();
  if (command.type === "navigation.scrollToAnchor") session.editor.scrollToAnchor(command.fragment);
  if (command.type === "mark.toggle") {
    const commandByMark = {
      bold: commands.toggleStrongCommand,
      italic: commands.toggleItalicCommand,
      strikethrough: commands.toggleStrikethroughCommand,
      highlight: commands.toggleHighlightCommand,
      inlineCode: commands.toggleInlineCodeCommand,
    };
    runStateCommand(session.editor, commandByMark[command.mark]);
  }
  if (command.type === "block.set") {
    if (command.block === "blockquote")
      runStateCommand(session.editor, commands.toggleBlockquoteCommand);
    else
      runStateCommand(
        session.editor,
        commands.setHeadingCommand(command.block === "heading" ? command.level! : 0),
      );
  }
  if (command.type === "list.toggle") {
    const commandByList = {
      unordered: commands.toggleUnorderedListCommand,
      ordered: commands.toggleOrderedListCommand,
      task: commands.toggleTaskListCommand,
    };
    runStateCommand(session.editor, commandByList[command.list]);
  }
  if (command.type === "insert.horizontalRule")
    runStateCommand(session.editor, commands.insertHorizontalRule);
  if (command.type === "insert.link") runStateCommand(session.editor, commands.insertLink);
  if (command.type === "insert.image") runStateCommand(session.editor, commands.insertImage);
  if (command.type === "insert.codeBlock")
    runStateCommand(session.editor, commands.insertCodeBlock);
  if (command.type === "insert.table") runStateCommand(session.editor, commands.insertTable);
  const snapshot = getStateSnapshot(session);
  emitEvent("editor.stateChanged", snapshot);
  respond(request, { applied: true, stateRevision: snapshot.revision });
}

function runStateCommand(
  editor: LonaEditor,
  command: Parameters<typeof commands.toggleStrongCommand>[0] extends never
    ? never
    : typeof commands.toggleStrongCommand,
): void {
  command({
    state: editor.editor.state,
    dispatch: (transaction) => editor.editor.dispatch(transaction),
  });
}

function disposeEditor(request: EditorBridgeRequest): void {
  if (session) {
    session.editor.destroy();
    session = null;
  }
  respond(request, { disposed: true });
}

function handleRequest(request: EditorBridgeRequest): void {
  if (request.method === "host.initialize") {
    if (!isEditorInitializePayload(request.payload)) {
      respond(request, undefined, {
        code: "invalid_initialize_payload",
        message: "host.initialize payload 无效",
        retryable: false,
      });
      return;
    }
    initializeEditor(request, request.payload);
    return;
  }
  if (request.method === "document.applyRevision") {
    applyDocumentRevision(request);
    return;
  }
  if (request.method === "editor.setInputEnabled") {
    applyInputEnabled(request);
    return;
  }
  if (request.method === "editor.revealSelection") {
    revealSelection(request);
    return;
  }
  if (request.method === "runtime.update") {
    applyRuntimeUpdate(request);
    return;
  }
  if (request.method === "preferences.update") {
    applyPreferencesUpdate(request);
    return;
  }
  if (request.method === "editor.executeCommand") {
    executeCommand(request);
    return;
  }
  if (request.method === "document.capture") {
    if (session) {
      flushPendingDocumentChange(session);
    }
    const text = session?.editor.getValue();
    respond(request, { text: text ?? "", revision: session?.documentRevision ?? 0 });
    return;
  }
  if (request.method === "editor.dispose") {
    disposeEditor(request);
    return;
  }

  respond(request, undefined, {
    code: "unsupported_method",
    message: `不支持的 bridge method: ${request.method}`,
    retryable: false,
  });
}

function rememberMessage(messageId: string): boolean {
  if (receivedMessageIds.has(messageId)) return false;
  receivedMessageIds.add(messageId);
  if (receivedMessageIds.size > EDITOR_MESSAGE_DEDUPLICATION_LIMIT) {
    const firstMessageId = receivedMessageIds.values().next().value;
    if (firstMessageId) receivedMessageIds.delete(firstMessageId);
  }
  return true;
}

function receiveMessage(rawMessage: unknown): void {
  if (typeof rawMessage !== "string") return;
  const parsed = parseEditorBridgeMessage(rawMessage);
  if (!parsed.ok || !rememberMessage(parsed.message.messageId)) return;

  const message = parsed.message;
  const identity = session?.identity ?? bootstrap;
  if (
    identity &&
    (message.channelId !== identity.channelId ||
      message.generation !== identity.generation ||
      message.editorId !== identity.editorId ||
      message.documentId !== identity.documentId)
  ) {
    return;
  }
  if (message.kind === "request") {
    handleRequest(message);
  }
}

window.addEventListener("message", (event) => receiveMessage(event.data));
document.addEventListener("message", (event) => receiveMessage((event as MessageEvent).data));

if (bootstrap) {
  emitEvent("bridge.ready", {
    protocolVersion: EDITOR_BRIDGE_PROTOCOL_VERSION,
    capabilities: {
      protocolVersion: EDITOR_BRIDGE_PROTOCOL_VERSION,
      commands: [],
    },
  });
} else if (isStandaloneDevelopmentMode()) {
  receiveMessage(JSON.stringify(createStandaloneInitializeRequest()));
}
