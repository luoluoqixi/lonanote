import { dialog } from '@/bindings/api';
import {
  WorkspaceMetadata,
  formatPath,
  getCurrentOpenWorkspace,
  workspace,
  workspaceManager,
} from '@/bindings/api/workspace';
import { toaster } from '@/components/ui';
import { spinner } from '@/utils';

import { setCurrentWorkspace, setWorkspaceName, setWorkspaceRootPath } from './workspace';

export const isOpenWorkspace = async (workspacePath: string, errorText?: string | null) => {
  const path = formatPath(workspacePath);
  const isOpen = await workspace.isOpenWorkspace(path);
  if (isOpen) {
    if (errorText != null) {
      toaster.error({
        title: '错误',
        description: `${errorText}: ${workspacePath}`,
        duration: 10000,
      });
    }
    return false;
  }
  return true;
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
    } catch (e) {
      toaster.error({
        title: '错误',
        description: `卸载工作区失败: ${(e as Error).message}`,
        duration: 10000,
      });
      return false;
    }
  }
  return true;
};

export const openWorkspace = async (workspacePath: string) => {
  if (!(await isOpenWorkspace(workspacePath, '已经打开工作区'))) return false;
  if (!(await checkWorkspaceExist(workspacePath))) {
    toaster.error({
      title: '错误',
      description: `打开工作区失败: workspace directory not exist: ${workspacePath}`,
      duration: 10000,
    });
    return false;
  }
  if (!(await checkWorkspaceLegal(workspacePath))) {
    toaster.error({
      title: '错误',
      description: `打开工作区失败: workspace path not legal: ${workspacePath}`,
      duration: 10000,
    });
    return false;
  }
  if (!(await unloadCurrentWorkspace())) {
    return false;
  }
  try {
    spinner.showSpinner('加载workspace');
    await workspaceManager.openWorkspaceByPath(workspacePath);
    const ws = await workspace.getCurrentWorkspace();
    if (ws) setCurrentWorkspace(ws);
    spinner.hideSpinner();
  } catch (e) {
    spinner.hideSpinner();
    toaster.error({
      title: '错误',
      description: `打开工作区失败: ${(e as Error).message}`,
      duration: 10000,
    });
    return false;
  }
  return true;
};

// export const openWorkspaceToNewWindow = async (workspacePath: string) => {
//   // 在新窗口中打开Workspace, TODO
// };

export const selectOpenWorkspace = async () => {
  const selectPath = await dialog.showOpenFolderDialog('选择工作区文件夹');
  if (selectPath && selectPath !== '') {
    console.log('选择文件夹：', selectPath);
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
    toaster.success({ title: '成功', description: `成功修改工作区路径为: ${targetRootPath}` });
    return true;
  } catch (e) {
    console.error(e);
    toaster.error({
      title: '错误',
      description: `修改工作区路径失败: ${(e as Error).message}`,
      duration: 10000,
    });
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
    toaster.success({ title: '成功', description: `成功修改工作区名字为: ${targetName}` });
    return true;
  } catch (e) {
    console.error(e);
    toaster.error({
      title: '错误',
      description: `修改工作区名字失败: ${(e as Error).message}`,
      duration: 10000,
    });
  }
  return false;
};

export const removeWorkspace = async (workspacePath: string) => {
  try {
    await workspaceManager.removeWorkspace(workspacePath);
    toaster.success({ title: '成功', description: `成功移除工作区: ${workspacePath}` });
    return true;
  } catch (e) {
    console.error(e);
    toaster.error({
      title: '错误',
      description: `移除工作区失败: ${(e as Error).message}`,
      duration: 10000,
    });
  }
  return false;
};

export const getCurrentWorkspaceFileTree = async () => {
  try {
    return await workspace.getCurrentworkspaceFileTree();
  } catch (e) {
    console.error(e);
    toaster.error({
      title: '错误',
      description: `获取工作区文件树失败: ${(e as Error).message}`,
      duration: 10000,
    });
  }
  return null;
};
