import { Workspace, WorkspaceSettings, workspace, workspaceManager } from '@/bindings/api';
import { useWorkspaceStore } from '@/models/workspace';

export const useWorkspace = useWorkspaceStore;

export const setCurrentWorkspace = (currentWorkspace: Workspace) => {
  useWorkspaceStore.setState((s) => ({ ...s, currentWorkspace }));
};

export const updateCurrentWorkspace = async () => {
  const ws = await workspace.getCurrentWorkspace();
  if (ws) setCurrentWorkspace(ws);
};

export const setWorkspaceName = async (name: string, newName: string, isMove: boolean) => {
  await workspaceManager.setWorkspaceName(name, newName, isMove);
};

export const setWorkspaceRootPath = async (path: string, newPath: string, isMove: boolean) => {
  await workspaceManager.setWorkspaceRootPath(path, newPath, isMove);
};

export const setCurrentWorkspaceSettings = async (settings: WorkspaceSettings) => {
  await workspace.setCurrentWorkspaceSettings(settings);
  await updateCurrentWorkspace();
};
