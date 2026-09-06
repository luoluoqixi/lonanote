export const EDITOR_BRIDGE_PROTOCOL_VERSION = 1;
export const EDITOR_BRIDGE_MAX_SERIALIZED_MESSAGE_LENGTH = 1024 * 1024;

export type EditorBridgeBase = {
  protocolVersion: typeof EDITOR_BRIDGE_PROTOCOL_VERSION;
  messageId: string;
  channelId: string;
  generation: number;
  editorId: string;
  documentId: string;
};

export type EditorBridgeError = {
  code: string;
  message: string;
  retryable: boolean;
  details?: unknown;
};

export type EditorBridgeRequest = EditorBridgeBase & {
  kind: "request";
  requestId: string;
  method: string;
  payload: unknown;
};

export type EditorBridgeResponse = EditorBridgeBase & {
  kind: "response";
  requestId: string;
  result?: unknown;
  error?: EditorBridgeError;
};

export type EditorBridgeEvent = EditorBridgeBase & {
  kind: "event";
  event: string;
  payload: unknown;
};

export type EditorBridgeMessage = EditorBridgeRequest | EditorBridgeResponse | EditorBridgeEvent;

export type EditorBridgeBootstrap = {
  channelId: string;
  generation: number;
  editorId: string;
  documentId: string;
};

export type EditorPlatform = "ios" | "android" | "web" | "macos" | "windows" | "linux";

export type EditorInsets = {
  top: number;
  right: number;
  bottom: number;
  left: number;
};

export type EditorSemanticColors = {
  background: string;
  foreground: string;
  primary: string;
  muted: string;
  mutedForeground: string;
  border: string;
};

export type EditorPreferences = {
  lineNumbers: boolean;
  lineWrapping: boolean;
  sourceMode: boolean;
};

export type EditorResourceContext =
  | {
      available: true;
      scopeId: string;
      endpoint: string;
      generation: number;
      documentPath: string;
    }
  | {
      available: false;
      reason: "untitled" | "unsupportedDocument" | "providerUnavailable";
    };

export type EditorInitializePayload = {
  runtime: {
    revision: number;
    platform: EditorPlatform;
    colorScheme: "light" | "dark";
    colors: EditorSemanticColors;
    safeAreaInsets: EditorInsets;
    contentInsets: EditorInsets;
    locale: string;
    pixelRatio: number;
    fontScale: number;
    reducedMotion: boolean;
  };
  document: {
    text: string;
    revision: number;
    displayName: string;
    fileName: string | null;
    workspacePath: string | null;
    readOnly: boolean;
    inputEnabled: boolean;
  };
  preferences: EditorPreferences;
  resources: EditorResourceContext;
};

export type EditorRuntimeUpdatePayload = EditorInitializePayload["runtime"];
export type EditorPreferencesUpdatePayload = EditorPreferences;

export type EditorCommand =
  | { type: "history.undo" }
  | { type: "history.redo" }
  | { type: "editor.focus" }
  | { type: "navigation.scrollToAnchor"; fragment: string }
  | { type: "mark.toggle"; mark: "bold" | "italic" | "strikethrough" | "highlight" | "inlineCode" }
  | {
      type: "block.set";
      block: "paragraph" | "blockquote" | "heading";
      level?: 1 | 2 | 3 | 4 | 5 | 6;
    }
  | { type: "list.toggle"; list: "unordered" | "ordered" | "task" }
  | { type: "insert.horizontalRule" }
  | { type: "insert.link" }
  | { type: "insert.image" }
  | { type: "insert.codeBlock" }
  | { type: "insert.table" };

export type EditorCommandResult = {
  applied: boolean;
  stateRevision: number;
};

export type EditorSurfaceCapabilities = {
  protocolVersion: number;
  commands: string[];
};

export type EditorStateSnapshot = {
  revision: number;
  focused: boolean;
  composing: boolean;
  canUndo: boolean;
  canRedo: boolean;
  selectionEmpty: boolean;
  activeMarks: string[];
  block: { type: string; level?: number };
  list: "none" | "unordered" | "ordered" | "task";
  row: number;
  column: number;
  characterCount: number;
};

export type EditorDocumentChangedPayload = {
  baseRevision: number;
  localSequence: number;
  text: string;
};

export type EditorDocumentRevisionPayload = {
  revision: number;
  text: string;
};

export type EditorDocumentCapturePayload = {
  revision: number;
  text: string;
};

export type EditorFocusChangedPayload = {
  focused: boolean;
};

export type EditorResourceActivatedPayload = {
  rawReference: string;
  resolved:
    | { kind: "workspaceFile"; path: string; fragment?: string }
    | { kind: "external"; url: string }
    | { kind: "anchor"; fragment: string };
  modifiers: {
    newView: boolean;
  };
};

export type EditorInputEnabledPayload = {
  enabled: boolean;
};

export type EditorBridgeApplyResult = {
  applied: boolean;
};

export type EditorBridgeValidationResult =
  | { ok: true; message: EditorBridgeMessage }
  | { ok: false; reason: string };

