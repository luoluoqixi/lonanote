import { useState } from 'react';

import { FileNode, FileTree, Workspace } from '@/bindings/api';
import { Tree, TreeItem } from '@/components';
import { Button, Heading } from '@/components/ui';
import { workspaceController, workspaceManagerController } from '@/controller/workspace';
import { useEffect } from '@/hooks';
import { useWorkspaceStore } from '@/models/workspace';

import styles from './Explorer.module.scss';

const onOpenWorkspace = async () => {
  await workspaceManagerController.selectOpenWorkspace();
};

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

export type ExplorerTreeItem = TreeItem<FileNode>;

const getTreeData = (fileTree: FileTree): ExplorerTreeItem[] => {
  const getName = (item: FileNode): string => {
    if ('name' in item) {
      return item.name as string;
    }
    const names = item.path.split(/\\|\//);
    const name = names.length > 0 ? names[names.length - 1] : '';
    item['name'] = name;
    return name;
  };
  const getTreeItems = (fileNode: FileNode[]): ExplorerTreeItem[] => {
    return fileNode?.map((f) => ({
      id: f.path,
      label: getName(f),
      children: f.children ? getTreeItems(f.children) : null,
      isLeaf: f.fileType === 'file',
      data: f,
    }));
  };
  return getTreeItems(fileTree.children);
};

const WorkspaceExploreer = ({ workspace }: WorkspaceExplorerProps) => {
  const currentWorkspace = useWorkspaceStore((s) => s.currentWorkspace);
  const [treeItems, setTreeItems] = useState<ExplorerTreeItem[]>(() => []);
  useEffect(async () => {
    const fileTree = await workspaceManagerController.getCurrentWorkspaceFileTree();
    if (fileTree) {
      setTreeItems(getTreeData(fileTree));
    }
  }, [currentWorkspace]);
  return (
    <div className={styles.workspaceExplorer}>
      <div className={styles.workspaceExplorerTitle}>{workspace.metadata.name}</div>
      <div className={styles.workspaceExplorerTree}>
        <Tree items={treeItems} expandAll fixedItemHeight={30} />
      </div>
    </div>
  );
};

interface ExplorerProps {}

const Explorer: React.FC<ExplorerProps> = () => {
  const currentWorkspace = workspaceController.useWorkspace((s) => s.currentWorkspace);
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
