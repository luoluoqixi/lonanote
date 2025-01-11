import React from 'react';

import { Workspace, workspace, workspaceManager } from '@/bindings/api';
import { dialog } from '@/bindings/api/dialog';
import { settings } from '@/bindings/api/settings';
import { Button, Heading } from '@/components/ui';
import { setCurrentWorkspace, useWorkspace } from '@/controller/workspace';

import styles from './Explorer.module.scss';

const NoWorkspace = () => {
  const onOpenWorkspace = async () => {
    const s = await settings.getSettings();
    console.log('settings', s);
    const selectPath = await dialog.showOpenFolderDialog('选择工作区文件夹');
    if (selectPath && selectPath !== '') {
      console.log('选择文件夹：', selectPath);
      await workspaceManager.openWorkspaceByPath(selectPath);
      const ws = await workspace.getCurrentWorkspace();
      if (ws) setCurrentWorkspace(ws);
      console.log('打开工作区：', ws);
    }
  };
  return (
    <div className={styles.noWorkspace}>
      <Heading size="sm">没有打开工作区</Heading>
      <div className={styles.handleButtonList}>
        <Button size="xs" className={styles.handleButton} onClick={onOpenWorkspace}>
          打开工作区（文件夹）
        </Button>
        {/* <Button size="xs" className={styles.handleButton}>
          同步工作区（Webdav）
        </Button> */}
      </div>
    </div>
  );
};

interface WorkspaceExplorerProps {
  workspace: Workspace;
}

const WorkspaceExploreer = ({ workspace }: WorkspaceExplorerProps) => {
  return <div>{workspace.metadata.name}</div>;
};

interface ExplorerProps {}

const Explorer: React.FC<ExplorerProps> = () => {
  const currentWorkspace = useWorkspace((s) => s.currentWorkspace);
  return (
    <div className={styles.explorer}>
      {currentWorkspace == null ? (
        <NoWorkspace />
      ) : (
        <WorkspaceExploreer workspace={currentWorkspace} />
      )}
    </div>
  );
};

export default Explorer;