type UnknownRecord = Record<string, unknown>;

function isRecord(value: unknown): value is UnknownRecord {
  return typeof value === "object" && value !== null && !Array.isArray(value);
}

function isNonEmptyString(value: unknown): value is string {
  return typeof value === "string" && value.length > 0;
}

function hasOwn(value: UnknownRecord, key: string): boolean {
  return Object.prototype.hasOwnProperty.call(value, key);
}

function isValidBase(value: UnknownRecord): boolean {
  return (
    value.protocolVersion === EDITOR_BRIDGE_PROTOCOL_VERSION &&
    isNonEmptyString(value.messageId) &&
    isNonEmptyString(value.channelId) &&
    Number.isSafeInteger(value.generation) &&
    (value.generation as number) >= 0 &&
    isNonEmptyString(value.editorId) &&
    isNonEmptyString(value.documentId)
  );
}

function isValidError(value: unknown): value is EditorBridgeError {
  return (
    isRecord(value) &&
    isNonEmptyString(value.code) &&
    isNonEmptyString(value.message) &&
    typeof value.retryable === "boolean"
  );
}

function validateBridgeValue(value: unknown): EditorBridgeValidationResult {
  if (!isRecord(value)) {
    return { ok: false, reason: "消息必须是对象" };
  }
  if (!isValidBase(value)) {
    return { ok: false, reason: "消息基础字段无效或协议版本不匹配" };
  }

  if (value.kind === "request") {
    if (
      !isNonEmptyString(value.requestId) ||
      !isNonEmptyString(value.method) ||
      !hasOwn(value, "payload")
    ) {
      return { ok: false, reason: "request 缺少 requestId、method 或 payload" };
    }
    return { ok: true, message: value as EditorBridgeRequest };
  }

  if (value.kind === "response") {
    if (!isNonEmptyString(value.requestId)) {
      return { ok: false, reason: "response 缺少 requestId" };
    }
    const hasResult = hasOwn(value, "result");
    const hasError = hasOwn(value, "error");
    if (hasResult === hasError || (hasError && !isValidError(value.error))) {
      return { ok: false, reason: "response 必须包含 result 或有效的 error" };
    }
    return { ok: true, message: value as EditorBridgeResponse };
  }

  if (value.kind === "event") {
    if (!isNonEmptyString(value.event) || !hasOwn(value, "payload")) {
      return { ok: false, reason: "event 缺少 event 名称" };
    }
    return { ok: true, message: value as EditorBridgeEvent };
  }

  return { ok: false, reason: "消息 kind 无效" };
}

export function parseEditorBridgeMessage(serializedMessage: string): EditorBridgeValidationResult {
  if (serializedMessage.length > EDITOR_BRIDGE_MAX_SERIALIZED_MESSAGE_LENGTH) {
    return { ok: false, reason: "消息超过大小限制" };
  }

  try {
    return validateBridgeValue(JSON.parse(serializedMessage));
  } catch {
    return { ok: false, reason: "消息不是有效 JSON" };
  }
}

export function validateEditorBridgeMessage(value: unknown): EditorBridgeValidationResult {
  return validateBridgeValue(value);
}

export function isEditorBridgeBootstrap(value: unknown): value is EditorBridgeBootstrap {
  return (
    isRecord(value) &&
    isNonEmptyString(value.channelId) &&
    Number.isSafeInteger(value.generation) &&
    (value.generation as number) >= 0 &&
    isNonEmptyString(value.editorId) &&
    isNonEmptyString(value.documentId)
  );
}

export function isEditorInitializePayload(value: unknown): value is EditorInitializePayload {
  if (!isRecord(value) || !isRecord(value.runtime) || !isRecord(value.document)) {
    return false;
  }

  const { runtime, document } = value;
  return (
    Number.isSafeInteger(runtime.revision) &&
    isNonEmptyString(runtime.platform) &&
    (runtime.colorScheme === "light" || runtime.colorScheme === "dark") &&
    isRecord(runtime.colors) &&
    isRecord(runtime.safeAreaInsets) &&
    isRecord(runtime.contentInsets) &&
    isNonEmptyString(runtime.locale) &&
    typeof runtime.pixelRatio === "number" &&
    typeof runtime.fontScale === "number" &&
    typeof runtime.reducedMotion === "boolean" &&
    typeof document.text === "string" &&
    Number.isSafeInteger(document.revision) &&
    isNonEmptyString(document.displayName) &&
    (document.fileName === null || typeof document.fileName === "string") &&
    (document.workspacePath === null || typeof document.workspacePath === "string") &&
    typeof document.readOnly === "boolean" &&
    typeof document.inputEnabled === "boolean" &&
    isRecord(value.preferences) &&
    typeof value.preferences.lineNumbers === "boolean" &&
    typeof value.preferences.lineWrapping === "boolean" &&
    typeof value.preferences.sourceMode === "boolean" &&
    isRecord(value.resources) &&
    typeof value.resources.available === "boolean"
  );
}

