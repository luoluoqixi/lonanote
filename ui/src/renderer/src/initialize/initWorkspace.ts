import { workspace } from '@/bindings/api/workspace';
import { useWorkspaceStore } from '@/models/workspace';

async function initWorkspace() {
  const workspaceState = useWorkspaceStore.getState();
  const metadata = await workspace.getCurrentWorkspaceMetadata();
  if (metadata) {
    workspaceState.setCurrentWorkspaceMetadata(metadata);
  }
}

initWorkspace();
