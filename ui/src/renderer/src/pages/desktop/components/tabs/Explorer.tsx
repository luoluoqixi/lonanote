import { Heading } from '@chakra-ui/react';
import React from 'react';

import { dialog } from '@/bindings/api/dialog';
import { WorkspaceMetadata } from '@/bindings/api/workspace';
import { Button } from '@/components/ui';
import { useWorkspaceStore } from '@/models/workspace';

import styles from './Explorer.module.scss';

const NoWorkspace = () => {
  const onOpenWorkspace = async () => {
    const selectPath = await dialog.showOpenFolderDialog('选择工作区文件夹');
    if (selectPath && selectPath !== '') {
      console.log('选择文件夹：', selectPath);
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
  workspaceMetadata: WorkspaceMetadata;
}

const WorkspaceExploreer = ({ workspaceMetadata }: WorkspaceExplorerProps) => {
  return <div>{workspaceMetadata.name}</div>;
};

interface ExplorerProps {}

const Explorer: React.FC<ExplorerProps> = () => {
  const currentWorkspaceMetadata = useWorkspaceStore((s) => s.currentWorkspaceMetadata);
  return (
    <div className={styles.explorer}>
      {currentWorkspaceMetadata == null ? (
        <NoWorkspace />
      ) : (
        <WorkspaceExploreer workspaceMetadata={currentWorkspaceMetadata} />
      )}
    </div>
  );
};

export default Explorer;
