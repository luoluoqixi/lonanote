import { initGetWorkspace } from '@/bindings/api/workspace';

import { setCurrentWorkspace, updateWorkspaces } from './workspace';

export * as workspaceController from './workspace';
export * as workspaceManagerController from './workspaceManager';

export const initWorkspace = async () => {
  const ws = await initGetWorkspace();
  if (ws) setCurrentWorkspace(ws);
  updateWorkspaces();
};
