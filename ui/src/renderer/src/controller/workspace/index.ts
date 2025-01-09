import { workspace } from '@/bindings/api/workspace';

import { setCurrentWorkspace } from './workspace';

export * from './workspace';

export const initWorkspace = async () => {
  const ws = await workspace.getInitWorkspace();
  if (ws) {
    setCurrentWorkspace(ws);
  }
};
