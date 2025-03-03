import { useState } from 'react';

import { FileNode, FileTree, Workspace } from '@/bindings/api';
import { Tree, TreeItem } from '@/components';
import { Button, Heading, Menu, toaster } from '@/components/ui';
import { workspaceController, workspaceManagerController } from '@/controller/workspace';
import { useEffect } from '@/hooks';
import { useWorkspaceStore } from '@/models/workspace';
import { utils } from '@/utils';

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

const fileNodeCompare = (a: ExplorerTreeItem, b: ExplorerTreeItem) => {
  if (!a.label || !b.label) return 0;
  const aIsFolder = a.isLeaf || false;
  const bIsFolder = b.isLeaf || false;
  if (aIsFolder === bIsFolder) {
    return utils.fileNameCompare(a.label, b.label);
  }
  if (aIsFolder) {
    return 1;
  }
  return -1;
};

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
    const nodes = fileNode?.map((f) => ({
      id: f.path,
      label: getName(f),
      children: f.children ? getTreeItems(f.children) : null,
      isLeaf: f.fileType === 'file',
      data: f,
    }));
    nodes.sort(fileNodeCompare);
    return nodes;
  };
  return getTreeItems(fileTree.children);
};

const WorkspaceExploreer = ({ workspace }: WorkspaceExplorerProps) => {
  const [openMenu, setOpenMenu] = useState(false);
  const [menuPosition, setMenuPosition] = useState({ x: 0, y: 0 });
  const [currentMenuNode, setCurrentMenuNode] = useState<FileNode>();
  const currentWorkspace = useWorkspaceStore((s) => s.currentWorkspace);
  const [treeItems, setTreeItems] = useState<ExplorerTreeItem[]>(() => []);

  useEffect(async () => {
    const fileTree = await workspaceManagerController.getCurrentWorkspaceFileTree();
    if (fileTree) {
      setTreeItems(getTreeData(fileTree));
    }
  }, [currentWorkspace]);

  const openMenuClick = (
    node: FileNode,
    e:
      | React.MouseEvent<HTMLDivElement, PointerEvent>
      | React.MouseEvent<HTMLButtonElement, MouseEvent>,
  ) => {
    if (!openMenu) {
      setCurrentMenuNode(node);
      setMenuPosition({ x: e.clientX, y: e.clientY });
      setOpenMenu(true);
    }
  };

  const openFolderClick = async () => {
    console.log('openFolder:', currentMenuNode);
    if (currentMenuNode && window.api) {
      const path = `${workspace.metadata.path}/${currentMenuNode.path}`;
      if (!(await workspaceManagerController.checkWorkspaceExist(path))) {
        toaster.error({ title: '错误', description: `文件夹不存在: ${path}` });
        return;
      }
      console.log('open folder:', path);
      window.api.shell.openPathInFolder(path);
    }
  };
  return (
    <>
      <Menu.Root
        open={openMenu}
        onOpenChange={(e) => setOpenMenu(e.open)}
        anchorPoint={menuPosition}
      >
        <div className={styles.workspaceExplorer}>
          <div className={styles.workspaceExplorerTitle}>{workspace.metadata.name}</div>
          <div className={styles.workspaceExplorerTree}>
            <Tree
              items={treeItems}
              fixedItemHeight={30}
              itemsProps={{
                onClick(e, data, context, state) {
                  console.log('onClick', data, context, state);
                },
                onRightDown(e, data) {
                  if (data.data) {
                    openMenuClick(data.data, e);
                  }
                },
              }}
            />
          </div>
        </div>
        <Menu.Content>
          <Menu.Item value="open-folder" onClick={openFolderClick}>
            在资源管理器中显示
          </Menu.Item>
        </Menu.Content>
      </Menu.Root>
    </>
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
