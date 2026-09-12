import type { CSSProperties } from "react";
import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { useUiColorScheme, useUiTheme } from "rn-ui-kit";

import { isDev, os } from "@/api/common/platform";
import editorHtml from "@/assets/editor/dist/index.html";
import type { EditorPlatform, EditorSemanticColors } from "@/assets/editor/src/bridge/protocol";
import {
  EditorBridgeClient,
  createEditorBridgeBootstrap,
  createEditorInitializePayload,
} from "@/components/editor/bridge";
import {
  editorCommandCoordinator,
  editorInputLeaseCoordinator,
  saveCoordinator,
} from "@/components/editor/controllers";
import { useEditorResourceActivation, useEditorResourceContext } from "@/hooks/editor";
import { useGlobalSettings } from "@/hooks/settings";
import { type DocumentModel, type EditorViewSession, editorStore } from "@/stores/editor";

import { getEditorDevUrl } from "./editor_dev_url";

type EditorWebViewProps = {
  document: DocumentModel;
  editor: EditorViewSession;
};

const MAX_SURFACE_RECOVERY_ATTEMPTS = 3;

const iframeStyle: CSSProperties = {
  border: 0,
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

function getSemanticColors(theme: ReturnType<typeof useUiTheme>): EditorSemanticColors {
  return {
    background: theme.background,
    foreground: theme.foreground,
    primary: theme.primary,
    muted: theme.muted,
    mutedForeground: theme.mutedForeground,
    border: theme.border,
  };
}

export function EditorWebView({ document, editor }: EditorWebViewProps) {
  const iframeRef = useRef<HTMLIFrameElement>(null);
  const bridgeClientRef = useRef<EditorBridgeClient | null>(null);
  const recoveryAttemptsRef = useRef(0);
  const [surfaceGeneration, setSurfaceGeneration] = useState(1);
  const restartSurface = useCallback(() => {
    if (recoveryAttemptsRef.current >= MAX_SURFACE_RECOVERY_ATTEMPTS) return;
    recoveryAttemptsRef.current += 1;
    setSurfaceGeneration((generation) => generation + 1);
  }, []);
  const theme = useUiTheme();
  const colorScheme = useUiColorScheme();
  const { settings } = useGlobalSettings();
  const onResourceActivated = useEditorResourceActivation(document);
  const resourceContext = useEditorResourceContext(document);
  const identity = useMemo(
    () => createEditorBridgeBootstrap(editor.editorId, document.documentId, surfaceGeneration),
    [document.documentId, editor.editorId, surfaceGeneration],
  );
  const initializePayload = useMemo(
    () =>
      createEditorInitializePayload(
        document,
        editor,
        {
          platform: getEditorPlatform(),
          colorScheme,
          colors: getSemanticColors(theme),
          safeAreaInsets: { top: 0, right: 0, bottom: 0, left: 0 },
          contentInsets: { top: 0, right: 0, bottom: 0, left: 0 },
          locale: navigator.language || "en",
          pixelRatio: window.devicePixelRatio || 1,
          fontScale: 1,
          reducedMotion: window.matchMedia?.("(prefers-reduced-motion: reduce)").matches ?? false,
        },
        {
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
    [colorScheme, document, editor, resourceContext.context, settings, theme],
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
          const currentDocument = editorStore.getState().documentsById[document.documentId];
          if (
            !currentDocument ||
            currentDocument.editOwnerEditorId !== editor.editorId ||
            payload.baseRevision !== currentDocument.draftRevision
          ) {
            queueMicrotask(() => {
              const latestDocument = editorStore.getState().documentsById[document.documentId];
              if (latestDocument) {
                bridgeClientRef.current?.syncDocumentRevision(
                  latestDocument.draftRevision,
                  latestDocument.draft,
                );
              }
            });
            return false;
          }
          editorStore.getState().setDocumentDraft(document.documentId, payload.text);
          saveCoordinator.scheduleAutoSave(document.documentId);
          return true;
        },
        onEditorReady: () => {
          recoveryAttemptsRef.current = 0;
          editorStore.getState().setEditorBridgeState(editor.editorId, "ready");
          editorInputLeaseCoordinator.handleSurfaceReady(editor.editorId);
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
        onEditorFocusChanged: (focused) =>
          editorInputLeaseCoordinator.handleFocusChanged(editor.editorId, focused),
        onViewportScrollRequested: () => undefined,
        onSaveRequested: () => {
          void saveCoordinator.flushDocument(document.documentId).catch(() => undefined);
        },
        onResourceActivated,
        onFatal: () => {
          editorStore.getState().setEditorBridgeState(editor.editorId, "failed");
          restartSurface();
        },
      }),
    [document.documentId, editor.editorId, identity, onResourceActivated, restartSurface],
  );
  bridgeClientRef.current = bridgeClient;

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
      bridgeClient.dispose();
      editorStore.getState().setEditorBridgeState(editor.editorId, "detached");
    };
  }, [bridgeClient, editor.editorId, identity.generation]);

  useEffect(
    () =>
      saveCoordinator.registerCaptureProvider(document.documentId, editor.editorId, () =>
        bridgeClient.captureDocument(),
      ),
    [bridgeClient, document.documentId, editor.editorId],
  );

  useEffect(
    () =>
      editorInputLeaseCoordinator.registerProvider(editor.editorId, {
        applyDocumentRevision: (revision, text) =>
          bridgeClient.applyDocumentRevision(revision, text),
        blur: () => bridgeClient.executeCommand({ type: "editor.blur" }).then(() => undefined),
        captureDocument: () => bridgeClient.captureDocument(),
        setInputEnabled: (enabled) => bridgeClient.setInputEnabled(enabled),
      }),
    [bridgeClient, editor.editorId],
  );

  useEffect(
    () =>
      editorCommandCoordinator.registerProvider(editor.editorId, (command) =>
        bridgeClient.executeCommand(command),
      ),
    [bridgeClient, editor.editorId],
  );

  useEffect(() => {
    bridgeClient.syncDocumentRevision(document.draftRevision, document.draft);
  }, [bridgeClient, document.draft, document.draftRevision]);

  useEffect(() => {
    bridgeClient.syncRuntime(initializePayload.runtime);
    bridgeClient.syncPreferences(initializePayload.preferences);
  }, [bridgeClient, initializePayload.preferences, initializePayload.runtime]);

  const source = isDev() ? (getEditorDevUrl() ?? editorHtml) : editorHtml;
  if (resourceContext.isLoading) {
    return <div aria-label="编辑器资源加载中" style={iframeStyle} />;
  }
  return (
    <iframe
      aria-label="编辑器"
      key={identity.channelId}
      onError={restartSurface}
      onLoad={() => {
        editorStore.getState().setEditorBridgeState(editor.editorId, "handshaking");
        bridgeClient.initializeSurface();
      }}
      ref={iframeRef}
      src={source}
      style={iframeStyle}
      title="编辑器"
    />
  );
}
