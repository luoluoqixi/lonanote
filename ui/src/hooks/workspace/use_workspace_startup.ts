import { useEffect, useRef, useState } from "react";

import { workspace } from "@/api/commands/workspace";
import { useToast } from "@/hooks/ui";
import { settingsStore } from "@/stores/settings";
import { workspaceSessionStore } from "@/stores/workspace";

type WorkspaceStartupState = {
  autoOpenedWorkspaceId: string | null;
  isReady: boolean;
};

type WorkspaceStartupResult = {
  autoOpenedWorkspaceId: string | null;
  errorMessage: string | null;
};

let workspaceStartupPromise: Promise<WorkspaceStartupResult> | null = null;

function getErrorMessage(error: unknown): string {
  return error instanceof Error && error.message.trim() ? error.message : "发生未知错误";
}

async function initializeWorkspace(): Promise<WorkspaceStartupResult> {
  try {
    const globalSettings = await settingsStore.load();
    if (!globalSettings.app.autoOpenLastWorkspace) {
      return { autoOpenedWorkspaceId: null, errorMessage: null };
    }

    const lastWorkspaceId = await workspace.getLastWorkspaceId();
    if (!lastWorkspaceId) {
      return { autoOpenedWorkspaceId: null, errorMessage: null };
    }

    await workspace.open(lastWorkspaceId);
    workspaceSessionStore.setCurrentWorkspaceId(lastWorkspaceId);
    return { autoOpenedWorkspaceId: lastWorkspaceId, errorMessage: null };
  } catch (error) {
    console.error("[workspace-startup] auto open last workspace failed", error);
    workspaceSessionStore.clearCurrentWorkspaceId();
    return { autoOpenedWorkspaceId: null, errorMessage: getErrorMessage(error) };
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
