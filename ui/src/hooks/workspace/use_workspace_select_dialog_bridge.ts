import { useEffect, useRef } from "react";

import { dialogWindows } from "@/api/commands/win/dialog_windows";
import type {
  WorkspaceSelectAction,
  WorkspaceSelectViewModel,
} from "@/api/common/dialogs/workspace_select_model";

export function useWorkspaceSelectDialogBridge(
  requestId: string | undefined,
  model: WorkspaceSelectViewModel,
  onAction: (action: WorkspaceSelectAction) => Promise<void>,
) {
  const latest = useRef({ model, onAction });
  latest.current = { model, onAction };
  const ready = useRef(false);
  const revision = useRef(0);
  useEffect(() => {
    if (!requestId) return;
    let disposed = false;
    let stop: (() => void) | undefined;
    ready.current = false;
    void dialogWindows
      .listen<WorkspaceSelectAction>("action", requestId, (action) => {
        if (action.type === "ready") {
          ready.current = true;
          void dialogWindows
            .publishView(requestId, { revision: ++revision.current, model: latest.current.model })
            .catch(console.error);
        } else {
          void latest.current.onAction(action).catch(console.error);
        }
      })
      .then((unlisten) => {
        if (disposed) unlisten();
        else stop = unlisten;
      })
      .catch(console.error);
    return () => {
      disposed = true;
      ready.current = false;
      stop?.();
    };
  }, [requestId]);
  const snapshot = JSON.stringify(model);
  useEffect(() => {
    if (requestId && ready.current)
      void dialogWindows
        .publishView(requestId, { revision: ++revision.current, model: JSON.parse(snapshot) })
        .catch(console.error);
  }, [requestId, snapshot]);
}
