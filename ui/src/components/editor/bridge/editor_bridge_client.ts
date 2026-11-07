import { type EditorAppMenuKey, isEditorAppMenuKey } from "@/assets/editor/src/bridge/app_menu_key";
import {
  EDITOR_BRIDGE_PROTOCOL_VERSION,
  type EditorBridgeApplyResult,
  type EditorBridgeBootstrap,
  type EditorBridgeEvent,
  type EditorBridgeMessage,
  type EditorBridgeRequest,
  type EditorBridgeResponse,
  type EditorCommand,
  type EditorCommandResult,
  type EditorConsolePayload,
  type EditorContextMenuPayload,
  type EditorDocumentCapturePayload,
  type EditorDocumentChangedPayload,
  type EditorInitializePayload,
  type EditorMenuSnapshot,
  type EditorPreferencesUpdatePayload,
  type EditorResourceActivatedPayload,
  type EditorRuntimeUpdatePayload,
  type EditorStateSnapshot,
  type EditorViewportScrollPayload,
  isEditorBridgeApplyResult,
  isEditorCommandResult,
  isEditorConsolePayload,
  isEditorContextMenuPayload,
  isEditorDocumentCapturePayload,
  isEditorDocumentChangedPayload,
  isEditorFocusChangedPayload,
  isEditorResourceActivatedPayload,
  isEditorStateSnapshot,
  isEditorTaskToggledPayload,
  isEditorViewportScrollPayload,
  parseEditorBridgeMessage,
} from "@/assets/editor/src/bridge/protocol";
import {
  applyTextChange,
  normalizeEditorText,
  textChange,
} from "@/assets/editor/src/bridge/text_change";

type EditorBridgeClientOptions = {
  identity: EditorBridgeBootstrap;
  send: (serializedMessage: string) => void;
  getInitializePayload: () => EditorInitializePayload;
  onDocumentChanged: (payload: EditorDocumentChangedPayload) => boolean | "pending";
  onEditorReady: () => void;
  onEditorStateChanged: (snapshot: EditorStateSnapshot) => void;
  onEditorFocusChanged: (focused: boolean) => void;
  onEditorInputRequested?: () => void;
  onViewportScrollRequested: (payload: EditorViewportScrollPayload) => void;
  onSaveRequested: () => void;
  onHistoryRequested?: (direction: "undo" | "redo") => void;
  onAppMenuKey?: (payload: EditorAppMenuKey) => void;
  onResourceActivated: (payload: EditorResourceActivatedPayload) => void;
  onContextMenu?: (payload: EditorContextMenuPayload) => void;
  onTaskToggled: (checked: boolean) => void;
  onConsole: (payload: EditorConsolePayload) => void;
  onFatal: (message: string) => void;
};

let nextMessageSequence = 1;
const CAPTURE_TIMEOUT_MS = 1_500;
const MESSAGE_DEDUPLICATION_LIMIT = 256;

type PendingRequest = {
  resolve: (result: unknown) => void;
  reject: (error: Error) => void;
  timeout: ReturnType<typeof setTimeout>;
};

function createMessageId(): string {
  const sequence = nextMessageSequence;
  nextMessageSequence += 1;
  return `host-${sequence}`;
}

export function createEditorBridgeBootstrap(
  editorId: string,
  documentId: string,
  generation = 1,
  resourceRevision = 0,
): EditorBridgeBootstrap {
  const randomId = globalThis.crypto?.randomUUID?.() ?? `${Date.now()}-${nextMessageSequence}`;
  return {
    channelId: `editor-${randomId}`,
    generation: generation + resourceRevision,
    editorId,
    documentId,
  };
}

export class EditorBridgeClient {
  readonly #options: EditorBridgeClientOptions;
  #initialized = false;
  #documentText = "";
  #unconfirmedDraft: string | null = null;
  #pendingDocumentSequences = new Map<number, number>();
  #leaseToken: string | undefined;
  #surfaceReady = false;
  #disposed = false;
  #originatedDocumentRevision: number | null = null;
  #pendingRequests = new Map<string, PendingRequest>();
  #receivedMessageIds = new Set<string>();
  #runtimeRevision = 1;
  #runtimeKey: string | null = null;
  #preferencesKey: string | null = null;

  constructor(options: EditorBridgeClientOptions) {
    this.#options = options;
  }

