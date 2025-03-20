import { toast } from 'react-toastify';

import { fs } from '@/bindings/api';
import {
  WorkspaceMetadata,
  formatPath,
  getCurrentOpenWorkspace,
  workspace,
  workspaceManager,
} from '@/bindings/api/workspace';
import { spinner } from '@/components';

import {
  setCurrentWorkspace,
  setWorkspaceLoading,
  setWorkspaceName,
  setWorkspaceRootPath,
} from './workspace';

export const isOpenWorkspace = async (workspacePath: string, errorText?: string | null) => {
  const path = formatPath(workspacePath);
  const isOpen = await workspace.isOpenWorkspace(path);
  if (isOpen) {
    if (errorText != null) {
      toast.error(`${errorText}: ${workspacePath}`);
    }
    return true;
  }
  return false;
};

export const checkWorkspaceExist = async (workspacePath: string) => {
  return await workspaceManager.checkWorkspacePathExist(workspacePath);
};

export const checkWorkspaceLegal = async (workspacePath: string) => {
  return await workspaceManager.checkWorkspacePathLegal(workspacePath);
};

export const unloadCurrentWorkspace = async () => {
  const currentWorkspace = getCurrentOpenWorkspace();
  if (currentWorkspace != null) {
    try {
      await workspaceManager.unloadWorkspaceByPath(currentWorkspace);
      setCurrentWorkspace(null);
    } catch (e) {
      toast.error(`卸载工作区失败: ${(e as Error).message}`);
      return false;
    }
  }
  return true;
};

export const openWorkspace = async (workspacePath: string) => {
  if (await isOpenWorkspace(workspacePath, '已经打开工作区')) return false;
  if (!(await checkWorkspaceExist(workspacePath))) {
    toast.error(`打开工作区失败: workspace directory not exist: ${workspacePath}`);
    return false;
  }
  if (!(await checkWorkspaceLegal(workspacePath))) {
    toast.error(`打开工作区失败: workspace path not legal: ${workspacePath}`);
    return false;
  }
  setWorkspaceLoading(true);
  if (!(await unloadCurrentWorkspace())) {
    setWorkspaceLoading(false);
    return false;
  }
  try {
    spinner.showSpinner('加载workspace');
    await workspaceManager.openWorkspaceByPath(workspacePath);
    const ws = await workspace.getCurrentWorkspace();
    if (ws) setCurrentWorkspace(ws);
    spinner.hideSpinner();
    setWorkspaceLoading(false);
  } catch (e) {
    spinner.hideSpinner();
    toast.error(`打开工作区失败: ${(e as Error).message}`);
    setWorkspaceLoading(false);
    return false;
  }
  return true;
};

// export const openWorkspaceToNewWindow = async (workspacePath: string) => {
//   // 在新窗口中打开Workspace, TODO
// };

export const selectOpenWorkspace = async () => {
  const selectPath = await fs.showSelectDialog({
    title: '选择工作区文件夹',
    type: 'openFolder',
  });
  if (typeof selectPath === 'string' && selectPath !== '') {
    console.log('打开工作区文件夹：', selectPath);
    return openWorkspace(selectPath);
  }
  return null;
};

export const changeWorkspaceRootPath = async (
  workspace: WorkspaceMetadata,
  targetRootPath: string | null,
) => {
  if (
    targetRootPath == null ||
    targetRootPath.trim() === '' ||
    targetRootPath.trim() === workspace.rootPath
  ) {
    console.warn(`原路径与目标目录相同: ${workspace.rootPath}`);
    return false;
  }
  try {
    await setWorkspaceRootPath(workspace.path, targetRootPath, true);
    toast.success(`成功修改工作区路径为: ${targetRootPath}`);
    return true;
  } catch (e) {
    console.error(e);
    toast.error(`修改工作区路径失败: ${(e as Error).message}`);
  }
  return false;
};

export const chanWorkspaceName = async (
  workspace: WorkspaceMetadata,
  targetName: string | null,
) => {
  if (targetName == null || targetName.trim() === '' || targetName.trim() === workspace.name) {
    return;
  }
  try {
    await setWorkspaceName(workspace.path, targetName, true);
    toast.success(`成功修改工作区名字为: ${targetName}`);
    return true;
  } catch (e) {
    console.error(e);
    toast.error(`修改工作区名字失败: ${(e as Error).message}`);
  }
  return false;
};

export const removeWorkspace = async (workspacePath: string) => {
  try {
    await workspaceManager.removeWorkspace(workspacePath);
    toast.success(`成功移除工作区: ${workspacePath}`);
    return true;
  } catch (e) {
    console.error(e);
    toast.error(`移除工作区失败: ${(e as Error).message}`);
  }
  return false;
};

export const getCurrentWorkspaceFileTree = async () => {
  try {
    return await workspace.getCurrentworkspaceFileTree();
  } catch (e) {
    console.error(e);
    toast.error(`获取工作区文件树失败: ${(e as Error).message}`);
  }
  return null;
};
