import { invokeAsync } from '@/bindings/core';

import { FileTree, FileTreeSortType, Workspace, WorkspaceSettings } from './types';
import { getCurrentOpenWorkspace } from './workspaceManager';

const checkCurrentOpenWorkspace = async (): Promise<string> => {
  const path = getCurrentOpenWorkspace();
  if (!path) throw new Error('workspace is not open');
  return path;
};

export const workspace = {
  isOpenWorkspace: async (path: string): Promise<boolean> => {
    return path ? (await invokeAsync('workspace.is_open_workspace', { path }))! : false;
  },
  getWorkspace: async (path: string): Promise<Workspace | null> => {
    return path ? (await invokeAsync('workspace.get_open_workspace', { path }))! : null;
  },
  getWorkspaceSettings: async (path: string): Promise<WorkspaceSettings> => {
    return (await invokeAsync('workspace.get_open_workspace_settings', { path }))!;
  },
  setWorkspaceSettings: async (path: string, settings: WorkspaceSettings): Promise<Workspace> => {
    return (await invokeAsync('workspace.set_open_workspace_settings', { path, settings }))!;
  },
  getOpenWorkspaceFileTree: async (path: string): Promise<FileTree> => {
    return (await invokeAsync('workspace.get_open_workspace_file_tree', { path }))!;
  },
  setOpenWorkspaceFileTreeSortType: async (
    path: string,
    sortType: FileTreeSortType,
  ): Promise<void> => {
    return (await invokeAsync('workspace.set_open_workspace_file_tree_sort_type', {
      path,
      sortType,
    }))!;
  },
  setOpenWorkspaceFollowGitignore: async (
    path: string,
    followGitignore: boolean,
  ): Promise<void> => {
    return (await invokeAsync('workspace.set_open_workspace_follow_gitignore', {
      path,
      followGitignore,
    }))!;
  },
  setOpenWorkspaceCustomIgnore: async (path: string, customIgnore: string): Promise<void> => {
    return (await invokeAsync('workspace.set_open_workspace_custom_ignore', {
      path,
      customIgnore,
    }))!;
  },
  resetOpenWorkspaceCustomIgnore: async (path: string): Promise<void> => {
    return (await invokeAsync('workspace.reset_open_workspace_custom_ignore', {
      path,
    }))!;
  },
  resetOpenWorkspaceHistroySnapshootCount: async (path: string): Promise<void> => {
    return (await invokeAsync('workspace.reset_open_workspace_histroy_snapshoot_count', {
      path,
    }))!;
  },
  resetOpenWorkspaceUploadAttachmentPath: async (path: string): Promise<void> => {
    return (await invokeAsync('workspace.reset_open_workspace_upload_attachment_path', {
      path,
    }))!;
  },
  resetOpenWorkspaceUploadImagePath: async (path: string): Promise<void> => {
    return (await invokeAsync('workspace.reset_open_workspace_upload_image_path', {
      path,
    }))!;
  },
  callOpenWorkspaceReinit: async (path: string): Promise<void> => {
    return (await invokeAsync('workspace.call_open_workspace_reinit', { path }))!;
  },
  getCurrentWorkspace: async (): Promise<Workspace | null> => {
    const path = getCurrentOpenWorkspace();
    return path ? await workspace.getWorkspace(path) : null;
  },
  getCurrentWorkspaceSettings: async (): Promise<WorkspaceSettings> => {
    const path = await checkCurrentOpenWorkspace();
    return await workspace.getWorkspaceSettings(path);
  },
  setCurrentWorkspaceSettings: async (settings: WorkspaceSettings): Promise<Workspace> => {
    const path = await checkCurrentOpenWorkspace();
    return await workspace.setWorkspaceSettings(path, settings);
  },
  getCurrentworkspaceFileTree: async (): Promise<FileTree> => {
    const path = await checkCurrentOpenWorkspace();
    return await workspace.getOpenWorkspaceFileTree(path);
  },
  setCurrentWorkspaceFileTreeSortType: async (sortType: FileTreeSortType): Promise<void> => {
    const path = await checkCurrentOpenWorkspace();
    return await workspace.setOpenWorkspaceFileTreeSortType(path, sortType);
  },
  setCurrentWorkspaceFollowGitignore: async (followGitignore: boolean): Promise<void> => {
    const path = await checkCurrentOpenWorkspace();
    return await workspace.setOpenWorkspaceFollowGitignore(path, followGitignore);
  },
  setCurrentWorkspaceCustomIgnore: async (customIgnore: string): Promise<void> => {
    const path = await checkCurrentOpenWorkspace();
    return await workspace.setOpenWorkspaceCustomIgnore(path, customIgnore);
  },
  resetCurrentWorkspaceCustomIgnore: async (): Promise<void> => {
    const path = await checkCurrentOpenWorkspace();
    return await workspace.resetOpenWorkspaceCustomIgnore(path);
  },
  resetCurrentWorkspaceHistroySnapshootCount: async (): Promise<void> => {
    const path = await checkCurrentOpenWorkspace();
    return await workspace.resetOpenWorkspaceHistroySnapshootCount(path);
  },
  resetCurrentWorkspaceUploadAttachmentPath: async (): Promise<void> => {
    const path = await checkCurrentOpenWorkspace();
    return await workspace.resetOpenWorkspaceUploadAttachmentPath(path);
  },
  resetCurrentWorkspaceUploadImagePath: async (): Promise<void> => {
    const path = await checkCurrentOpenWorkspace();
    return await workspace.resetOpenWorkspaceUploadImagePath(path);
  },
  reinitCurrentworkspace: async (): Promise<void> => {
    const path = await checkCurrentOpenWorkspace();
    await workspace.callOpenWorkspaceReinit(path);
  },
};
