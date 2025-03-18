import {
  Button,
  ButtonProps,
  ContextMenu,
  Spinner,
  Text,
  TextField,
  Tooltip,
} from '@radix-ui/themes';
import path from 'path-browserify-esm';
import { useRef, useState } from 'react';
import { IconBaseProps } from 'react-icons/lib';
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
import { toast } from 'react-toastify';

import { FileNode, FileTree, Workspace, fs } from '@/bindings/api';
import { ContextMenuItem, Tree, TreeItem, TreeRef, dialog } from '@/components';
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
      <Text as="div" size="2">
        没有打开工作区
      </Text>
      <div className={styles.handleButtonList}>
        <Button className={styles.handleButton} onClick={onOpenWorkspace}>
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

const commonContextMenus: ContextMenuItem[] = [
  {
    id: 'sep-01',
    separator: true,
  },
  {
    id: 'open-folder',
    label: '在资源管理器中显示',
    icon: <VscFolderOpened />,
  },
  {
    id: 'sep-02',
    separator: true,
  },
  {
    id: 'copy-path',
    label: '复制路径',
    icon: <VscCopy />,
  },
];
const commonNodeContextMenus: ContextMenuItem[] = [
  {
    id: 'sep-03',
    separator: true,
  },
  {
    id: 'rename-item',
    label: '重命名',
    icon: <MdOutlineDriveFileRenameOutline />,
  },
  {
    id: 'delete-item',
    label: '删除',
    icon: <MdDeleteOutline />,
    props: { color: 'red' },
  },
];
const contextMenusFile: ContextMenuItem[] = [
  {
    id: 'open-file',
    label: '打开',
    icon: <MdOutlineFileOpen />,
  },
  ...commonContextMenus,
  ...commonNodeContextMenus,
];
const contextMenusCommon: ContextMenuItem[] = [
  {
    id: 'new-file',
    label: '新建笔记',
    icon: <VscNewFile />,
  },
  {
    id: 'new-folder',
    label: '新建文件夹',
    icon: <VscNewFolder />,
  },
  ...commonContextMenus,
];

const contextMenusFolder = [...contextMenusCommon, ...commonNodeContextMenus];

const toolbarBtnProps: ButtonProps = {
  variant: 'ghost',
  style: {
    display: 'flex',
    justifyContent: 'center',
    width: '15px',
    // height: '100%',
    // padding: '0px',
  },
};

const toolbarBtnIconProps: IconBaseProps = {
  size: '20px',
};

