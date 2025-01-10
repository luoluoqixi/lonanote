import { Workspace, WorkspaceMetadata, WorkspaceSettings, workspace } from '@/bindings/api';
import { useWorkspaceStore } from '@/models/workspace';

export const useWorkspace = useWorkspaceStore;

export const setCurrentWorkspace = (currentWorkspace: Workspace) => {
  useWorkspaceStore.setState((s) => ({ ...s, currentWorkspace }));
};

export const setCurrentWorkspaceName = async (name: string) => {
  const ws = useWorkspace.getState().currentWorkspace;
  if (ws == null) return;
  await setCurrentWorkspaceMetadata({ name, path: ws.metadata.path });
};

export const setCurrentWorkspacePath = async (path: string) => {
  const ws = useWorkspace.getState().currentWorkspace;
  if (ws == null) return;
  await setCurrentWorkspaceMetadata({ name: ws.metadata.name, path });
};

export const setCurrentWorkspaceMetadata = async (metadata: WorkspaceMetadata) => {
  await workspace.setCurrentWorkspaceMetadata(metadata);
  const ws = await workspace.getCurrentWorkspace();
  if (ws) setCurrentWorkspace(ws);
};

export const setCurrentWorkspaceSettings = async (settings: WorkspaceSettings) => {
  await workspace.setCurrentWorkspaceSettings(settings);
  const ws = await workspace.getCurrentWorkspace();
  if (ws) setCurrentWorkspace(ws);
};
