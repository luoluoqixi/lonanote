import { useEffect, useState } from "react";
import { ActivityIndicator, StyleSheet, View } from "react-native";
import { Text, useAppBackgroundColors } from "rn-ui-kit";

import { type DialogWindowSession, dialogWindows } from "@/api/commands/win/dialog_windows";
import { DialogTitleBar } from "@/components/window/dialog_titlebar";

import { getDialogRenderer } from "./dialog_content_registry";
import type { DialogId, DialogJsonValue } from "./dialog_types";

export function DialogWindowHost({ requestId }: { requestId: string }) {
  const colors = useAppBackgroundColors();
  const [session, setSession] = useState<DialogWindowSession<DialogId> | null>(null);
  const [error, setError] = useState<string | null>(null);
  useEffect(() => {
    let active = true;
    void dialogWindows.getRequest(requestId).then(
      (value) => active && setSession(value),
      (reason) => active && setError(reason instanceof Error ? reason.message : String(reason)),
    );
    return () => {
      active = false;
    };
  }, [requestId]);
  useEffect(() => {
    if (error) {
      void dialogWindows
        .complete(requestId, { __dialogRendererFailure: true })
        .catch(() => dialogWindows.closeCurrent().catch(console.error));
    }
  }, [error, requestId]);
  useEffect(() => {
    if (session && !getDialogRenderer(session.dialogId))
      void dialogWindows
        .complete(requestId, { __dialogRendererFailure: true })
        .catch(() => dialogWindows.closeCurrent().catch(console.error));
  }, [requestId, session]);

  const Renderer = session ? getDialogRenderer(session.dialogId) : null;
  return (
    <View style={[styles.root, { backgroundColor: colors.screen }]}>
      <DialogTitleBar title={session?.title ?? "加载中…"} />
      <View style={styles.root}>
        {error ? (
          <View style={styles.center}>
            <Text accessibilityRole="alert">弹窗加载失败：{error}</Text>
          </View>
        ) : session && Renderer ? (
          <Renderer
            requestId={requestId}
            payload={session.payload}
            onComplete={(result) =>
              void dialogWindows
                .complete(requestId, result as DialogJsonValue | undefined)
                .catch(console.error)
            }
          />
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
