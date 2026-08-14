import { useEffect, useState } from "react";

import { workspace } from "@/api/commands/workspace";
import { settingsStore } from "@/stores/settings";
import { workspaceSessionStore } from "@/stores/workspace";

type WorkspaceStartupState = {
  autoOpenedWorkspaceId: string | null;
  isReady: boolean;
};

let workspaceStartupPromise: Promise<string | null> | null = null;

async function initializeWorkspace(): Promise<string | null> {
  try {
    const globalSettings = await settingsStore.load();
    if (!globalSettings.app.autoOpenLastWorkspace) {
      return null;
    }

    const lastWorkspaceId = await workspace.getLastWorkspaceId();
    if (!lastWorkspaceId) {
      return null;
    }

    await workspace.open(lastWorkspaceId);
    workspaceSessionStore.setCurrentWorkspaceId(lastWorkspaceId);
    return lastWorkspaceId;
  } catch (error) {
    console.error("[workspace-startup] auto open last workspace failed", error);
    workspaceSessionStore.clearCurrentWorkspaceId();
    return null;
  }
}

function getWorkspaceStartupPromise(): Promise<string | null> {
  workspaceStartupPromise ??= initializeWorkspace();
  return workspaceStartupPromise;
}

/** 在单次应用运行周期内只执行一次工作区启动恢复。 */
export function useWorkspaceStartup(): WorkspaceStartupState {
  const [state, setState] = useState<WorkspaceStartupState>({
    autoOpenedWorkspaceId: null,
    isReady: false,
  });

  useEffect(() => {
    let isMounted = true;

    void getWorkspaceStartupPromise().then((autoOpenedWorkspaceId) => {
      if (isMounted) {
        setState({ autoOpenedWorkspaceId, isReady: true });
      }
    });

    return () => {
      isMounted = false;
    };
  }, []);

  return state;
}
