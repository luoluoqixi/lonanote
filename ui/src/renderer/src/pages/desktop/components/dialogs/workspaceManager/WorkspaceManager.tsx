import { Box, Button, Card, ContextMenu, Dialog, Text, TextField } from '@radix-ui/themes';
import { useRef, useState } from 'react';
import { IoMdMore } from 'react-icons/io';
import {
  MdDeleteOutline,
  MdDriveFileMoveOutline,
  MdOutlineDriveFileRenameOutline,
  MdOutlineFileOpen,
} from 'react-icons/md';
import { VscFolderOpened } from 'react-icons/vsc';
import { toast } from 'react-toastify';
import { create } from 'zustand';

import { WorkspaceMetadata, fs } from '@/bindings/api';
import { ContextMenuItem, dialog } from '@/components';
import { workspaceController, workspaceManagerController } from '@/controller/workspace';
import { useEffect } from '@/hooks';
import { timeUtils } from '@/utils';

import styles from './WorkspaceManager.module.scss';

export interface WorkspaceManagerProps {}

export interface WorkspaceManagerStore {
  isOpen: boolean;
  setIsOpen: (isOpen: boolean) => void;
}

export const useWorkspaceManagerState = create<WorkspaceManagerStore>((set) => ({
  isOpen: false,
  setIsOpen: (isOpen) => set({ isOpen }),
}));

const getSortWorkspace = (workspaces: WorkspaceMetadata[]) => {
  return workspaces.slice().sort((a, b) => b.lastOpenTime - a.lastOpenTime);
};

const contextMenus: ContextMenuItem[] = [
  {
    id: 'open-workspace',
    label: '打开工作区',
    icon: <MdOutlineFileOpen />,
  },
  {
    id: 'open-folder',
    label: '在资源管理器中显示',
    icon: <VscFolderOpened />,
  },
  {
    id: 'rename',
    label: '重命名工作区',
    icon: <MdOutlineDriveFileRenameOutline />,
  },
  {
    id: 'change-path',
    label: '修改路径',
    icon: <MdDriveFileMoveOutline />,
  },
  {
    id: 'remove',
    label: '移除工作区',
    icon: <MdDeleteOutline />,
    props: {
      // shortcut: '⌘ ⌫',
      color: 'red',
    },
  },
];

