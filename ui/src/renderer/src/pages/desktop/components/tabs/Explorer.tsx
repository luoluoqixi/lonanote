import React, { useMemo } from 'react';
import {
  Disposable,
  Tree,
  TreeDataProvider,
  TreeItem,
  TreeItemIndex,
  UncontrolledTreeEnvironment,
} from 'react-complex-tree';

import { FileNode, FileTree, Workspace } from '@/bindings/api';
import { Button, Heading } from '@/components/ui';
import { workspaceController, workspaceManagerController } from '@/controller/workspace';
import { useEffect } from '@/hooks';
import { useWorkspaceStore } from '@/models/workspace';

import styles from './Explorer.module.scss';

export type ExploreItemData = FileNode | FileTree;

export type ExplorerTreeItem = TreeItem<ExploreItemData>;
export interface ExplorerTreeData {
  items: Record<TreeItemIndex, ExplorerTreeItem>;
}

class ExplorerTreeDataProvider implements TreeDataProvider<ExploreItemData> {
  private data: Record<TreeItemIndex, ExplorerTreeItem> = {};
  private treeChangeListeners: ((changedItemIds: TreeItemIndex[]) => void)[] = [];

  public async getTreeItem(itemId: TreeItemIndex) {
    return this.data[itemId];
  }
  public async onChangeItemChildren(itemId: TreeItemIndex, newChildren: TreeItemIndex[]) {
    this.data[itemId].children = newChildren;
    this.treeChangeListeners.forEach((listener) => listener([itemId]));
  }
  public onDidChangeTreeData(listener: (changedItemIds: TreeItemIndex[]) => void): Disposable {
    this.treeChangeListeners.push(listener);
    return {
      dispose: () => this.treeChangeListeners.splice(this.treeChangeListeners.indexOf(listener), 1),
    };
  }
  // public async onRenameItem(item: ExplorerTreeItem, data: string): Promise<void> {
  //   // this.data[item.index].data = data;
  // }

  public initData(fileTree: FileTree) {
    this.data = {};
    const data = ExplorerTreeDataProvider.convertToTreeData(fileTree);
    for (const k in data.items) {
      this.data[k] = data.items[k];
    }
    this.treeChangeListeners.forEach((listener) => listener(['root']));
  }

  static readTreeData(fileTree: FileNode, data: ExplorerTreeData) {
    const children = fileTree.children;
    const isFolder = fileTree.fileType === 'directory';
    data.items[fileTree.path] = {
      index: fileTree.path,
      canMove: true,
      isFolder,
      children: isFolder ? children?.map((v) => v.path) : undefined,
      data: fileTree,
      canRename: true,
    };
    if (isFolder && children) {
      for (const child of children) {
        ExplorerTreeDataProvider.readTreeData(child, data);
      }
    }
  }

  static convertToTreeData(fileTree: FileTree) {
    const treeData: ExplorerTreeData = { items: {} };
    const children = fileTree.children;
    treeData.items['root'] = {
      index: 'root',
      isFolder: true,
      canMove: false,
      data: fileTree,
      children: children.map((v) => v.path),
    };
    for (let i = 0; i < children.length; i++) {
      const c = children[i];
      ExplorerTreeDataProvider.readTreeData(c, treeData);
    }
    return treeData;
  }

  public static getName(item: ExploreItemData): string {
    if ('name' in item) {
      return item.name as string;
    }
    const names = item.path.split(/\\|\//);
    const name = names.length > 0 ? names[names.length - 1] : '';
    item['name'] = name;
    return name;
  }
}

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
  const currentWorkspace = useWorkspaceStore((s) => s.currentWorkspace);
  const dataProvider = useMemo<ExplorerTreeDataProvider>(() => new ExplorerTreeDataProvider(), []);
  useEffect(async () => {
    const fileTree = await workspaceManagerController.getCurrentWorkspaceFileTree();
    if (fileTree) {
      dataProvider.initData(fileTree);
    }
  }, [currentWorkspace]);
  return (
    <div className={styles.workspaceExplorer}>
      {workspace.metadata.name}
      <UncontrolledTreeEnvironment
        dataProvider={dataProvider}
        getItemTitle={(item) => ExplorerTreeDataProvider.getName(item.data)}
        viewState={{}}
        renderItemTitle={({ title }) => (
          <span className={styles.workspaceExplorerItem}>{title}</span>
        )}
      >
        <Tree treeId="tree-1" rootItem="root" treeLabel="Tree Example" />
      </UncontrolledTreeEnvironment>
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
