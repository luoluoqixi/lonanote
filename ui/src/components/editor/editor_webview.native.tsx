import { useHeaderHeight } from "@react-navigation/elements";
import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { ActivityIndicator, Keyboard, PixelRatio, StyleSheet, Text, View } from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import WebView from "react-native-webview";
import { useUiColorScheme, useUiTheme } from "rn-ui-kit";

import { isDev, os, systemLocale } from "@/api/common/platform";
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
import { EDITOR_HTML, initEditorHtml } from "./editor_html.native";
import { MOBILE_EDITOR_TOOLBAR_HEIGHT } from "./editor_layout";
import { onError, onHttpError, onLoad, onLoadEnd, onLoadStart } from "./editor_webview_event";

type EditorWebViewProps = {
  document: DocumentModel;
  editor: EditorViewSession;
  mobileToolbarOverlayHeight?: number;
};

const MAX_SURFACE_RECOVERY_ATTEMPTS = 3;

function getSource(devMode: boolean) {
  const editorDevUrl = devMode ? getEditorDevUrl() : null;
  return editorDevUrl ? { uri: editorDevUrl } : { html: EDITOR_HTML.html };
}

function createBootstrapInjection(
  identity: ReturnType<typeof createEditorBridgeBootstrap>,
): string {
  return `window.__LONANOTE_EDITOR_BRIDGE_BOOTSTRAP__=${JSON.stringify(identity)};true;`;
}

function getEditorPlatform(): EditorPlatform {
  const currentOs = os();
  return currentOs === "ios" || currentOs === "android" ? currentOs : "android";
}

