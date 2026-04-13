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

export const setCurrentWorkspace = (currentWorkspace: Workspace | null) => {
  useWorkspaceStore.setState((s) => ({ ...s, currentWorkspace }));
};

export const setWorkspaces = (workspaces: WorkspaceMetadata[]) => {
  useWorkspaceStore.setState((s) => ({ ...s, workspaces }));
};

export const setWorkspaceLoading = (isWorkspaceLoading: boolean) => {
  useWorkspaceStore.setState((s) => ({ ...s, isWorkspaceLoading }));
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

export const setCurrentWorkspaceFollowGitignore = async (followGitignore: boolean) => {
  await workspace.setCurrentWorkspaceFollowGitignore(followGitignore);
  await updateCurrentWorkspace();
};

export const setCurrentWorkspaceCustomIgnore = async (customIgnore: string) => {
  await workspace.setCurrentWorkspaceCustomIgnore(customIgnore);
  await updateCurrentWorkspace();
};

export const resetCurrentWorkspaceCustomIgnore = async () => {
  await workspace.resetCurrentWorkspaceCustomIgnore();
  await updateCurrentWorkspace();
};

const setWorkspaceSettingsCallback = async (
  callback: (settings: WorkspaceSettings) => WorkspaceSettings,
) => {
  const s = useWorkspaceStore.getState();
  if (!s.currentWorkspace) return;
  const settings = s.currentWorkspace.settings;
  const newSettings = callback(settings);
  await workspace.setCurrentWorkspaceSettings(newSettings);
  await updateCurrentWorkspace();
};

export const setWorkspaceHistroySnapshootCount = async (histroySnapshootCount: number) => {
  await setWorkspaceSettingsCallback((s) => ({ ...s, histroySnapshootCount }));
};

export const setWorkspaceUploadAttachmentPath = async (uploadAttachmentPath: string) => {
  await setWorkspaceSettingsCallback((s) => ({ ...s, uploadAttachmentPath }));
};

export const setWorkspaceUploadImagePath = async (uploadImagePath: string) => {
  await setWorkspaceSettingsCallback((s) => ({ ...s, uploadImagePath }));
};

export const resetWorkspaceHistroySnapshootCount = async () => {
  await workspace.resetCurrentWorkspaceHistroySnapshootCount();
  await updateCurrentWorkspace();
};

export const resetWorkspaceUploadAttachmentPath = async () => {
  await workspace.resetCurrentWorkspaceUploadAttachmentPath();
  await updateCurrentWorkspace();
};

export const resetWorkspaceUploadImagePath = async () => {
  await workspace.resetCurrentWorkspaceUploadImagePath();
  await updateCurrentWorkspace();
};

export const reinitCurrentWorkspace = async () => {
  await workspace.reinitCurrentworkspace();
};
