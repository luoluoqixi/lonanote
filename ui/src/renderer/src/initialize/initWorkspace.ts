import { workspace } from '@/bindings/api/workspace';
import { useWorkspaceStore } from '@/models/workspace';

async function initWorkspace() {
  const workspaceState = useWorkspaceStore.getState();
  const ws = await workspace.getInitWorkspace();
  if (ws) {
    workspaceState.setCurrentWorkspace(ws);
  }
}

initWorkspace();