function getContentBottomInset(
  safeAreaBottom: number,
  keyboardHeight: number,
  mobileToolbarOverlayHeight: number,
): number {
  if (mobileToolbarOverlayHeight > 0) return mobileToolbarOverlayHeight;
  if (os() === "ios") {
    return keyboardHeight > 0
      ? Math.max(safeAreaBottom, keyboardHeight + MOBILE_EDITOR_TOOLBAR_HEIGHT)
      : safeAreaBottom;
  }
  return Math.max(safeAreaBottom, keyboardHeight > 0 ? MOBILE_EDITOR_TOOLBAR_HEIGHT : 0);
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

function RenderLoading() {
  return (
    <View style={styles.statusContainer}>
      <ActivityIndicator />
    </View>
  );
}

export function EditorWebView({
  document,
  editor,
  mobileToolbarOverlayHeight = 0,
}: EditorWebViewProps) {
  const devMode = isDev();
  const headerHeight = useHeaderHeight();
  const insets = useSafeAreaInsets();
  const theme = useUiTheme();
  const colorScheme = useUiColorScheme();
  const { settings } = useGlobalSettings();
  const onResourceActivated = useEditorResourceActivation(document);
  const resourceContext = useEditorResourceContext(document);
  const webViewRef = useRef<WebView<{}>>(null);
  const bridgeClientRef = useRef<EditorBridgeClient | null>(null);
  const recoveryAttemptsRef = useRef(0);
  const [inited, setInited] = useState<boolean>(false);
  const [hasLoadingError, setHasLoadingError] = useState(false);
  const [keyboardHeight, setKeyboardHeight] = useState(0);
  const [surfaceGeneration, setSurfaceGeneration] = useState(1);
  const restartSurface = useCallback(() => {
    if (recoveryAttemptsRef.current >= MAX_SURFACE_RECOVERY_ATTEMPTS) {
      setHasLoadingError(true);
      return;
    }
    recoveryAttemptsRef.current += 1;
    setSurfaceGeneration((generation) => generation + 1);
  }, []);
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
          safeAreaInsets: insets,
          contentInsets: {
            top: headerHeight,
            right: insets.right,
            bottom: getContentBottomInset(
              insets.bottom,
              keyboardHeight,
              mobileToolbarOverlayHeight,
            ),
            left: insets.left,
          },
          locale: systemLocale(),
          pixelRatio: PixelRatio.get(),
          fontScale: PixelRatio.getFontScale(),
          reducedMotion: false,
        },
        {
          lineNumbers: settings.editorDefaults.showLineNumber,
          lineWrapping: !settings.editorDefaults.disableLineWrap,
          sourceMode: settings.editorDefaults.sourceMode,
        },
        resourceContext.context,
      ),
    [
      colorScheme,
      document,
      editor,
      headerHeight,
      insets,
      keyboardHeight,
      mobileToolbarOverlayHeight,
      resourceContext.context,
      settings,
      theme,
    ],
  );
  const initializePayloadRef = useRef(initializePayload);
  initializePayloadRef.current = initializePayload;
  const bridgeClient = useMemo(
    () =>
      new EditorBridgeClient({
        identity,
        send: (serializedMessage) => webViewRef.current?.postMessage(serializedMessage),
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
    editorStore.getState().setEditorBridgeState(editor.editorId, "loading", identity.generation);
    return () => {
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

  useEffect(() => {
    if (devMode) {
      setInited(true);
      return;
    }
    let isActive = true;
    initEditorHtml()
      .then(() => {
        if (isActive) setInited(true);
      })
      .catch(() => {
        if (isActive) setHasLoadingError(true);
      });
    return () => {
      isActive = false;
    };
  }, [devMode]);

  useEffect(() => {
    const updateKeyboardHeight = (height: number) => setKeyboardHeight(height);
    const currentKeyboardHeight = Keyboard.metrics()?.height;
    if (currentKeyboardHeight != null) updateKeyboardHeight(currentKeyboardHeight);

    const showSubscription = Keyboard.addListener("keyboardWillShow", (event) => {
      updateKeyboardHeight(event.endCoordinates.height);
    });
    const didShowSubscription = Keyboard.addListener("keyboardDidShow", (event) => {
      updateKeyboardHeight(event.endCoordinates.height);
    });
    const frameChangeSubscription = Keyboard.addListener("keyboardWillChangeFrame", (event) => {
      updateKeyboardHeight(event.endCoordinates.height);
    });
    const hideSubscription = Keyboard.addListener("keyboardWillHide", () =>
      updateKeyboardHeight(0),
    );
    const didHideSubscription = Keyboard.addListener("keyboardDidHide", () =>
      updateKeyboardHeight(0),
    );
    return () => {
      showSubscription.remove();
      didShowSubscription.remove();
      frameChangeSubscription.remove();
      hideSubscription.remove();
      didHideSubscription.remove();
    };
  }, []);

  if (hasLoadingError) {
    return (
      <View style={styles.statusContainer}>
        <Text style={styles.statusText}>编辑器资源加载失败</Text>
      </View>
    );
  }

  if (resourceContext.isLoading) {
    return <RenderLoading />;
  }
  if (!inited) {
    return <RenderLoading />;
  }

  return (
    <WebView<{}>
      key={identity.channelId}
      ref={webViewRef}
      decelerationRate={0.998}
      injectedJavaScriptBeforeContentLoaded={createBootstrapInjection(identity)}
      injectedJavaScriptObject={{ lonanoteEditorBridge: identity }}
      hideKeyboardAccessoryView={os() === "ios"}
      javaScriptEnabled
      onContentProcessDidTerminate={restartSurface}
      onError={(event) => {
        onError(event);
        restartSurface();
      }}
      onHttpError={onHttpError}
      onLoad={(event) => {
        onLoad(event);
        bridgeClient.initializeSurface();
      }}
      onLoadEnd={onLoadEnd}
      onLoadStart={(event) => {
        editorStore.getState().setEditorBridgeState(editor.editorId, "handshaking");
        onLoadStart(event);
      }}
      onMessage={(event) => bridgeClient.handleSerializedMessage(event.nativeEvent.data)}
      onRenderProcessGone={restartSurface}
      originWhitelist={["*"]}
      renderLoading={RenderLoading}
      scrollIndicatorInsets={{
        top: headerHeight,
        bottom: Math.max(insets.bottom, keyboardHeight, mobileToolbarOverlayHeight),
      }}
      source={getSource(devMode)}
      style={styles.webView}
    />
  );
}

const styles = StyleSheet.create({
  statusContainer: {
    alignItems: "center",
    flex: 1,
    justifyContent: "center",
  },
  statusText: {
    color: "#6f7177",
  },
  webView: {
    flex: 1,
  },
});
