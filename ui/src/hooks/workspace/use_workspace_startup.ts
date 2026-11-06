import { useEffect, useRef, useState } from "react";

import { multiWindow } from "@/api/commands/win/multi_window";
import { workspace } from "@/api/commands/workspace";
import { waitForConfigSyncReady } from "@/api/common/config_sync_controller";
import { getErrorMessage } from "@/api/common/error_message";
import { resolveWorkspaceStartupTarget } from "@/api/common/workspace_startup_target";
import { useToast } from "@/hooks/ui";
import { settingsStore } from "@/stores/settings";
import { workspaceSessionStore } from "@/stores/workspace";
import { workspaceExplorerStore } from "@/stores/workspace/workspace_explorer_runtime";

type WorkspaceStartupState = {
  autoOpenedWorkspaceId: string | null;
  isReady: boolean;
};

type WorkspaceStartupResult = {
  autoOpenedWorkspaceId: string | null;
  errorMessage: string | null;
};

let workspaceStartupPromise: Promise<WorkspaceStartupResult> | null = null;

async function initializeWorkspace(): Promise<WorkspaceStartupResult> {
  let openingWorkspaceId: string | null = null;
  try {
    await waitForConfigSyncReady();
    const target = await resolveWorkspaceStartupTarget(
      await multiWindow.getBootstrap(),
      async () => {
        const globalSettings = await settingsStore.load();
        return globalSettings.app.autoOpenLastWorkspace ? workspace.getLastWorkspaceId() : null;
      },
    );
    if (!target) return { autoOpenedWorkspaceId: null, errorMessage: null };
    openingWorkspaceId = target.workspaceId;
    // 刷新只恢复当前窗口的投影，不重新 open 或改写全局最近工作区。
    if (target.alreadyOpen) await workspace.get(target.workspaceId);
    else await workspace.open(target.workspaceId);
    workspaceSessionStore.setCurrentWorkspaceId(target.workspaceId);
    return { autoOpenedWorkspaceId: target.workspaceId, errorMessage: null };
  } catch (error) {
    if (openingWorkspaceId) workspaceExplorerStore.getState().resetWorkspace(openingWorkspaceId);
    console.error("[workspace-startup] auto open last workspace failed", error);
    workspaceSessionStore.clearCurrentWorkspaceId();
    return { autoOpenedWorkspaceId: null, errorMessage: getErrorMessage(error, "发生未知错误") };
  }
}

function getWorkspaceStartupPromise(): Promise<WorkspaceStartupResult> {
  workspaceStartupPromise ??= initializeWorkspace();
  return workspaceStartupPromise;
}

/** 在单次应用运行周期内只执行一次工作区启动恢复。 */
export function useWorkspaceStartup(): WorkspaceStartupState {
  const { toast } = useToast();
  const toastRef = useRef(toast);
  toastRef.current = toast;
  const [state, setState] = useState<WorkspaceStartupState>({
    autoOpenedWorkspaceId: null,
    isReady: false,
  });

  useEffect(() => {
    let isMounted = true;

    void getWorkspaceStartupPromise().then(({ autoOpenedWorkspaceId, errorMessage }) => {
      if (isMounted) {
        setState({ autoOpenedWorkspaceId, isReady: true });
        if (errorMessage) {
          toastRef.current.error("自动打开最近工作区失败", {
            description: errorMessage,
            duration: 6_000,
            id: "workspace-startup-auto-open-error",
          });
        }
      }
    });

    return () => {
      isMounted = false;
    };
  }, []);

  return state;
}
