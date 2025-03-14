import { Box, Center, Spinner } from '@chakra-ui/react';
import { useRef, useState } from 'react';
import {
  MdDeleteOutline,
  MdOutlineDriveFileRenameOutline,
  MdOutlineFileOpen,
} from 'react-icons/md';
import {
  VscCollapseAll,
  VscCopy,
  VscFolderOpened,
  VscNewFile,
  VscNewFolder,
  VscRefresh,
} from 'react-icons/vsc';

import { FileNode, FileTree, Workspace, fs } from '@/bindings/api';
import { Tree, TreeItem, TreeRef, dialog } from '@/components';
import { Button, Heading, IconButton, Menu, Tooltip, toaster } from '@/components/ui';
import { workspaceController, workspaceManagerController } from '@/controller/workspace';
import { useEffect } from '@/hooks';
import { useWorkspaceStore } from '@/models/workspace';
import { timeUtils, utils } from '@/utils';

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
    return getTreeItems(fileTree.root.children);
  }
  return [];
};

const WorkspaceExploreer = ({ workspace }: WorkspaceExplorerProps) => {
  const [openMenu, setOpenMenu] = useState(false);
  const [openLoading, setOpenLoading] = useState(false);
  const [menuPosition, setMenuPosition] = useState({ x: 0, y: 0 });
  const [currentMenuNode, setCurrentMenuNode] = useState<FileNode>();
  const currentWorkspace = useWorkspaceStore((s) => s.currentWorkspace);
  const [treeItems, setTreeItems] = useState<ExplorerTreeItem[]>(() => []);
  const treeRef = useRef<TreeRef>(null);

  const refreshTreeData = async () => {
    const openLoadingTime = window.setTimeout(() => setOpenLoading(true), 300);
    try {
      const start = performance.now();
      const fileTree = await workspaceManagerController.getCurrentWorkspaceFileTree();
      console.log(`get file tree: ${(performance.now() - start).toFixed(2)}ms,`, fileTree);
      if (fileTree) {
        const treeData = getTreeData(fileTree);
        setTreeItems(treeData);
      }
    } catch (e) {
      console.error(e);
      toaster.error({ title: '错误', description: `获取文件树错误: ${e}` });
    }
    if (openLoadingTime) {
      window.clearTimeout(openLoadingTime);
      setOpenLoading(false);
    }
  };
  useEffect(refreshTreeData, [currentWorkspace]);

  const refreshTree = async () => {
    try {
      const openLoadingTime = window.setTimeout(() => setOpenLoading(true), 300);
      await workspaceController.reinitCurrentWorkspace();
      await refreshTreeData();
      if (openLoadingTime) {
        window.clearTimeout(openLoadingTime);
        setOpenLoading(false);
      }
    } catch (e) {
      toaster.error({ title: '错误', description: `刷新资源管理器失败: ${e}` });
    }
  };
  const openFile = (node: FileNode) => {
    if (node.fileType === 'file') {
      const path = `${workspace.metadata.path}/${node.path}`;
      toaster.success({ title: `todo open: ${path}` });
    }
  };
  const treeItemClick = (data: FileNode | undefined) => {
    if (data) {
      openFile(data);
    }
  };

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
    // console.log('openFolder:', currentMenuNode);
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
  const openFileMenuClick = async () => {
    if (currentMenuNode) {
      openFile(currentMenuNode);
    }
  };
  const newFileMenuClick = async () => {
    toaster.success({ title: 'todo' });
  };
  const newFolderMenuClick = async () => {
    toaster.success({ title: 'todo' });
  };
  const renameItemMenuClick = async () => {
    if (currentMenuNode) {
      toaster.success({ title: 'todo' });
    }
  };
  const copyPathMenuClick = async () => {
    if (currentMenuNode) {
      let path = `${workspace.metadata.path}/${currentMenuNode.path}`;
      if (utils.detectBrowserAndPlatform().platform === 'windows') {
        path = path.replace(/\//g, '\\');
      }
      navigator.clipboard.writeText(path);
      toaster.success({ title: '成功' });
    }
  };
  const deleteItemMenuClick = async () => {
    if (currentMenuNode) {
      const isFile = currentMenuNode.fileType === 'file';
      const fileName = utils.getFileName(currentMenuNode.path);
      const fileType = isFile ? '文件' : '文件夹';
      const path = `${workspace.metadata.path}/${currentMenuNode.path}`;
      dialog.showDialog({
        title: '提示',
        content: `确定要删除${fileType} ${fileName} 吗？`,
        okBtnColorPalette: 'red',
        onOk: async () => {
          try {
            await fs.delete(path, true);
            toaster.success({ title: '成功' });
          } catch (e) {
            toaster.error({ title: '错误', description: `删除失败: ${e}` });
          }
        },
      });
    }
  };
  const collapseAllFolder = () => {
    if (treeRef) {
      treeRef.current?.collapseAll();
    }
  };
  const itemTooltipPositioning = {
    placement: 'right',
  } as const;
  const menuIsFile = currentMenuNode && currentMenuNode.fileType === 'file';
  const titleIcon = { width: '4', height: '4' };
  return (
    <>
      <div className={styles.workspaceExplorer}>
        <div className={styles.workspaceExplorerTitle}>
          <div className={styles.workspaceExplorerTitleText}>{workspace.metadata.name}</div>
          <div className={styles.workspaceExplorerTitleButtons}>
            <Tooltip content="新建笔记" positioning={{ placement: 'bottom' }}>
              <IconButton size="2xs" _icon={titleIcon} variant="ghost" onClick={newFileMenuClick}>
                <VscNewFile />
              </IconButton>
            </Tooltip>
            <Tooltip content="新建文件夹" positioning={{ placement: 'bottom' }}>
              <IconButton size="2xs" _icon={titleIcon} variant="ghost" onClick={newFolderMenuClick}>
                <VscNewFolder />
              </IconButton>
            </Tooltip>
            <Tooltip content="刷新资源管理器" positioning={{ placement: 'bottom' }}>
              <IconButton size="2xs" _icon={titleIcon} variant="ghost" onClick={refreshTree}>
                <VscRefresh />
              </IconButton>
            </Tooltip>
            <Tooltip content="在资源管理器中折叠文件夹" positioning={{ placement: 'bottom' }}>
              <IconButton size="2xs" _icon={titleIcon} variant="ghost" onClick={collapseAllFolder}>
                <VscCollapseAll />
              </IconButton>
            </Tooltip>
          </div>
        </div>
        <div className={styles.workspaceExplorerTree}>
          <Tree
            ref={treeRef}
            items={treeItems}
            fixedItemHeight={30}
            itemsProps={{
              tooltip: (data) => {
                const fileNode = data.data;
                if (!fileNode) return null;
                const isDir = fileNode?.fileType === 'directory';
                const content = isDir ? (
                  `${fileNode.fileCount}个文件, ${fileNode.dirCount}个文件夹`
                ) : (
                  <>
                    {fileNode.lastModifiedTime && (
                      <div>{`最后修改: ${timeUtils.getTimeFormat(fileNode.lastModifiedTime)}`}</div>
                    )}
                    {fileNode.createTime && (
                      <div>{`创建时间: ${timeUtils.getTimeFormat(fileNode.createTime)}`}</div>
                    )}
                    {fileNode.size && (
                      <div>{`文件大小: ${utils.getFileSizeStr(fileNode.size)}`}</div>
                    )}
                  </>
                );
                return {
                  content,
                  positioning: itemTooltipPositioning,
                };
              },
              onClick(e, data) {
                treeItemClick(data.data);
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
          {menuIsFile ? (
            <>
              <Menu.Item value="open-file" onClick={openFileMenuClick}>
                <MdOutlineFileOpen />
                <Box flex="1">打开</Box>
              </Menu.Item>
            </>
          ) : (
            <>
              <Menu.Item value="new-file" onClick={newFileMenuClick}>
                <VscNewFile />
                <Box flex="1">新建笔记</Box>
              </Menu.Item>
              <Menu.Item value="new-folder" onClick={newFolderMenuClick}>
                <VscNewFolder />
                <Box flex="1">新建文件夹</Box>
              </Menu.Item>
              <Menu.Separator />
            </>
          )}

          <Menu.Item value="open-folder" onClick={openFolderClick}>
            <VscFolderOpened />
            <Box flex="1">在资源管理器中显示</Box>
          </Menu.Item>
          <Menu.Separator />

          <Menu.Item value="copy-path" onClick={copyPathMenuClick}>
            <VscCopy />
            <Box flex="1">复制路径</Box>
          </Menu.Item>
          <Menu.Separator />

          <Menu.Item value="rename-item" onClick={renameItemMenuClick}>
            <MdOutlineDriveFileRenameOutline />
            <Box flex="1">重命名</Box>
          </Menu.Item>
          <Menu.Item
            value="delete-item"
            onClick={deleteItemMenuClick}
            color="fg.error"
            _hover={{ bg: 'bg.error', color: 'fg.error' }}
          >
            <MdDeleteOutline />
            <Box flex="1">删除</Box>
          </Menu.Item>
        </Menu.Content>
      </Menu.Root>
      <Box
        visibility={openLoading ? 'visible' : 'hidden'}
        zIndex={9998}
        pos="absolute"
        inset="0"
        bg="bg/80"
        pointerEvents="auto"
      >
        <Center h="full">
          <Spinner color="teal.500" />
          <div style={{ marginLeft: '10px' }}>刷新文件树...</div>
        </Center>
      </Box>
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
