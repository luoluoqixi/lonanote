import { Button, ButtonProps, Spinner, Text, TextField, Tooltip } from '@radix-ui/themes';
import path from 'path-browserify-esm';
import { useRef, useState } from 'react';
import { BsSortUpAlt } from 'react-icons/bs';
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

import { FileNode, FileTree, FileTreeSortType, Workspace, fs } from '@/bindings/api';
import {
  ContextMenu,
  ContextMenuItem,
  Dropdown,
  Tree,
  TreeItem,
  TreeRef,
  dialog,
} from '@/components';
import { setCurrentEditFile } from '@/controller/editor';
import { workspaceController, workspaceManagerController } from '@/controller/workspace';
import { useEffect } from '@/hooks';
import { timeUtils, utils } from '@/utils';

import styles from './Explorer.module.scss';

const onOpenWorkspace = async () => {
  await workspaceManagerController.selectOpenWorkspace();
};

const sortMenu: ContextMenuItem[] = [
  {
    id: 'name',
    label: '文件名(A-Z)',
  },
  {
    id: 'nameRev',
    label: '文件名(Z-A)',
  },
  {
    id: 'sep-01',
    separator: true,
  },
  {
    id: 'lastModifiedTime',
    label: '编辑时间(从新到旧)',
  },
  {
    id: 'lastModifiedTimeRev',
    label: '编辑时间(从旧到新)',
  },
  {
    id: 'sep-02',
    separator: true,
  },
  {
    id: 'createTime',
    label: '创建时间(从新到旧)',
  },
  {
    id: 'createTimeRev',
    label: '创建时间(从旧到新)',
  },
];

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

