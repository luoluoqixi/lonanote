import { getCurrentOpenWorkspace, workspace, workspaceManager } from '@/bindings/api/workspace';
import { useSettingsStore } from '@/models/settings';

import { setCurrentWorkspace, updateWorkspaces } from './workspace';
import * as workspaceController from './workspace';
import * as workspaceManagerController from './workspaceManager';

export { workspaceController, workspaceManagerController };

export const getInitWorkspace = async () => {
  const ws = getCurrentOpenWorkspace();
  if (ws) {
    const isOpen = await workspace.isOpenWorkspace(ws);
    if (!isOpen) {
      await workspaceManagerController.openWorkspace(ws);
    }
  } else {
    const settings = useSettingsStore.getState().settings;
    if (settings?.autoOpenLastWorkspace) {
      const lastWorkspace = await workspaceManager.getLastWorkspace();
      if (lastWorkspace) {
        // 没有打开此workspace时, 才能打开该workspace
        if (!(await workspace.isOpenWorkspace(lastWorkspace))) {
          await workspaceManagerController.openWorkspace(lastWorkspace);
        }
      }
    }
  }
  return await workspace.getCurrentWorkspace();
};

export const initWorkspace = async () => {
  const ws = await getInitWorkspace();
  if (ws) setCurrentWorkspace(ws);
  updateWorkspaces();
};

const onBeforeunload = () => {
  const ws = getCurrentOpenWorkspace();
  if (ws) workspaceManager.unloadWorkspaceByPath(ws);
};

window.removeEventListener('beforeunload', onBeforeunload);
window.addEventListener('beforeunload', onBeforeunload);
