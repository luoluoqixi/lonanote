import { type ComponentType, useCallback, useEffect, useRef, useState } from "react";
import { ActivityIndicator, StyleSheet, View } from "react-native";
import { Text, useAppBackgroundColors } from "rn-ui-kit";

import { type DialogWindowSession, dialogWindows } from "@/api/commands/win/dialog_windows";
import { DialogTitleBar } from "@/components/window/dialog_titlebar";
import { workspaceSessionStore } from "@/stores/workspace/workspace_session_store";

import { DialogContentBoundary } from "./dialog_content_boundary";
import type { DialogRendererProps } from "./dialog_content_registry";
import type { DialogId, DialogJsonValue } from "./dialog_types";

export function DialogWindowHost({
  requestId,
  resolveRenderer,
  expectedDialogId,
}: {
  requestId: string;
  resolveRenderer: (id: DialogId) => ComponentType<DialogRendererProps<any>> | undefined;
  expectedDialogId?: DialogId;
}) {
  const colors = useAppBackgroundColors();
  const [session, setSession] = useState<DialogWindowSession<DialogId> | null>(null);
  const [error, setError] = useState<string | null>(null);
  const readySent = useRef(false);
  const reportError = useCallback((reason: unknown) => {
    setError(reason instanceof Error ? reason.message : String(reason));
  }, []);
  const ready = useCallback(() => {
    if (readySent.current) return;
    readySent.current = true;
    void dialogWindows.ready(requestId).catch(reportError);
  }, [reportError, requestId]);
  useEffect(() => {
    let active = true;
    void dialogWindows.getRequest(requestId).then(
      (value) => {
        if (!active) return;
        if (expectedDialogId && value.dialogId !== expectedDialogId) {
          reportError(new Error("Dialog 页面与请求类型不匹配"));
          return;
        }
        workspaceSessionStore.setCurrentWorkspaceId(value.currentWorkspaceId ?? null);
        setSession(value);
      },
      (reason) => active && setError(reason instanceof Error ? reason.message : String(reason)),
    );
    return () => {
      active = false;
    };
  }, [requestId, expectedDialogId, reportError]);
  useEffect(() => {
    if (error) {
      void dialogWindows
        .complete(requestId, { __dialogRendererFailure: true })
        .catch(() => dialogWindows.closeCurrent().catch(console.error));
    }
  }, [error, requestId]);
  useEffect(() => {
    if (session && !resolveRenderer(session.dialogId))
      void dialogWindows
        .complete(requestId, { __dialogRendererFailure: true })
        .catch(() => dialogWindows.closeCurrent().catch(console.error));
  }, [requestId, session, resolveRenderer]);

  const Renderer = session ? resolveRenderer(session.dialogId) : null;
  return (
    <View style={[styles.root, { backgroundColor: colors.screen }]}>
      <DialogTitleBar title={session?.title ?? "加载中…"} />
      <View style={styles.root}>
        {error ? (
          <View style={styles.center}>
            <Text accessibilityRole="alert">弹窗加载失败：{error}</Text>
          </View>
        ) : session && Renderer ? (
          <DialogContentBoundary
            onReady={ready}
            onError={reportError}
            fallback={<ActivityIndicator />}
            deferReady={["settings", "workspace.select", "workspace.directory-picker"].includes(
              session.dialogId,
            )}
          >
            <Renderer
              requestId={requestId}
              onReady={ready}
              payload={session.payload}
              onComplete={(result) =>
                void dialogWindows
                  .complete(requestId, result as DialogJsonValue | undefined)
                  .catch(console.error)
              }
            />
          </DialogContentBoundary>
        ) : (
          <View style={styles.center}>
            <ActivityIndicator />
          </View>
        )}
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  center: { flex: 1, alignItems: "center", justifyContent: "center", padding: 24 },
  root: { flex: 1, minHeight: 0 },
});