  handleSerializedMessage(serializedMessage: string): void {
    const parsed = parseEditorBridgeMessage(serializedMessage);
    if (!parsed.ok || !this.#matchesIdentity(parsed.message)) return;

    const message = parsed.message;
    if (!this.#rememberMessage(message.messageId)) return;
    if (message.kind === "response") {
      this.#handleResponse(message);
    } else if (message.kind === "event") {
      this.#handleEvent(message);
    }
  }

  initializeSurface(): void {
    if (this.#disposed || this.#surfaceReady) return;
    const payload = this.#options.getInitializePayload();
    if (!this.#initialized) {
      this.#initialized = true;
      this.#documentText = normalizeEditorText(payload.document.text);
      this.#runtimeRevision = payload.runtime.revision;
      this.#runtimeKey = this.#getRuntimeKey(payload.runtime);
      this.#preferencesKey = JSON.stringify(payload.preferences);
    }
    this.#sendRequest("host.initialize", payload);
  }

  dispose(): void {
    if (this.#disposed) return;
    this.#disposed = true;
    this.#surfaceReady = false;
    this.#rejectPendingRequests("Editor surface 已销毁");
    if (this.#initialized) {
      this.#sendRequest("editor.dispose", {});
    }
  }

  acknowledgeDocumentChange(sequence: number): void {
    const revision = this.#pendingDocumentSequences.get(sequence);
    for (const pending of this.#pendingDocumentSequences.keys())
      if (pending <= sequence) this.#pendingDocumentSequences.delete(pending);
    if (revision !== undefined) this.#originatedDocumentRevision = revision;
  }

  getCurrentDraft(): string {
    return this.#documentText;
  }

  getUnconfirmedDraft(): string | null {
    return this.#unconfirmedDraft;
  }

  retainUnconfirmedDraft(text: string): void {
    this.#unconfirmedDraft = text;
    if (this.#surfaceReady && !this.#disposed)
      this.#sendRequest("editor.setInputEnabled", { enabled: false });
  }

  syncDocumentRevision(revision: number, text: string, selection?: number): void {
    text = normalizeEditorText(text);
    if (!this.#surfaceReady || this.#disposed || this.#unconfirmedDraft !== null) return;
    if (this.#pendingDocumentSequences.size) return;
    if (this.#originatedDocumentRevision !== null && revision <= this.#originatedDocumentRevision)
      return;
    this.#originatedDocumentRevision = null;
    const change = textChange(this.#documentText, text);
    this.#documentText = text;
    this.#sendRequest("document.applyRevision", { revision, change, selection });
  }

  async applyDocumentRevision(revision: number, text: string): Promise<EditorBridgeApplyResult> {
    text = normalizeEditorText(text);
    if (this.#unconfirmedDraft !== null || this.#pendingDocumentSequences.size)
      throw new Error("存在未确认草稿，不能覆盖checkpoint");
    if (!this.#surfaceReady || this.#disposed) {
      throw new Error("Editor surface 当前不可应用文档 revision");
    }
    const result = await this.#sendRequestWithResponse(
      "document.applyRevision",
      { revision, text },
      CAPTURE_TIMEOUT_MS,
    );
    if (!isEditorBridgeApplyResult(result)) {
      throw new Error("document.applyRevision 返回了无效结果");
    }
    if (!result.applied) {
      const capture = await this.captureDocument();
      if (capture.composing || capture.revision !== revision || capture.text !== text)
        throw new Error("目标视图尚未确认checkpoint，不能移交输入");
    }
    this.#documentText = text;
    return result;
  }

  async setInputEnabled(
    enabled: boolean,
    leaseToken?: string,
    identityRevision?: number,
  ): Promise<EditorBridgeApplyResult> {
    if (enabled && (this.#unconfirmedDraft !== null || this.#pendingDocumentSequences.size))
      throw new Error("存在未确认草稿，不能重新启用输入");
    if (!this.#surfaceReady || this.#disposed) {
      throw new Error("Editor surface 当前不可更新输入 lease");
    }
    if (enabled) this.#leaseToken = leaseToken;
    const result = await this.#sendRequestWithResponse(
      "editor.setInputEnabled",
      { enabled, leaseToken, identityRevision },
      CAPTURE_TIMEOUT_MS,
    );
    if (!isEditorBridgeApplyResult(result)) {
      throw new Error("editor.setInputEnabled 返回了无效结果");
    }
    return result;
  }

  async executeContextCommand(
    snapshot: EditorMenuSnapshot,
    command: EditorCommand,
  ): Promise<EditorCommandResult> {
    if (!this.#surfaceReady || this.#disposed) throw new Error("Editor surface 当前不可执行菜单");
    const result = await this.#sendRequestWithResponse(
      "editor.executeContextCommand",
      { snapshot, command },
      CAPTURE_TIMEOUT_MS,
    );
    if (!isEditorCommandResult(result)) throw new Error("菜单命令返回无效结果");
    return result;
  }

  syncHistoryStatus(status: { canUndo: boolean; canRedo: boolean }): void {
    if (this.#surfaceReady && !this.#disposed) this.#sendRequest("history.update", status);
  }

  syncRuntime(runtime: EditorRuntimeUpdatePayload): void {
    if (!this.#surfaceReady || this.#disposed) return;
    const runtimeKey = this.#getRuntimeKey(runtime);
    if (runtimeKey === this.#runtimeKey) return;
    this.#runtimeKey = runtimeKey;
    this.#runtimeRevision += 1;
    this.#sendRequest("runtime.update", { ...runtime, revision: this.#runtimeRevision });
  }

  syncPreferences(preferences: EditorPreferencesUpdatePayload): void {
    if (!this.#surfaceReady || this.#disposed) return;
    const preferencesKey = JSON.stringify(preferences);
    if (preferencesKey === this.#preferencesKey) return;
    this.#preferencesKey = preferencesKey;
    this.#sendRequest("preferences.update", preferences);
  }

  revealSelection(): void {
    if (!this.#surfaceReady || this.#disposed) return;
    this.#sendRequest("editor.revealSelection", {});
  }

  async captureDocument(): Promise<EditorDocumentCapturePayload> {
    if (!this.#surfaceReady || this.#disposed) {
      throw new Error("Editor surface 当前不可用于 capture");
    }

    const result = await this.#sendRequestWithResponse("document.capture", {}, CAPTURE_TIMEOUT_MS);
    if (!isEditorDocumentCapturePayload(result)) {
      throw new Error("document.capture 返回了无效 payload");
    }
    return result;
  }

  async executeCommand(command: EditorCommand): Promise<EditorCommandResult> {
    if (
      (command.type === "history.undo" || command.type === "history.redo") &&
      this.#options.onHistoryRequested
    ) {
      this.#options.onHistoryRequested(command.type === "history.undo" ? "undo" : "redo");
      return { applied: true, stateRevision: 0 };
    }
    if (!this.#surfaceReady || this.#disposed) {
      throw new Error("Editor surface 当前不可执行命令");
    }
    const result = await this.#sendRequestWithResponse(
      "editor.executeCommand",
      command,
      CAPTURE_TIMEOUT_MS,
    );
    if (!isEditorCommandResult(result)) {
      throw new Error("editor.executeCommand 返回了无效结果");
    }
    return result;
  }

  #matchesIdentity(message: EditorBridgeMessage): boolean {
    const identity = this.#options.identity;
    return (
      message.channelId === identity.channelId &&
      message.generation === identity.generation &&
      message.editorId === identity.editorId &&
      message.documentId === identity.documentId
    );
  }

  #handleEvent(event: EditorBridgeEvent): void {
    if (event.event === "bridge.ready") {
      this.initializeSurface();
      return;
    }
    if (event.event === "editor.historyRequested") {
      const payload = event.payload as { direction?: string; leaseToken?: string };
      if (payload?.leaseToken !== this.#leaseToken || this.#unconfirmedDraft !== null) return;
      const direction = payload?.direction;
      if (direction === "undo" || direction === "redo")
        this.#options.onHistoryRequested?.(direction);
      return;
    }
    if (event.event === "document.changed") {
      if (isEditorDocumentChangedPayload(event.payload)) {
        this.#documentText = event.payload.change
          ? applyTextChange(this.#documentText, event.payload.change)
          : (event.payload.text ?? this.#documentText);
        const accepted = this.#options.onDocumentChanged(event.payload);
        if (accepted === "pending")
          this.#pendingDocumentSequences.set(
            event.payload.localSequence,
            event.payload.baseRevision + 1,
          );
        if (accepted === false) this.retainUnconfirmedDraft(this.#documentText);
        if (accepted === true) {
          this.#originatedDocumentRevision = event.payload.baseRevision + 1;
        }
      } else {
        this.#options.onFatal("document.changed payload 无效");
      }
      return;
    }
    if (event.event === "editor.ready") {
      const wasReady = this.#surfaceReady;
      this.#surfaceReady = true;
      if (!wasReady) this.#options.onEditorReady();
      return;
    }
    if (event.event === "editor.stateChanged") {
      if (isEditorStateSnapshot(event.payload)) {
        this.#options.onEditorStateChanged(event.payload);
      } else {
        this.#options.onFatal("editor.stateChanged payload 无效");
      }
      return;
    }
    if (event.event === "appMenu.key") {
      if (isEditorAppMenuKey(event.payload)) this.#options.onAppMenuKey?.(event.payload);
      return;
    }
    if (event.event === "editor.inputRequested") {
      this.#options.onEditorInputRequested?.();
      return;
    }
    if (event.event === "editor.focusChanged") {
      if (isEditorFocusChangedPayload(event.payload)) {
        this.#options.onEditorFocusChanged(event.payload.focused);
        return;
      }
      this.#options.onFatal("editor.focusChanged payload 无效");
      return;
    }
    if (event.event === "viewport.scrollRequested") {
      if (isEditorViewportScrollPayload(event.payload)) {
        this.#options.onViewportScrollRequested(event.payload);
        return;
      }
      this.#options.onFatal("viewport.scrollRequested payload 无效");
      return;
    }
    if (event.event === "editor.saveRequested") {
      this.#options.onSaveRequested();
      return;
    }
    if (event.event === "task.toggled") {
      if (isEditorTaskToggledPayload(event.payload)) {
        this.#options.onTaskToggled(event.payload.checked);
        return;
      }
      this.#options.onFatal("task.toggled payload 无效");
      return;
    }
    if (event.event === "editor.contextMenu") {
      if (isEditorContextMenuPayload(event.payload)) this.#options.onContextMenu?.(event.payload);
      return;
    }
    if (event.event === "resource.activated") {
      if (isEditorResourceActivatedPayload(event.payload)) {
        this.#options.onResourceActivated(event.payload);
        return;
      }
      this.#options.onFatal("resource.activated payload 无效");
      return;
    }
    if (event.event === "surface.console") {
      if (isEditorConsolePayload(event.payload)) {
        this.#options.onConsole(event.payload);
      } else {
        this.#options.onFatal("surface.console payload 无效");
      }
      return;
    }
    if (event.event === "surface.fatal") {
      this.#surfaceReady = false;
      this.#rejectPendingRequests("Editor surface 发生致命错误");
      this.#options.onFatal("Editor surface 发生致命错误");
    }
  }

  #handleResponse(response: EditorBridgeResponse): void {
    const pendingRequest = this.#pendingRequests.get(response.requestId);
    if (!pendingRequest) return;

    this.#pendingRequests.delete(response.requestId);
    clearTimeout(pendingRequest.timeout);
    if (response.error) {
      pendingRequest.reject(new Error(`${response.error.code}: ${response.error.message}`));
      return;
    }
    pendingRequest.resolve(response.result);
  }

  #sendRequest(method: string, payload: unknown): string {
    const identity = this.#options.identity;
    const requestId = createMessageId();
    const message: EditorBridgeRequest = {
      protocolVersion: EDITOR_BRIDGE_PROTOCOL_VERSION,
      messageId: createMessageId(),
      channelId: identity.channelId,
      generation: identity.generation,
      editorId: identity.editorId,
      documentId: identity.documentId,
      kind: "request",
      requestId,
      method,
      payload,
    };
    this.#options.send(JSON.stringify(message));
    return requestId;
  }

  #sendRequestWithResponse(method: string, payload: unknown, timeoutMs: number): Promise<unknown> {
    return new Promise((resolve, reject) => {
      const requestId = createMessageId();
      const timeout = setTimeout(() => {
        const pendingRequest = this.#pendingRequests.get(requestId);
        if (!pendingRequest) return;
        this.#pendingRequests.delete(requestId);
        pendingRequest.reject(new Error(`${method} 请求超时`));
      }, timeoutMs);
      this.#pendingRequests.set(requestId, { resolve, reject, timeout });

      const identity = this.#options.identity;
      const message: EditorBridgeRequest = {
        protocolVersion: EDITOR_BRIDGE_PROTOCOL_VERSION,
        messageId: createMessageId(),
        channelId: identity.channelId,
        generation: identity.generation,
        editorId: identity.editorId,
        documentId: identity.documentId,
        kind: "request",
        requestId,
        method,
        payload,
      };
      this.#options.send(JSON.stringify(message));
    });
  }

  #rejectPendingRequests(message: string): void {
    for (const pendingRequest of this.#pendingRequests.values()) {
      clearTimeout(pendingRequest.timeout);
      pendingRequest.reject(new Error(message));
    }
    this.#pendingRequests.clear();
  }

  #rememberMessage(messageId: string): boolean {
    if (this.#receivedMessageIds.has(messageId)) return false;
    this.#receivedMessageIds.add(messageId);
    if (this.#receivedMessageIds.size > MESSAGE_DEDUPLICATION_LIMIT) {
      const firstMessageId = this.#receivedMessageIds.values().next().value;
      if (firstMessageId) this.#receivedMessageIds.delete(firstMessageId);
    }
    return true;
  }

  #getRuntimeKey(runtime: EditorRuntimeUpdatePayload): string {
    return JSON.stringify({ ...runtime, revision: 0 });
  }
}
