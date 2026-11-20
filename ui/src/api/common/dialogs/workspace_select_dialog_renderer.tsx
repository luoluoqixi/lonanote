import { useEffect, useState } from "react";
import { ActivityIndicator, View } from "react-native";

import { dialogWindows } from "@/api/commands/win/dialog_windows";
import { WorkspaceSelectView } from "@/components/workspaces/workspace_select/workspace_select_view";

import type { DialogRendererProps } from "./dialog_content_registry";
import type {
  WorkspaceSelectViewModel,
  WorkspaceSelectViewSnapshot,
} from "./workspace_select_model";

export function WorkspaceSelectDialogRenderer({
  requestId,
  onReady,
}: DialogRendererProps<"workspace.select">) {
  const [model, setModel] = useState<WorkspaceSelectViewModel | null>(null);
  useEffect(() => {
    if (model) onReady?.();
  }, [model, onReady]);
  useEffect(() => {
    let disposed = false;
    let unlisten: (() => void) | undefined;
    let retry: ReturnType<typeof setInterval> | undefined;
    let failed = false;
    let revision = -1;
    setModel(null);
    const fail = () => {
      if (disposed || failed) return;
      failed = true;
      clearInterval(retry);
      clearTimeout(timeout);
      void dialogWindows
        .complete(requestId, { __dialogRendererFailure: true })
        .catch(() => dialogWindows.closeCurrent().catch(console.error));
    };
    const timeout = setTimeout(fail, 10000);
    void dialogWindows
      .listen<WorkspaceSelectViewSnapshot>("view", requestId, (value) => {
        if (disposed || failed || value.revision <= revision) return;
        revision = value.revision;
        clearInterval(retry);
        clearTimeout(timeout);
        setModel(value.model);
      })
      .then((stop) => {
        if (disposed || failed) {
          stop();
          return;
        }
        unlisten = stop;
        const ready = () =>
          void dialogWindows.dispatchAction(requestId, { type: "ready" }).catch(fail);
        ready();
        // 首次创建时工作台控制器可能仍在挂载，收到首帧投影后立即停止握手。
        retry = setInterval(ready, 500);
      })
      .catch(fail);
    return () => {
      disposed = true;
      clearInterval(retry);
      clearTimeout(timeout);
      unlisten?.();
    };
  }, [requestId]);
  return (
    <View style={{ flex: 1, minHeight: 0, padding: 16 }}>
      {model ? (
        <WorkspaceSelectView
          model={model}
          onAction={(action) => dialogWindows.dispatchAction(requestId, action)}
        />
      ) : (
        <ActivityIndicator />
      )}
    </View>
  );
}
