import { initGetWorkspace } from '@/bindings/api/workspace';

import { setCurrentWorkspace, updateWorkspaces } from './workspace';

export * from './workspace';

export const initWorkspace = async () => {
  const ws = await initGetWorkspace();
  if (ws) setCurrentWorkspace(ws);
  updateWorkspaces();
};
