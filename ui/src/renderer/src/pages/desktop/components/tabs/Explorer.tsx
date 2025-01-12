import React from 'react';

import { Workspace } from '@/bindings/api';
import { Button, Heading } from '@/components/ui';
import { useWorkspace } from '@/controller/workspace';

import { onOpenWorkspace } from '../dialogs/workspaceManager';
import styles from './Explorer.module.scss';

const NoWorkspace = () => {
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
