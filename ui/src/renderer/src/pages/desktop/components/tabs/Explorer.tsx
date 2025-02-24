import React, { useState } from 'react';
import {
  ControlledTreeEnvironment,
  StaticTreeDataProvider,
  Tree,
  TreeItem,
  TreeItemIndex,
} from 'react-complex-tree';
import 'react-complex-tree/lib/style-modern.css';

import { FileNode, FileTree, Workspace } from '@/bindings/api';
import { Button, Heading } from '@/components/ui';
import { workspaceController, workspaceManagerController } from '@/controller/workspace';
import { useEffect } from '@/hooks';

import styles from './Explorer.module.scss';

interface TreeData {
  items: Record<TreeItemIndex, TreeItem<any>>;
}

const defaultTreeData = { items: {} };

const readTreeData = (fileTree: FileTree | FileNode, data: TreeData = defaultTreeData) => {
  const children = fileTree.children;
  if (children) {
    for (const child of children) {
      data.items[child.path] = {
        index: child.path,
        canMove: true,
        isFolder: child.fileType === 'directory',
        children: child.fileType === 'directory' ? child.children?.map((v) => v.path) : undefined,
        data: child.path,
        canRename: true,
      };
      if (child.fileType === 'directory') {
        readTreeData(child, data);
      }
    }
  }
  return data;
};

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

const WorkspaceExploreer = ({ workspace }: WorkspaceExplorerProps) => {
  const [treeData, setTreeData] = useState<StaticTreeDataProvider>();
  useEffect(async () => {
    const fileTree = await workspaceManagerController.getCurrentWorkspaceFileTree();
    if (fileTree) {
      const tree = readTreeData(fileTree);
      const data = new StaticTreeDataProvider(tree.items, (item, data) => ({ ...item, data }));
      setTreeData(data);
      console.log(tree.items);
    }
  });
  return (
    <div>
      {workspace.metadata.name}
      {/* <ControlledTreeEnvironment
        dataProvider={treeData || new StaticTreeDataProvider({})}
        getItemTitle={(item) => item.data}
        viewState={{}}
      >
        <Tree treeId="tree-1" rootItem="root" treeLabel="Tree Example" />
      </ControlledTreeEnvironment> */}
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