const WorkspaceExploreer = ({ workspace }: WorkspaceExplorerProps) => {
  const [openLoading, setOpenLoading] = useState(false);
  const [currentMenuNode, setCurrentMenuNode] = useState<FileNode | null>(null);
  const currentWorkspace = useWorkspaceStore((s) => s.currentWorkspace);
  const [treeItems, setTreeItems] = useState<ExplorerTreeItem[]>(() => []);
  const treeRef = useRef<TreeRef>(null);
  const menuRef = useRef<HTMLSpanElement>(null);

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
      toast.error(`获取文件树错误: ${e}`);
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
      toast.error(`刷新资源管理器失败: ${e}`);
    }
  };
  const openFile = (node: FileNode) => {
    if (node.fileType === 'file') {
      const path = `${workspace.metadata.path}/${node.path}`;
      toast.success(`todo open: ${path}`);
    }
  };
  const treeItemClick = (data: FileNode | undefined) => {
    if (data) {
      openFile(data);
    }
  };

  const openMenuClick = (
    node: FileNode | null,
    e:
      | React.MouseEvent<HTMLDivElement, PointerEvent>
      | React.MouseEvent<HTMLButtonElement, MouseEvent>,
  ) => {
    if (menuRef.current) {
      setCurrentMenuNode(node);
      menuRef.current.dispatchEvent(
        new MouseEvent('contextmenu', {
          bubbles: true,
          clientX: e.clientX,
          clientY: e.clientY,
        }),
      );
    }
  };

  const rightTreeClick = async (e: React.PointerEvent<HTMLDivElement>) => {
    openMenuClick(null, e);
  };

  const openFolderClick = async () => {
    let path = workspace.metadata.path;
    if (currentMenuNode) path += `/${currentMenuNode.path}`;
    if (!(await fs.exists(path))) {
      toast.error(`路径不存在: ${path}`);
      return;
    }
    // console.log('showInFolder:', path);
    fs.showInFolder(path);
  };
  const openFileMenuClick = async () => {
    if (currentMenuNode) {
      openFile(currentMenuNode);
    }
  };
  const newFileMenuClick = async () => {
    toast.success('todo');
  };
  const newFolderMenuClick = async () => {
    toast.success('todo');
  };
  const renameItemMenuClick = async () => {
    if (currentMenuNode) {
      const f = currentMenuNode.path;
      const basename = path.basename(f);
      const folder = path.dirname(f);
      let dialogInputRef: HTMLInputElement | null = null;
      dialog.showDialog({
        title: '请输入新名字',
        content: (
          <TextField.Root
            ref={(r) => {
              dialogInputRef = r;
              setTimeout(() => {
                if (r) r.focus();
              }, 100);
            }}
            autoFocus
            defaultValue={basename}
          />
        ),
        onOk: async () => {
          if (dialogInputRef) {
            const v = dialogInputRef.value;
            if (v && v !== '') {
              const oldPath = path.join(workspace.metadata.path, f);
              const newPath = path.join(workspace.metadata.path, folder, v);
              try {
                await fs.move(oldPath, newPath, false);
                toast.success('成功');
                refreshTree();
              } catch (e) {
                toast.error(`重命名失败: ${e}`);
              }
              console.log(newPath);
            } else {
              toast.error('请输入名字');
            }
          }
        },
      });
    }
  };
  const copyPathMenuClick = async () => {
    let path = workspace.metadata.path;
    if (currentMenuNode) path += `/${currentMenuNode.path}`;
    if (utils.detectBrowserAndPlatform().platform === 'windows') {
      path = path.replace(/\//g, '\\');
    }
    navigator.clipboard.writeText(path);
    toast.success('成功');
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
        okBtnProps: {
          color: 'red',
        },
        onOk: async () => {
          try {
            await fs.delete(path, true);
            toast.success('成功');
            refreshTree();
          } catch (e) {
            toast.error(`删除失败: ${e}`);
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

  let menus: ContextMenuItem[];
  const menuIsFile = currentMenuNode && currentMenuNode.fileType === 'file';
  const menuIsDir = currentMenuNode && currentMenuNode.fileType === 'directory';
  if (menuIsFile) {
    menus = contextMenusFile;
  } else if (menuIsDir) {
    menus = contextMenusFolder;
  } else {
    menus = contextMenusCommon;
  }

  const onMenuClick = (id: string) => {
    if (id === 'open-file') {
      openFileMenuClick();
    } else if (id === 'new-file') {
      newFileMenuClick();
    } else if (id === 'new-folder') {
      newFolderMenuClick();
    } else if (id === 'open-folder') {
      openFolderClick();
    } else if (id === 'copy-path') {
      copyPathMenuClick();
    } else if (id === 'rename-item') {
      renameItemMenuClick();
    } else if (id === 'delete-item') {
      deleteItemMenuClick();
    }
  };

  return (
    <>
      <div className={styles.workspaceExplorer}>
        <div className={styles.workspaceExplorerTitle}>
          <Text as="div" size="3" className={styles.workspaceExplorerTitleText}>
            {workspace.metadata.name}
          </Text>
          <div className={styles.workspaceExplorerTitleButtons}>
            <Tooltip content="新建笔记" side="bottom">
              <Button {...toolbarBtnProps} onClick={newFileMenuClick}>
                <VscNewFile {...toolbarBtnIconProps} />
              </Button>
            </Tooltip>
            <Tooltip content="新建文件夹" side="bottom">
              <Button {...toolbarBtnProps} onClick={newFolderMenuClick}>
                <VscNewFolder {...toolbarBtnIconProps} />
              </Button>
            </Tooltip>
            <Tooltip content="刷新资源管理器" side="bottom">
              <Button {...toolbarBtnProps} onClick={refreshTree}>
                <VscRefresh {...toolbarBtnIconProps} />
              </Button>
            </Tooltip>
            <Tooltip content="在资源管理器中折叠文件夹" side="bottom">
              <Button {...toolbarBtnProps} onClick={collapseAllFolder}>
                <VscCollapseAll {...toolbarBtnIconProps} />
              </Button>
            </Tooltip>
          </div>
        </div>
        <div className={styles.workspaceExplorerTree}>
          <Tree
            ref={treeRef}
            items={treeItems}
            fixedItemHeight={30}
            onTreeRightDown={rightTreeClick}
            itemsProps={{
              tooltip: (data) => {
                const fileNode = data.data;
                if (!fileNode) return null;
                const isDir = fileNode?.fileType === 'directory';
                const content = isDir ? (
                  `${fileNode.fileCount}个文件, ${fileNode.dirCount}个文件夹`
                ) : (
                  <span style={{ display: 'flex', flexDirection: 'column' }}>
                    <span>{`最后修改: ${timeUtils.getTimeFormat(fileNode.lastModifiedTime)}`}</span>
                    <span>{`最后修改: ${timeUtils.getTimeFormat(fileNode.lastModifiedTime)}`}</span>
                    <span>{`创建时间: ${timeUtils.getTimeFormat(fileNode.createTime)}`}</span>
                    <span>{`文件大小: ${utils.getFileSizeStr(fileNode.size)}`}</span>
                  </span>
                );
                return {
                  content,
                  side: 'right',
                };
              },
              onItemClick(e, data) {
                treeItemClick(data.data);
              },
              onItemRightDown(e, data) {
                if (data.data) {
                  openMenuClick(data.data, e);
                  e.preventDefault();
                  e.stopPropagation();
                }
              },
            }}
          />
        </div>
      </div>
      <ContextMenu.Root>
        <ContextMenu.Trigger ref={menuRef}>
          <span></span>
        </ContextMenu.Trigger>
        <ContextMenu.Content>
          {menus.map((m) =>
            m.separator ? (
              <ContextMenu.Separator key={m.id} />
            ) : (
              <ContextMenu.Item
                key={m.id}
                onClick={() => {
                  onMenuClick(m.id);
                }}
                {...m.props}
              >
                {m.icon} {m.label}
              </ContextMenu.Item>
            ),
          )}
        </ContextMenu.Content>
      </ContextMenu.Root>
      <div
        className="spinner-wrap-class"
        style={{
          visibility: openLoading ? 'visible' : 'hidden',
        }}
      >
        <Spinner />
        <div style={{ marginLeft: '10px' }}>刷新文件树...</div>
      </div>
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