export const WorkspaceManager: React.FC<WorkspaceManagerProps> = () => {
  const state = useWorkspaceManagerState();
  const { currentWorkspace, workspaces: workspacesOrigin } = workspaceController.useWorkspace();
  const workspaces = getSortWorkspace(workspacesOrigin);

  const [workspacesName, setWorkspacesName] = useState(workspaces.map((v) => v.name));
  const [workspacesPath, setWorkspacesPath] = useState(workspaces.map((v) => v.rootPath));
  const [workspacesIsOpen, setWorkspacesIsOpen] = useState(workspaces.map(() => false));
  const [currentMenuIndex, setCurrentMenuIndex] = useState(-1);

  const menuRef = useRef<HTMLSpanElement>(null);

  const updateWorkspacesData = async (workspaces: WorkspaceMetadata[]) => {
    setWorkspacesName(workspaces.map((v) => v.name));
    setWorkspacesPath(workspaces.map((v) => v.rootPath));
    const opens: boolean[] = [];
    for (let i = 0; i < workspaces.length; i++) {
      const ws = workspaces[i];
      const isOpen = await workspaceManagerController.isOpenWorkspace(ws.path);
      opens.push(isOpen);
    }
    setWorkspacesIsOpen(opens);
  };
  const fetchAndUpdateWorkspaceData = async () => {
    const workspacesOrigin = await workspaceController.updateWorkspaces();
    const workspaces = getSortWorkspace(workspacesOrigin);
    updateWorkspacesData(workspaces);
  };

  useEffect(async () => {
    if (state.isOpen) {
      fetchAndUpdateWorkspaceData();
    }
  }, [state.isOpen]);

  useEffect(() => updateWorkspacesData(workspaces), [workspacesOrigin]);

  const setWorkspaceName = (index: number, val: string) => {
    const newWorkspacesName = [...workspacesName];
    if (newWorkspacesName.length > index) {
      newWorkspacesName[index] = val;
      setWorkspacesName(newWorkspacesName);
    }
  };

  const setWorkspacePath = (index: number, val: string) => {
    const newWorkspacesPath = [...workspacesPath];
    if (newWorkspacesPath.length > index) {
      newWorkspacesPath[index] = val;
      setWorkspacesPath(newWorkspacesPath);
    }
  };

  const openMenuClick = (
    index: number,
    e:
      | React.MouseEvent<HTMLDivElement, PointerEvent>
      | React.MouseEvent<HTMLButtonElement, MouseEvent>,
  ) => {
    if (menuRef.current) {
      setCurrentMenuIndex(index);
      menuRef.current.dispatchEvent(
        new MouseEvent('contextmenu', {
          bubbles: true,
          clientX: e.clientX,
          clientY: e.clientY,
        }),
      );
    }
  };

  const setWorkspaceNameCommit = async (index: number, value: string | null) => {
    if (index < 0 || workspaces.length < index) return;
    const workspace = workspaces[index];
    if (await workspaceManagerController.chanWorkspaceName(workspace, value)) {
      await fetchAndUpdateWorkspaceData();
    } else {
      setWorkspaceName(index, workspace.name);
    }
  };

  const setWorkspacePathCommit = async (index: number, value: string | null) => {
    if (index < 0 || workspaces.length < index) return;
    const workspace = workspaces[index];
    if (await workspaceManagerController.changeWorkspaceRootPath(workspace, value)) {
      await fetchAndUpdateWorkspaceData();
    } else {
      setWorkspacePath(index, workspace.rootPath);
    }
  };

  const openFolderClick = async () => {
    if (currentMenuIndex < 0 || workspaces.length < currentMenuIndex) return;
    const path = workspaces[currentMenuIndex].path;
    if (!(await workspaceManagerController.checkWorkspaceExist(path))) {
      toast.error(`文件夹不存在: ${path}`);
      return;
    }
    // console.log('showInFolder:', path);
    fs.showInFolder(path);
  };
  const renameClick = async () => {
    if (currentMenuIndex < 0 || workspaces.length < currentMenuIndex) return;
    const clickWorkspace = workspaces[currentMenuIndex];
    if (
      await workspaceManagerController.isOpenWorkspace(
        clickWorkspace.path,
        '不能重命名已打开的工作区',
      )
    ) {
      return;
    }
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
          defaultValue={clickWorkspace.name}
        />
      ),
      onOk: () => {
        if (dialogInputRef) {
          const v = dialogInputRef.value;
          if (v && v !== '') {
            setWorkspaceNameCommit(currentMenuIndex, v);
          } else {
            toast.error('请输入名字');
            return false;
          }
        }
        return true;
      },
    });
  };
  const changePathClick = async () => {
    if (currentMenuIndex < 0 || workspaces.length < currentMenuIndex) return;
    const clickWorkspace = workspaces[currentMenuIndex];
    if (
      await workspaceManagerController.isOpenWorkspace(
        clickWorkspace.path,
        '不能改变已打开工作区的路径',
      )
    ) {
      return;
    }

    const selectPath = await fs.showSelectDialog({
      title: '选择文件夹',
      type: 'openFolder',
      defaultDirectory: clickWorkspace.rootPath,
    });
    // const selectPath = await dialog.showOpenFolderDialog('选择文件夹');
    if (typeof selectPath === 'string' && selectPath !== '') {
      setWorkspacePathCommit(currentMenuIndex, selectPath);
    }
  };

  const removeWorkspaceClick = async () => {
    if (currentMenuIndex < 0 || workspaces.length < currentMenuIndex) return;
    const clickWorkspace = workspaces[currentMenuIndex];
    if (
      await workspaceManagerController.isOpenWorkspace(
        clickWorkspace.path,
        '不能移除已打开的工作区',
      )
    ) {
      return;
    }
    if (await workspaceManagerController.removeWorkspace(clickWorkspace.path)) {
      await fetchAndUpdateWorkspaceData();
    }
  };

  const openWorkspaceClick = async (index: number) => {
    if (index < 0 || workspaces.length < index) return;
    const clickWorkspace = workspaces[index];
    if (await workspaceManagerController.openWorkspace(clickWorkspace.path)) {
      state.setIsOpen(false);
    }
  };
  const onOpenWorkspace = async () => {
    if (await workspaceManagerController.selectOpenWorkspace()) {
      state.setIsOpen(false);
    }
  };
  const onMenuClick = (id: string) => {
    if (id === 'open-folder') {
      openFolderClick();
    } else if (id === 'rename') {
      renameClick();
    } else if (id === 'change-path') {
      changePathClick();
    } else if (id === 'remove') {
      removeWorkspaceClick();
    } else if (id === 'open-workspace') {
      openWorkspaceClick(currentMenuIndex);
    }
  };

  return (
    <Dialog.Root
      open={state.isOpen}
      onOpenChange={(v) => {
        if (!v) {
          state.setIsOpen(false);
        }
      }}
    >
      <Dialog.Content
        maxWidth="80vw"
        maxHeight="80vh"
        height="80vh"
        style={{
          display: 'flex',
          flexDirection: 'column',
        }}
      >
        <Dialog.Title>
          <div className={styles.workspaceManagerTitle}>
            <div>工作区</div>
            <Button style={{ marginTop: '0px' }} variant="ghost" onClick={onOpenWorkspace}>
              打开新的工作区
            </Button>
          </div>
        </Dialog.Title>
        <Dialog.Description></Dialog.Description>
        <Card
          style={{
            display: 'flex',
            padding: '10px 0px',
            flex: 1,
            backgroundColor: 'var(--gray-1)',
          }}
        >
          <div className={styles.workspaceManager}>
            {workspaces.length > 0 ? (
              <>
                {workspaces.map((val, i) => {
                  const name = workspacesName.length > i ? workspacesName[i] : '';
                  const path = workspacesPath.length > i ? workspacesPath[i] : '';
                  const lastOpenTime = timeUtils.getTimeFormat(val.lastOpenTime);
                  const isFocus = currentMenuIndex === i;
                  const isCurrentWorkspace = currentWorkspace?.metadata.path === val.path;
                  const isOpen = workspacesIsOpen.length > i ? workspacesIsOpen[i] : false;
                  return (
                    <Button
                      key={i}
                      style={{
                        padding: '10px',
                        color: 'var(--gray-12)',
                        backgroundColor: isFocus ? 'var(--accent-a3)' : undefined,
                      }}
                      variant="ghost"
                      onClick={() => {
                        openWorkspaceClick(i);
                      }}
                      asChild
                    >
                      <div
                        className={styles.workspaceRow}
                        onPointerDown={(e) => {
                          if (e.button === 2) {
                            openMenuClick(i, e);
                          }
                        }}
                      >
                        <div className={styles.workspaceRowLeft}>
                          <Text as="div" size="2" className={styles.workspaceRowLeftContent}>
                            <span>{name}</span>
                            <span>{path}</span>
                          </Text>
                          <Text as="div" size="2" className={styles.workspaceLeftTime}>
                            <div className={styles.workspaceLastOpenTime}>
                              <Text as="span" size="2">
                                {lastOpenTime}
                              </Text>
                            </div>
                            <Text as="span" size="1" style={{ color: 'var(--accent-11)' }}>
                              {isCurrentWorkspace ? '当前工作区' : isOpen ? '已打开' : undefined}
                            </Text>
                          </Text>
                        </div>
                        <div className={styles.workspaceRowRight}>
                          <Button
                            variant="ghost"
                            onClick={(e) => {
                              openMenuClick(i, e);
                              e.preventDefault();
                              e.stopPropagation();
                            }}
                          >
                            <IoMdMore />
                          </Button>
                        </div>
                      </div>
                    </Button>
                  );
                })}
                <ContextMenu.Root
                  onOpenChange={(open) => {
                    if (!open) {
                      setCurrentMenuIndex(-1);
                    }
                  }}
                >
                  <ContextMenu.Trigger ref={menuRef}>
                    <span></span>
                  </ContextMenu.Trigger>
                  <ContextMenu.Content size="2">
                    {contextMenus.map((m) =>
                      m.separator ? (
                        <ContextMenu.Separator key={m.id} />
                      ) : (
                        <ContextMenu.Item key={m.id} {...m.props} onClick={() => onMenuClick(m.id)}>
                          {m.icon} {m.label}
                        </ContextMenu.Item>
                      ),
                    )}
                  </ContextMenu.Content>
                </ContextMenu.Root>
              </>
            ) : (
              <Box style={{ padding: '10px' }}>
                <Text as="div" size="2">
                  没有任何工作区
                </Text>
              </Box>
            )}
          </div>
        </Card>
      </Dialog.Content>
    </Dialog.Root>
  );
};