const LoadingWorkspace = () => {
  return (
    <div className={styles.workspaceLoading}>
      <div className="spinner-wrap-class">
        <Spinner />
        <Text style={{ marginLeft: '10px' }} size="2">
          加载中...
        </Text>
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
  {
    id: 'copy-relative-path',
    label: '复制相对路径',
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
  const [treeItems, setTreeItems] = useState<ExplorerTreeItem[]>(() => []);
  const [treeFocus, setTreeFocus] = useState<boolean>(() => false);
  const [menuOpen, setMenuOpen] = useState<boolean>(() => false);
  const [selectNodes, setSelectNodes] = useState<Record<string, boolean | undefined>>(() => ({}));
  const [scrollTo, setScrollTo] = useState<string | null>(null);
  const currentWorkspace = workspaceController.useWorkspace((s) => s.currentWorkspace);
  const treeRef = useRef<TreeRef>(null);
  const menuRef = useRef<HTMLSpanElement>(null);

  const refreshTreeData = async () => {
    const openLoadingTime = window.setTimeout(() => setOpenLoading(true), 300);
    try {
      // const start = performance.now();
      const fileTree = await workspaceManagerController.getCurrentWorkspaceFileTree();
      // console.log(`init file tree: ${(performance.now() - start).toFixed(2)}ms,`, fileTree);
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

  useEffect(() => {
    if (scrollTo && treeRef.current) {
      treeRef.current.selectNode(scrollTo, true);
      setScrollTo(null);
    }
  }, [scrollTo]);

  const refreshTree = async (scrollTo?: string) => {
    try {
      const openLoadingTime = window.setTimeout(() => setOpenLoading(true), 300);
      await workspaceController.reinitCurrentWorkspace();
      await refreshTreeData();
      if (scrollTo) {
        setScrollTo(scrollTo);
      } else {
        for (const id in selectNodes) {
          if (selectNodes[id]) {
            setScrollTo(id);
            break;
          }
        }
      }
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
      setCurrentEditFile(node.path);
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
  const getFolderPath = (node?: FileNode | null) => {
    if (node) {
      if (node.fileType !== 'directory') {
        toast.error(`${node.path} 不是文件夹`);
        return null;
      }
      return node.path;
    }
    return '';
  };
  const createFileOrFolder = (folder: string, isCreateFile: boolean) => {
    const type = isCreateFile ? '文件' : '文件夹';
    let dialogInputRef: HTMLInputElement | null = null;
    const onOk = async () => {
      if (dialogInputRef) {
        const v = dialogInputRef.value;
        if (v && v !== '') {
          const targetRelativePath = folder === '' ? v : `${folder}/${v}`;
          const targetPath = path.join(workspace.metadata.path, targetRelativePath);
          if (await fs.exists(targetPath)) {
            toast.error(`已存在${type}: ${targetPath}`);
            return;
          }
          try {
            if (isCreateFile) {
              await fs.createFile(targetPath, '');
            } else {
              await fs.createDirAll(targetPath);
            }
            refreshTree(targetRelativePath);
            toast.success('成功');
          } catch (e) {
            toast.error(`创建${type}失败: ${e}`);
          }
        } else {
          toast.error('请输入名字');
        }
      }
    };
    dialog.showDialog({
      title: `创建${type} (在 ${folder === '' ? '/' : folder} 下)`,
      content: (
        <TextField.Root
          ref={(r) => {
            dialogInputRef = r;
            setTimeout(() => {
              if (r) {
                if (isCreateFile) {
                  const count = r.value.lastIndexOf('.');
                  r.setSelectionRange(0, count >= 0 ? count : r.value.length);
                } else {
                  r.setSelectionRange(0, r.value.length);
                }
                r.focus();
              }
            }, 100);
          }}
          onKeyDown={(e) => {
            if (e.key === 'Enter') {
              onOk();
              dialog.closeDialog();
            }
          }}
          autoFocus
          defaultValue={isCreateFile ? '新建笔记.md' : '新建文件夹'}
        />
      ),
      onOk,
    });
  };
  const newFileMenuClick = async (node?: FileNode | null) => {
    const folderPath = getFolderPath(node);
    if (folderPath === null) return;
    createFileOrFolder(folderPath, true);
  };
  const newFolderMenuClick = async (node?: FileNode | null) => {
    const folderPath = getFolderPath(node);
    if (folderPath === null) return;
    createFileOrFolder(folderPath, false);
  };
  const renameItemMenuClick = async () => {
    if (currentMenuNode) {
      const f = currentMenuNode.path;
      const isFile = currentMenuNode.fileType === 'file';
      const basename = path.basename(f);
      const folder = path.dirname(f);
      let dialogInputRef: HTMLInputElement | null = null;
      const onOk = async () => {
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
          } else {
            toast.error('请输入名字');
          }
        }
      };
      dialog.showDialog({
        title: '请输入新名字',
        content: (
          <TextField.Root
            ref={(r) => {
              dialogInputRef = r;
              setTimeout(() => {
                if (r) {
                  if (isFile) {
                    const count = r.value.lastIndexOf('.');
                    r.setSelectionRange(0, count >= 0 ? count : r.value.length);
                  } else {
                    r.setSelectionRange(0, r.value.length);
                  }
                  r.focus();
                }
              }, 100);
            }}
            onKeyDown={(e) => {
              if (e.key === 'Enter') {
                onOk();
                dialog.closeDialog();
              }
            }}
            autoFocus
            defaultValue={basename}
          />
        ),
        onOk,
      });
    }
  };
  const copyPathMenuClick = async (relative: boolean) => {
    let path = relative ? '' : workspace.metadata.path;
    if (currentMenuNode) {
      if (!relative) path += '/';
      path += currentMenuNode.path;
    }
    if (!relative && utils.detectBrowserAndPlatform().platform === 'windows') {
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
      newFileMenuClick(currentMenuNode);
    } else if (id === 'new-folder') {
      newFolderMenuClick(currentMenuNode);
    } else if (id === 'open-folder') {
      openFolderClick();
    } else if (id === 'copy-path') {
      copyPathMenuClick(false);
    } else if (id === 'copy-relative-path') {
      copyPathMenuClick(true);
    } else if (id === 'rename-item') {
      renameItemMenuClick();
    } else if (id === 'delete-item') {
      deleteItemMenuClick();
    }
  };
  const sortClick = async (cmd: string) => {
    await workspaceController.setCurrentWorkspaceSortType(cmd as FileTreeSortType);
  };

  return (
    <>
      <div className={styles.workspaceExplorer}>
        <div className={styles.workspaceExplorerTitle}>
          <Text as="div" size="3" className={styles.workspaceExplorerTitleText}>
            {workspace.metadata.name}
          </Text>
          <div className={styles.workspaceExplorerTitleButtons}>
            <Dropdown
              items={sortMenu}
              onMenuClick={sortClick}
              selectId={currentWorkspace?.settings.fileTreeSortType}
            >
              <Button {...toolbarBtnProps}>
                <Tooltip content="排序" side="bottom">
                  <BsSortUpAlt {...toolbarBtnIconProps} />
                </Tooltip>
              </Button>
            </Dropdown>
            <Tooltip content="新建笔记" side="bottom">
              <Button {...toolbarBtnProps} onClick={() => newFileMenuClick()}>
                <VscNewFile {...toolbarBtnIconProps} />
              </Button>
            </Tooltip>
            <Tooltip content="新建文件夹" side="bottom">
              <Button {...toolbarBtnProps} onClick={() => newFolderMenuClick()}>
                <VscNewFolder {...toolbarBtnIconProps} />
              </Button>
            </Tooltip>
            <Tooltip content="刷新资源管理器" side="bottom">
              <Button {...toolbarBtnProps} onClick={() => refreshTree()}>
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
            // 当 ContextMenu 打开时, 假装还在 Tree 的焦点
            // 这样可以知道我的 ContextMenu 究竟选中了哪个节点
            treeFocus={menuOpen || treeFocus}
            onTreeFocus={setTreeFocus}
            selectIds={selectNodes}
            onSelectIdsChange={setSelectNodes}
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
      <ContextMenu
        triggerRef={menuRef}
        onOpenChange={(open) => {
          if (!open) {
            // 关闭菜单时，延迟设置menuOpen状态
            // 避免在关闭菜单时 Tree 过快的失去又重新获取焦点
            setTimeout(() => setMenuOpen(open), 200);
          } else {
            setMenuOpen(open);
          }
        }}
        items={menus}
        onMenuClick={onMenuClick}
      />
      <div
        className="spinner-wrap-class"
        style={{
          visibility: openLoading ? 'visible' : 'hidden',
        }}
      >
        <Spinner />
        <Text style={{ marginLeft: '10px' }} size="2">
          刷新文件树...
        </Text>
      </div>
    </>
  );
};

interface ExplorerProps {}

const Explorer: React.FC<ExplorerProps> = () => {
  const currentWorkspace = workspaceController.useWorkspace((s) => s.currentWorkspace);
  const isWorkspaceLoading = workspaceController.useWorkspace((s) => s.isWorkspaceLoading);
  return (
    <div className={styles.explorer}>
      {isWorkspaceLoading ? (
        <LoadingWorkspace />
      ) : currentWorkspace == null ? (
        <NoWorkspace />
      ) : (
        <WorkspaceExploreer workspace={currentWorkspace} />
      )}
    </div>
  );
};

export default Explorer;
