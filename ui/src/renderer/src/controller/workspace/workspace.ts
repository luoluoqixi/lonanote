import { Workspace, WorkspaceSettings, workspace } from '@/bindings/api';
import { useWorkspaceStore } from '@/models/workspace';

export const useWorkspace = useWorkspaceStore;

export const setCurrentWorkspace = (currentWorkspace: Workspace) => {
  useWorkspaceStore.setState((s) => ({ ...s, currentWorkspace }));
};

export const updateCurrentWorkspace = async () => {
  const ws = await workspace.getCurrentWorkspace();
  if (ws) setCurrentWorkspace(ws);
};

export const setCurrentWorkspaceName = async (name: string, isMove: boolean) => {
  await workspace.setCurrentWorkspaceName(name, isMove);
  await updateCurrentWorkspace();
};

export const setCurrentWorkspaceRootPath = async (path: string, isMove: boolean) => {
  await workspace.setCurrentWorkspaceRootPath(path, isMove);
  await updateCurrentWorkspace();
};

export const setWorkspaceName = async (name: string, newName: string, isMove: boolean) => {
  await workspace.setWorkspaceName(name, newName, isMove);
  const ws = await workspace.getCurrentWorkspace();
  if (ws) setCurrentWorkspace(ws);
};

export const setWorkspacePath = async (path: string, newPath: string, isMove: boolean) => {
  await workspace.setWorkspacePath(path, newPath, isMove);
  await updateCurrentWorkspace();
};

export const setCurrentWorkspaceSettings = async (settings: WorkspaceSettings) => {
  await workspace.setCurrentWorkspaceSettings(settings);
  await updateCurrentWorkspace();
};