export function isEditorRuntimeUpdatePayload(value: unknown): value is EditorRuntimeUpdatePayload {
  return (
    isRecord(value) &&
    Number.isSafeInteger(value.revision) &&
    isNonEmptyString(value.platform) &&
    (value.colorScheme === "light" || value.colorScheme === "dark") &&
    isRecord(value.colors) &&
    isRecord(value.safeAreaInsets) &&
    isRecord(value.contentInsets) &&
    isNonEmptyString(value.locale) &&
    typeof value.pixelRatio === "number" &&
    typeof value.fontScale === "number" &&
    typeof value.reducedMotion === "boolean"
  );
}

export function isEditorPreferencesUpdatePayload(
  value: unknown,
): value is EditorPreferencesUpdatePayload {
  return (
    isRecord(value) &&
    typeof value.lineNumbers === "boolean" &&
    typeof value.lineWrapping === "boolean" &&
    typeof value.sourceMode === "boolean"
  );
}

export function isEditorStateSnapshot(value: unknown): value is EditorStateSnapshot {
  return (
    isRecord(value) &&
    Number.isSafeInteger(value.revision) &&
    typeof value.focused === "boolean" &&
    typeof value.composing === "boolean" &&
    typeof value.canUndo === "boolean" &&
    typeof value.canRedo === "boolean" &&
    typeof value.selectionEmpty === "boolean" &&
    Array.isArray(value.activeMarks) &&
    isRecord(value.block) &&
    isNonEmptyString(value.block.type) &&
    (value.list === "none" ||
      value.list === "unordered" ||
      value.list === "ordered" ||
      value.list === "task") &&
    Number.isSafeInteger(value.row) &&
    Number.isSafeInteger(value.column) &&
    Number.isSafeInteger(value.characterCount)
  );
}

export function isEditorCommand(value: unknown): value is EditorCommand {
  if (!isRecord(value) || typeof value.type !== "string") return false;
  if (
    value.type === "history.undo" ||
    value.type === "history.redo" ||
    value.type === "editor.focus"
  )
    return true;
  if (value.type === "navigation.scrollToAnchor") return isNonEmptyString(value.fragment);
  if (value.type === "mark.toggle")
    return (
      value.mark === "bold" ||
      value.mark === "italic" ||
      value.mark === "strikethrough" ||
      value.mark === "highlight" ||
      value.mark === "inlineCode"
    );
  if (value.type === "block.set")
    return (
      value.block === "paragraph" ||
      value.block === "blockquote" ||
      (value.block === "heading" &&
        (value.level === 1 ||
          value.level === 2 ||
          value.level === 3 ||
          value.level === 4 ||
          value.level === 5 ||
          value.level === 6))
    );
  if (value.type === "list.toggle")
    return value.list === "unordered" || value.list === "ordered" || value.list === "task";
  return (
    value.type === "insert.horizontalRule" ||
    value.type === "insert.link" ||
    value.type === "insert.image" ||
    value.type === "insert.codeBlock" ||
    value.type === "insert.table"
  );
}

export function isEditorCommandResult(value: unknown): value is EditorCommandResult {
  return (
    isRecord(value) &&
    typeof value.applied === "boolean" &&
    Number.isSafeInteger(value.stateRevision)
  );
}

export function isEditorDocumentChangedPayload(
  value: unknown,
): value is EditorDocumentChangedPayload {
  return (
    isRecord(value) &&
    Number.isSafeInteger(value.baseRevision) &&
    Number.isSafeInteger(value.localSequence) &&
    typeof value.text === "string"
  );
}

export function isEditorDocumentRevisionPayload(
  value: unknown,
): value is EditorDocumentRevisionPayload {
  return isRecord(value) && Number.isSafeInteger(value.revision) && typeof value.text === "string";
}

export function isEditorDocumentCapturePayload(
  value: unknown,
): value is EditorDocumentCapturePayload {
  return isEditorDocumentRevisionPayload(value);
}

export function isEditorInputEnabledPayload(value: unknown): value is EditorInputEnabledPayload {
  return isRecord(value) && typeof value.enabled === "boolean";
}

export function isEditorFocusChangedPayload(value: unknown): value is EditorFocusChangedPayload {
  return isRecord(value) && typeof value.focused === "boolean";
}

export function isEditorResourceActivatedPayload(
  value: unknown,
): value is EditorResourceActivatedPayload {
  if (!isRecord(value) || !isNonEmptyString(value.rawReference) || !isRecord(value.resolved)) {
    return false;
  }
  if (!isRecord(value.modifiers) || typeof value.modifiers.newView !== "boolean") return false;

  if (value.resolved.kind === "workspaceFile") {
    return (
      isNonEmptyString(value.resolved.path) &&
      (value.resolved.fragment === undefined || typeof value.resolved.fragment === "string")
    );
  }
  if (value.resolved.kind === "external") return isNonEmptyString(value.resolved.url);
  return value.resolved.kind === "anchor" && typeof value.resolved.fragment === "string";
}

export function isEditorBridgeApplyResult(value: unknown): value is EditorBridgeApplyResult {
  return isRecord(value) && typeof value.applied === "boolean";
}
