import {
  FileTreeSortType,
  Workspace,
  WorkspaceMetadata,
  WorkspaceSettings,
  workspace,
  workspaceManager,
} from '@/bindings/api';
import { useWorkspaceStore } from '@/models/workspace';

export const useWorkspace = useWorkspaceStore;

export const setCurrentWorkspace = (currentWorkspace: Workspace) => {
  useWorkspaceStore.setState((s) => ({ ...s, currentWorkspace }));
};

export const setWorkspaces = (workspaces: WorkspaceMetadata[]) => {
  useWorkspaceStore.setState((s) => ({ ...s, workspaces }));
};

export const updateWorkspaces = async () => {
  const workspaces = await workspaceManager.getWorkspacesMetadata();
  setWorkspaces(workspaces);
  return workspaces;
};

export const updateCurrentWorkspace = async () => {
  const ws = await workspace.getCurrentWorkspace();
  if (ws) setCurrentWorkspace(ws);
};

export const setWorkspaceName = async (path: string, newName: string, isMove: boolean) => {
  await workspaceManager.setWorkspaceName(path, newName, isMove);
};

export const setWorkspaceRootPath = async (path: string, newRootPath: string, isMove: boolean) => {
  await workspaceManager.setWorkspaceRootPath(path, newRootPath, isMove);
};

export const setCurrentWorkspaceSettings = async (settings: WorkspaceSettings) => {
  await workspace.setCurrentWorkspaceSettings(settings);
  await updateCurrentWorkspace();
};

export const setCurrentWorkspaceSortType = async (sortType: FileTreeSortType) => {
  await workspace.setCurrentWorkspaceFileTreeSortType(sortType);
  await updateCurrentWorkspace();
};
