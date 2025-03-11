import { Box } from '@chakra-ui/react';
import { useState } from 'react';
import { MdDeleteOutline, MdOutlineDriveFileRenameOutline } from 'react-icons/md';
import { VscFolderOpened, VscNewFile, VscNewFolder } from 'react-icons/vsc';

import { FileNode, FileTree, Workspace, fs } from '@/bindings/api';
import { Tree, TreeItem, dialog } from '@/components';
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

const getFileName = (item: FileNode): string => {
  if ('name' in item) {
    return item.name as string;
  }
  const name = utils.getFileName(item.path);
  item['name'] = name;
  return name;
};

const getTreeData = (fileTree: FileTree): ExplorerTreeItem[] => {
  const getTreeItems = (fileNode: FileNode[]): ExplorerTreeItem[] => {
    const nodes = fileNode?.map((f) => ({
      id: f.path,
      label: getFileName(f),
      children: f.children ? getTreeItems(f.children) : null,
      isLeaf: f.fileType === 'file',
      data: f,
    }));
    return nodes;
  };
  if (fileTree.root && fileTree.root.children) {
    console.log(fileTree.root);
    return getTreeItems(fileTree.root.children);
  }
  return [];
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
      // const start = performance.now();
      setTreeItems(getTreeData(fileTree));
      // console.log(`convert tree data: ${(performance.now() - start).toFixed(2)}ms`);
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
    if (currentMenuNode) {
      const path = `${workspace.metadata.path}/${currentMenuNode.path}`;
      if (!(await fs.exists(path))) {
        toaster.error({ title: '错误', description: `路径不存在: ${path}` });
        return;
      }
      // console.log('showInFolder:', path);
      fs.showInFolder(path);
    }
  };
  const newFile = async () => {
    toaster.success({ title: 'todo' });
  };
  const newFolder = async () => {
    toaster.success({ title: 'todo' });
  };
  const renameItem = async () => {
    toaster.success({ title: 'todo' });
  };
  const deleteItem = async () => {
    if (currentMenuNode) {
      const isFile = currentMenuNode.fileType === 'file';
      const fileName = utils.getFileName(currentMenuNode.path);
      const fileType = isFile ? '文件' : '文件夹';
      dialog.showDialog({
        title: '提示',
        content: `确定要删除${fileType} ${fileName} 吗？`,
        okBtnColorPalette: 'red',
        onOk: () => {
          toaster.success({ title: 'todo' });
        },
      });
    }
  };
  return (
    <>
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
      <Menu.Root
        open={openMenu}
        onOpenChange={(e) => setOpenMenu(e.open)}
        anchorPoint={menuPosition}
      >
        <Menu.Content animation="none">
          <Menu.Item value="new-file" onClick={newFile}>
            <VscNewFile />
            <Box flex="1">新建笔记</Box>
          </Menu.Item>
          <Menu.Item value="new-folder" onClick={newFolder}>
            <VscNewFolder />
            <Box flex="1">新建文件夹</Box>
          </Menu.Item>
          <Menu.Separator />
          <Menu.Item value="open-folder" onClick={openFolderClick}>
            <VscFolderOpened />
            <Box flex="1">在资源管理器中显示</Box>
          </Menu.Item>
          <Menu.Separator />
          <Menu.Item value="rename-item" onClick={renameItem}>
            <MdOutlineDriveFileRenameOutline />
            <Box flex="1">重命名</Box>
          </Menu.Item>
          <Menu.Item
            value="delete-item"
            onClick={deleteItem}
            color="fg.error"
            _hover={{ bg: 'bg.error', color: 'fg.error' }}
          >
            <MdDeleteOutline />
            <Box flex="1">删除</Box>
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
