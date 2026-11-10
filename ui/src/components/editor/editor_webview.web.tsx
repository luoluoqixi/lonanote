import type { CSSProperties } from "react";
import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { useToast, useUiColorScheme, useUiTheme } from "rn-ui-kit";

import { clipboard } from "@/api/commands/system/clipboard";
import { isDesktop, isDev, os } from "@/api/common/platform";
import editorHtml from "@/assets/editor/dist/index.html";
import type { EditorPlatform } from "@/assets/editor/src/bridge/protocol";
import {
  EditorBridgeClient,
  createEditorBridgeBootstrap,
  createEditorInitializePayload,
  logEditorConsole,
} from "@/components/editor/bridge";
import {
  documentHistoryService,
  editorCommandCoordinator,
  editorInputLeaseCoordinator,
  saveCoordinator,
} from "@/components/editor/controllers";
import { useEditorResourceActivation, useEditorResourceContext } from "@/hooks/editor";
import { useLayoutMode } from "@/hooks/layout";
import { useGlobalSettings } from "@/hooks/settings";
import { useFontSettings } from "@/hooks/settings/use_font_settings";
import { type DocumentModel, type EditorViewSession, editorStore } from "@/stores/editor";

import { registerEditorMenuInvalidation } from "./controllers/editor_menu_lifecycle";
import { editorWindowService } from "./controllers/editor_window_service";
import { createEditorMenuItems } from "./desktop/editor_menu_items";
import { EditorMenuPopup } from "./desktop/editor_menu_popup";
import type { EditorMenuRequest } from "./desktop/editor_menu_popup_types";
import { getEditorDevUrl } from "./editor_dev_url";
import { resolveEditorSemanticColors } from "./theme/editor_theme";

type EditorWebViewProps = {
  active?: boolean;
  document: DocumentModel;
  editor: EditorViewSession;
  onContentScroll?: (sample: {
    contentHeight: number;
    offsetY: number;
    viewportHeight: number;
  }) => void;
};

const MAX_SURFACE_RECOVERY_ATTEMPTS = 3;

const iframeStyle: CSSProperties = {
  border: 0,
  outline: "none",
  display: "block",
  height: "100%",
  width: "100%",
};

function getEditorPlatform(): EditorPlatform {
  const currentOs = os();
  if (currentOs === "macos" || currentOs === "windows" || currentOs === "linux") {
    return currentOs;
  }
  return "web";
}

export function EditorWebView({ active = true, document, editor }: EditorWebViewProps) {
  const { toast } = useToast();
  const toastRef = useRef(toast);
  toastRef.current = toast;
  const iframeRef = useRef<HTMLIFrameElement>(null);
  const bridgeClientRef = useRef<EditorBridgeClient | null>(null);
  const menuSequenceRef = useRef(0);
  const [menuRequest, setMenuRequest] = useState<EditorMenuRequest | null>(null);
  const recoveryAttemptsRef = useRef(0);
  const [surfaceGeneration, setSurfaceGeneration] = useState(1);
  const restartSurface = useCallback(() => {
    if (recoveryAttemptsRef.current >= MAX_SURFACE_RECOVERY_ATTEMPTS) return;
    recoveryAttemptsRef.current += 1;
    setSurfaceGeneration((generation) => generation + 1);
  }, []);
  const theme = useUiTheme();
  const colorScheme = useUiColorScheme();
  const editorColors = useMemo(
    () => resolveEditorSemanticColors(theme, colorScheme),
    [colorScheme, theme],
  );
  const { settings } = useGlobalSettings();
  const { editor: editorFont } = useFontSettings();
  const { layoutMode } = useLayoutMode();
  const onResourceActivated = useEditorResourceActivation(document, editor.editorId);
  const resourceContext = useEditorResourceContext(document);
  const identity = useMemo(
    () =>
      createEditorBridgeBootstrap(
        editor.editorId,
        document.documentId,
        surfaceGeneration,
        resourceContext.revision,
      ),
    [document.documentId, editor.editorId, surfaceGeneration, resourceContext.revision],
  );
  const initializePayload = useMemo(
    () =>
      createEditorInitializePayload(
        document,
        editor,
        {
          platform: getEditorPlatform(),
          layoutMode,
          colorScheme,
          colors: editorColors,
          safeAreaInsets: { top: 0, right: 0, bottom: 0, left: 0 },
          contentInsets: { top: 0, right: 0, bottom: 0, left: 0 },
          locale: navigator.language || "en",
          pixelRatio: window.devicePixelRatio || 1,
          fontScale: 1,
          reducedMotion: window.matchMedia?.("(prefers-reduced-motion: reduce)").matches ?? false,
        },
        {
          slashMenu: isDesktop() && layoutMode === "desktop",
          font: editorFont.font,
          lineNumbers:
            editor.preferenceOverrides.lineNumbers ?? settings.editorDefaults.showLineNumber,
          lineWrapping:
            editor.preferenceOverrides.lineWrapping ?? !settings.editorDefaults.disableLineWrap,
          // 预览必须由所见即所得渲染器接管，不能沿用已缓存的源码模式偏好。
          sourceMode:
            !editor.previewMode &&
            (editor.preferenceOverrides.sourceMode ?? settings.editorDefaults.sourceMode),
        },
        resourceContext.context,
      ),
    [
      colorScheme,
      document,
      editor,
      editorColors,
      editorFont.font,
      layoutMode,
      resourceContext.context,
      settings,
    ],
  );
  const initializePayloadRef = useRef(initializePayload);
  initializePayloadRef.current = initializePayload;
  const bridgeClient = useMemo(
    () =>
      new EditorBridgeClient({
        identity,
        send: (serializedMessage) =>
          iframeRef.current?.contentWindow?.postMessage(serializedMessage, "*"),
        getInitializePayload: () => initializePayloadRef.current,
        onDocumentChanged: (payload) => {
          const sourceClient = bridgeClientRef.current;
          if (editorWindowService.isRemote()) {
            void editorWindowService
              .submitDocumentChange(document.documentId, editor.editorId, payload)
              .then((accepted) => {
                if (bridgeClientRef.current !== sourceClient) return;
                if (accepted) {
                  bridgeClientRef.current?.acknowledgeDocumentChange(payload.localSequence);
                  const latest = editorStore.getState().documentsById[document.documentId];
                  if (latest)
                    bridgeClientRef.current?.syncDocumentRevision(
                      latest.draftRevision,
                      latest.draft,
                    );
                } else
                  bridgeClientRef.current?.retainUnconfirmedDraft(
                    bridgeClientRef.current.getCurrentDraft(),
                  );
              })
              .catch((error) => {
                if (bridgeClientRef.current !== sourceClient) return;
                bridgeClientRef.current?.retainUnconfirmedDraft(
                  bridgeClientRef.current.getCurrentDraft(),
                );
                toastRef.current.error(String(error));
              });
            return "pending";
          }
          const accepted = documentHistoryService.submit(
            document.documentId,
            editor.editorId,
            payload,
          );
          if (accepted) {
            saveCoordinator.scheduleAutoSave(document.documentId);
            void editorWindowService
              .confirmLocalDocumentChange()
              .then(() => {
                if (bridgeClientRef.current !== sourceClient) return;
                bridgeClientRef.current?.acknowledgeDocumentChange(payload.localSequence);
                const latest = editorStore.getState().documentsById[document.documentId];
                if (latest)
                  bridgeClientRef.current?.syncDocumentRevision(
                    latest.draftRevision,
                    latest.draft,
                    documentHistoryService.selectionFor(editor.editorId, latest.draftRevision),
                  );
              })
              .catch((error) => {
                if (bridgeClientRef.current !== sourceClient) return;
                bridgeClientRef.current?.retainUnconfirmedDraft(
                  bridgeClientRef.current.getCurrentDraft(),
                );
                toastRef.current.error(String(error));
              });
            return "pending";
          }
          return false;
        },
        onHistoryRequested: (direction) => {
          if (editorWindowService.isRemote()) {
            void editorWindowService
              .remoteHistory(document.documentId, direction)
              .catch((error) => toastRef.current.error(String(error)));
            return;
          }
          documentHistoryService.history(document.documentId, direction, editor.editorId);
          saveCoordinator.scheduleAutoSave(document.documentId);
        },
        onEditorReady: () => {
          recoveryAttemptsRef.current = 0;
          bridgeClientRef.current?.syncHistoryStatus(
            editorWindowService.isRemote()
              ? editorWindowService.getRemoteHistoryStatus(document.documentId)
              : documentHistoryService.status(document.documentId),
          );
          editorStore.getState().setEditorBridgeState(editor.editorId, "ready");
          if (editorWindowService.isRemote())
            void editorWindowService
              .markRemoteProviderReady(editor.editorId)
              .catch((error) => toastRef.current.error(String(error)));
          else if (editorStore.getState().activeEditorId === editor.editorId)
            void editorInputLeaseCoordinator
              .requestLease(editor.editorId)
              .then(() => editorCommandCoordinator.focusIfActive(editor.editorId))
              .catch(() => undefined);
          const pendingAnchor = editorStore.getState().editorsById[editor.editorId]?.pendingAnchor;
          if (pendingAnchor) {
            editorStore.getState().setEditorPendingAnchor(editor.editorId, null);
            void bridgeClientRef.current
              ?.executeCommand({ type: "navigation.scrollToAnchor", fragment: pendingAnchor })
              .catch(() => undefined);
          }
        },
        onEditorStateChanged: (snapshot) =>
          editorStore.getState().setEditorStateSnapshot(editor.editorId, snapshot),
        onEditorFocusChanged: (focused) => {
          if (editorWindowService.isRemote()) {
            if (focused) {
              editorStore.getState().setActiveEditor(editor.editorId);
              void editorWindowService
                .requestLease(editor.editorId)
                .catch((error) => toastRef.current.error(String(error)));
            }
          } else editorInputLeaseCoordinator.handleFocusChanged(editor.editorId, focused);
        },
        onEditorInputRequested: () => {
          editorStore.getState().setActiveEditor(editor.editorId);
          const request = editorWindowService.isRemote()
            ? editorWindowService.requestLease(editor.editorId)
            : editorInputLeaseCoordinator.requestLease(editor.editorId);
          void request
            .then(() => editorCommandCoordinator.focusIfActive(editor.editorId))
            .catch((error) => toastRef.current.error(String(error)));
        },
        onViewportScrollRequested: () => undefined,
        onAppMenuKey: (payload) => {
          if (
            !isDesktop() ||
            !["windows", "linux"].includes(os()) ||
            editorStore.getState().activeEditorId !== editor.editorId
          )
            return;
          window.dispatchEvent(new KeyboardEvent(payload.type, { ...payload, cancelable: true }));
        },
        onSaveRequested: () => {
          if (editorWindowService.isRemote()) {
            void editorWindowService
              .save(editor.editorId)
              .catch((error) => toastRef.current.error(String(error)));
            return;
          }
          void saveCoordinator
            .requestSaveDocument(document.documentId)
            .catch((error) =>
              toastRef.current.error(error instanceof Error ? error.message : "保存文档失败"),
            );
        },
        onTaskToggled: () => undefined,
        onConsole: logEditorConsole,
        onResourceActivated,
        onContextMenu: (payload) => {
          if (!isDesktop()) return;
          const client = bridgeClientRef.current;
          const rect = iframeRef.current?.getBoundingClientRect();
          const initial = editorStore.getState();
          const target = initial.documentsById[document.documentId];
          const view = initial.editorsById[editor.editorId];
          if (!client || !rect || !target || !view) return;
          const identityRevision = target.identityRevision;
          const sequence = ++menuSequenceRef.current;
          const isCurrent = () => {
            const state = editorStore.getState();
            const current = state.documentsById[document.documentId];
            return (
              sequence === menuSequenceRef.current &&
              bridgeClientRef.current === client &&
              state.activeEditorId === editor.editorId &&
              state.editorsById[editor.editorId]?.documentId === document.documentId &&
              current?.identityRevision === identityRevision &&
              current.draftRevision === payload.revision
            );
          };
          const editable =
            !view.readOnly && !view.previewMode && target.editOwnerEditorId === editor.editorId;
          setMenuRequest({
            sequence,
            x: rect.left + payload.x,
            y: rect.top + payload.y,
            isCurrent,
            restoreFocus: () => {
              return client
                .executeCommand({ type: "editor.focus", preserveSelection: true })
                .then(() => undefined)
                .catch(() => undefined);
            },
            items: createEditorMenuItems({
              payload,
              editable,
              isCurrent,
              clipboard,
              execute: async (command) => {
                if (!isCurrent()) return;
                const state = editorStore.getState();
                const currentView = state.editorsById[editor.editorId];
                const currentDocument = state.documentsById[document.documentId];
                if (
                  command.type !== "selection.selectAll" &&
                  (currentView?.readOnly ||
                    currentView?.previewMode ||
                    currentDocument?.editOwnerEditorId !== editor.editorId)
                )
                  return;
                const result = await client.executeContextCommand(payload, command);
                if (
                  bridgeClientRef.current === client &&
                  editorStore.getState().activeEditorId === editor.editorId
                )
                  await client.executeCommand({ type: "editor.focus", preserveSelection: true });
                return result;
              },
              onError: (error) => {
                console.warn("编辑器菜单操作失败", error);
                toastRef.current.error("菜单操作失败");
              },
            }),
          });
        },
        onFatal: () => {
          editorStore.getState().setEditorBridgeState(editor.editorId, "failed");
          restartSurface();
        },
      }),
    [document.documentId, editor.editorId, identity, onResourceActivated, restartSurface],
  );
  bridgeClientRef.current = bridgeClient;

  useEffect(
    () =>
      registerEditorMenuInvalidation(editor.editorId, () => {
        menuSequenceRef.current += 1;
        setMenuRequest(null);
      }),
    [editor.editorId],
  );

  useEffect(() => {
    const receiveMessage = (event: MessageEvent) => {
      if (event.source !== iframeRef.current?.contentWindow || typeof event.data !== "string")
        return;
      bridgeClient.handleSerializedMessage(event.data);
    };
    window.addEventListener("message", receiveMessage);
    editorStore.getState().setEditorBridgeState(editor.editorId, "loading", identity.generation);
    return () => {
      window.removeEventListener("message", receiveMessage);
      menuSequenceRef.current += 1;
      bridgeClient.dispose();
      editorStore.getState().setEditorBridgeState(editor.editorId, "detached");
    };
  }, [bridgeClient, editor.editorId, identity.generation]);

  useEffect(
    () =>
      editorWindowService.isRemote()
        ? () => {}
        : saveCoordinator.registerCaptureProvider(document.documentId, editor.editorId, () =>
            bridgeClient.captureDocument(),
          ),
    [bridgeClient, document.documentId, editor.editorId],
  );

  useEffect(
    () =>
      (editorWindowService.isRemote()
        ? editorWindowService.registerRemoteProvider
        : editorInputLeaseCoordinator.registerProvider)(editor.editorId, {
        applyDocumentRevision: (revision, text) =>
          bridgeClient.applyDocumentRevision(revision, text),
        blur: () => bridgeClient.executeCommand({ type: "editor.blur" }).then(() => undefined),
        captureDocument: () => bridgeClient.captureDocument(),
        setInputEnabled: (enabled, token, identityRevision) =>
          bridgeClient.setInputEnabled(enabled, token, identityRevision),
      }),
    [bridgeClient, editor.editorId],
  );

  useEffect(
    () =>
      editorCommandCoordinator.registerProvider(editor.editorId, (command, snapshot) =>
        snapshot
          ? bridgeClient.executeContextCommand(snapshot, command)
          : bridgeClient.executeCommand(command),
      ),
    [bridgeClient, editor.editorId],
  );

  useEffect(() => {
    bridgeClient.syncDocumentRevision(
      document.draftRevision,
      document.draft,
      documentHistoryService.selectionFor(editor.editorId, document.draftRevision),
    );
    bridgeClient.syncHistoryStatus(
      editorWindowService.isRemote()
        ? editorWindowService.getRemoteHistoryStatus(document.documentId)
        : documentHistoryService.status(document.documentId),
    );
  }, [bridgeClient, document.draft, document.draftRevision]);

  useEffect(() => {
    bridgeClient.syncRuntime(initializePayload.runtime);
    bridgeClient.syncPreferences(initializePayload.preferences);
  }, [bridgeClient, initializePayload.preferences, initializePayload.runtime]);

  useEffect(() => {
    setMenuRequest(null);
  }, [active, bridgeClient, document.draftRevision, document.identityRevision]);

  const source = isDev() ? (getEditorDevUrl() ?? editorHtml) : editorHtml;
  const resolvedIframeStyle = { ...iframeStyle, backgroundColor: editorColors.canvas };
  if (resourceContext.isLoading)
    return <div aria-label="编辑器资源加载中" style={resolvedIframeStyle} />;
  return (
    <>
      <iframe
        aria-label="编辑器"
        tabIndex={active ? 0 : -1}
        key={identity.channelId}
        onError={restartSurface}
        onLoad={() => {
          editorStore.getState().setEditorBridgeState(editor.editorId, "handshaking");
          bridgeClient.initializeSurface();
        }}
        ref={iframeRef}
        src={source}
        style={resolvedIframeStyle}
        title="编辑器"
      />
      <EditorMenuPopup request={menuRequest} onDismiss={() => setMenuRequest(null)} />
    </>
  );
}
